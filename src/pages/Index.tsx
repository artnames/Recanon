import { useState, useCallback } from "react";
import { Sidebar } from "@/components/Sidebar";
import { StrategiesPanel } from "@/components/StrategiesPanel";
import { BacktestExecutor } from "@/components/BacktestExecutor";
import { ArtifactsList } from "@/components/ArtifactsList";
import { CertifiedArtifact } from "@/components/CertifiedArtifact";
import { VerifyPanel } from "@/components/VerifyPanel";
import { DraftResultBanner } from "@/components/DraftResultBanner";
import { MetricCard } from "@/components/MetricCard";
import { EquityChart } from "@/components/EquityChart";
import { DrawdownChart } from "@/components/DrawdownChart";
import { mockStrategies, mockArtifacts } from "@/data/mockData";
import { 
  runCertifiedBacktest,
  runDraftBacktest,
  getCanonicalRendererInfo,
  CANONICAL_RENDERER_URL,
  type ExecutionMode, 
  type CertifiedExecutionResult,
  type DraftExecutionResult,
} from "@/certified/engine";
import type { BacktestConfig, ExecutionStep, CertifiedArtifact as ArtifactType } from "@/types/backtest";
import { XCircle, ShieldCheck, Download } from "lucide-react";
import { HashDisplay } from "@/components/HashDisplay";
import { Button } from "@/components/ui/button";
import { 
  createExportBundle, 
  downloadBundle 
} from "@/types/certifiedArtifact";

export default function Index() {
  const [activeView, setActiveView] = useState("strategies");
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionSteps, setExecutionSteps] = useState<ExecutionStep[]>([]);
  const [selectedArtifact, setSelectedArtifact] = useState<ArtifactType | null>(null);
  
  // Execution results
  const [lastExecutionMode, setLastExecutionMode] = useState<ExecutionMode | null>(null);
  const [certifiedResult, setCertifiedResult] = useState<CertifiedExecutionResult | null>(null);
  const [draftResult, setDraftResult] = useState<DraftExecutionResult | null>(null);
  const [lastConfig, setLastConfig] = useState<BacktestConfig | null>(null);
  const [executionError, setExecutionError] = useState<string | null>(null);

  const handleExecute = useCallback(async (config: BacktestConfig, mode: ExecutionMode) => {
    setIsExecuting(true);
    setLastExecutionMode(mode);
    setCertifiedResult(null);
    setDraftResult(null);
    setLastConfig(config);
    setExecutionError(null);
    
    const strategy = mockStrategies.find(s => s.id === config.strategyId);
    if (!strategy) return;

    const steps: ExecutionStep[] = mode === 'certified' 
      ? [
          { id: '1', label: 'Validating Parameters', status: 'active' },
          { id: '2', label: 'Building Code Mode Snapshot', status: 'pending' },
          { id: '3', label: 'Connecting to Canonical Renderer', status: 'pending' },
          { id: '4', label: 'Executing via Canonical Renderer', status: 'pending' },
          { id: '5', label: 'Computing Image Hash', status: 'pending' },
          { id: '6', label: 'Sealing Artifact', status: 'pending' },
        ]
      : [
          { id: '1', label: 'Loading Strategy', status: 'active' },
          { id: '2', label: 'Loading Dataset', status: 'pending' },
          { id: '3', label: 'Executing Backtest (Mock)', status: 'pending' },
          { id: '4', label: 'Computing Metrics', status: 'pending' },
        ];
    
    setExecutionSteps(steps);

    for (let i = 0; i < steps.length; i++) {
      await new Promise(resolve => setTimeout(resolve, mode === 'certified' ? 600 : 400));
      setExecutionSteps(prev => prev.map((step, idx) => {
        if (idx === i) {
          return { ...step, status: 'completed', timestamp: new Date().toLocaleTimeString() };
        }
        if (idx === i + 1) {
          return { ...step, status: 'active' };
        }
        return step;
      }));
    }

    if (mode === 'certified') {
      try {
        const result = await runCertifiedBacktest({
          seed: config.seed,
          strategyId: config.strategyId,
          strategyHash: strategy.codeHash,
          datasetId: config.dataset,
        });
        setCertifiedResult(result);
        console.log('[Canonical Renderer] Certified execution completed:', result.canonicalMetadata);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Certified execution failed:', errorMessage);
        setExecutionError(errorMessage);
      }
    } else {
      try {
        const result = await runDraftBacktest(config.seed, config.startDate, config.endDate);
        setDraftResult(result);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Draft execution failed:', errorMessage);
        setExecutionError(errorMessage);
      }
    }

    setIsExecuting(false);
  }, []);

  const handleExportBundle = () => {
    if (!certifiedResult) return;
    
    const bundle = createExportBundle(
      {
        runtime: 'nexart-canonical-renderer',
        artifactId: certifiedResult.artifactId,
        snapshot: certifiedResult.snapshot,
        imageHash: certifiedResult.imageHash,
        animationHash: certifiedResult.animationHash,
        outputBase64: certifiedResult.outputBase64,
        mimeType: certifiedResult.mimeType,
        nodeMetadata: certifiedResult.canonicalMetadata,
        metrics: certifiedResult.metrics,
        sealed: true,
        createdAt: certifiedResult.canonicalMetadata.timestamp,
      },
      CANONICAL_RENDERER_URL,
      true
    );
    downloadBundle(bundle, certifiedResult.artifactId);
  };

  const renderContent = () => {
    switch (activeView) {
      case 'strategies':
        return <StrategiesPanel strategies={mockStrategies} />;
      
      case 'execute':
        return (
          <div className="space-y-6">
            <BacktestExecutor
              strategies={mockStrategies}
              onExecute={handleExecute}
              isExecuting={isExecuting}
              executionSteps={executionSteps}
            />

            {/* Error State */}
            {executionError && !isExecuting && (
              <div className="p-4 rounded-md border border-destructive bg-destructive/10">
                <div className="flex items-start gap-3">
                  <XCircle className="h-5 w-5 text-destructive mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-destructive">Certified Execution Failed</h3>
                    <p className="text-sm text-destructive/80 mt-1">{executionError}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      No fallback to mock runtime. Certified mode requires Canonical Renderer.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Draft Results */}
            {lastExecutionMode === 'draft' && draftResult && !isExecuting && !executionError && (
              <div className="pt-6 border-t border-border space-y-6">
                <h2 className="text-xl font-semibold">Execution Results</h2>
                <DraftResultBanner />
                
                <div>
                  <h3 className="section-header">Performance Metrics (Draft)</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <MetricCard label="Total Return" value={`${draftResult.metrics.totalReturn >= 0 ? '+' : ''}${draftResult.metrics.totalReturn.toFixed(2)}`} suffix="%" />
                    <MetricCard label="Sharpe Ratio" value={draftResult.metrics.sharpeRatio.toFixed(2)} />
                    <MetricCard label="Max Drawdown" value={draftResult.metrics.maxDrawdown.toFixed(2)} suffix="%" />
                    <MetricCard label="Win Rate" value={draftResult.metrics.winRate.toFixed(1)} suffix="%" />
                  </div>
                </div>

                <div>
                  <h3 className="section-header">Equity Curve (Draft)</h3>
                  <div className="p-4 rounded-md border border-border bg-card">
                    <EquityChart data={draftResult.equityCurve} />
                  </div>
                </div>
              </div>
            )}

            {/* Certified Results */}
            {lastExecutionMode === 'certified' && certifiedResult && !isExecuting && !executionError && (
              <div className="pt-6 border-t border-border space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="w-6 h-6 text-verified" />
                    <div>
                      <h2 className="text-xl font-semibold">Certified Result</h2>
                      <p className="text-sm text-muted-foreground font-mono">{certifiedResult.artifactId}</p>
                    </div>
                  </div>
                  <Button variant="outline" onClick={handleExportBundle}>
                    <Download className="w-4 h-4 mr-2" />
                    Export Bundle
                  </Button>
                </div>

                {/* Image Output */}
                <div className="p-4 rounded-md border border-border bg-card">
                  <h3 className="section-header mb-3">Rendered Output</h3>
                  <img 
                    src={`data:${certifiedResult.mimeType};base64,${certifiedResult.outputBase64}`}
                    alt="Certified backtest visualization"
                    className="w-full rounded-md border border-border"
                  />
                </div>

                {/* Hash Display */}
                <div className="p-4 rounded-md border border-border bg-card space-y-3">
                  <h3 className="section-header">Image Hash (SHA-256)</h3>
                  <HashDisplay hash={certifiedResult.imageHash} truncate={false} />
                  <p className="text-xs text-muted-foreground">
                    This hash uniquely identifies the rendered output. Any change to inputs produces a different hash.
                  </p>
                </div>

                {/* Metrics */}
                {certifiedResult.metrics && (
                  <div>
                    <h3 className="section-header">Computed Metrics</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      <MetricCard label="Total Return" value={`${certifiedResult.metrics.totalReturn >= 0 ? '+' : ''}${(certifiedResult.metrics.totalReturn * 100).toFixed(2)}`} suffix="%" trend={certifiedResult.metrics.totalReturn >= 0 ? 'up' : 'down'} />
                      <MetricCard label="CAGR" value={`${(certifiedResult.metrics.cagr * 100).toFixed(2)}`} suffix="%" />
                      <MetricCard label="Max Drawdown" value={(certifiedResult.metrics.maxDrawdown * 100).toFixed(2)} suffix="%" trend="down" />
                      <MetricCard label="Volatility" value={(certifiedResult.metrics.volatility * 100).toFixed(2)} suffix="%" />
                      <MetricCard label="Sharpe (est)" value={certifiedResult.metrics.sharpeEstimate.toFixed(2)} />
                      <MetricCard label="Final Equity" value={`$${certifiedResult.metrics.finalEquity.toLocaleString()}`} />
                    </div>
                  </div>
                )}

                {/* Node Metadata */}
                <div className="p-4 rounded-md border border-border bg-card">
                  <h3 className="section-header mb-3">Node Metadata</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-muted-foreground">Protocol:</div>
                    <div className="font-mono">{certifiedResult.canonicalMetadata.protocol} v{certifiedResult.canonicalMetadata.protocolVersion}</div>
                    <div className="text-muted-foreground">SDK Version:</div>
                    <div className="font-mono">{certifiedResult.canonicalMetadata.sdkVersion}</div>
                    <div className="text-muted-foreground">Node Version:</div>
                    <div className="font-mono">{certifiedResult.canonicalMetadata.nodeVersion}</div>
                    <div className="text-muted-foreground">Renderer:</div>
                    <div className="font-mono">{certifiedResult.canonicalMetadata.rendererVersion}</div>
                    <div className="text-muted-foreground">Deterministic:</div>
                    <div className="text-verified font-mono">Yes</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      
      case 'artifacts':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div>
              <h2 className="text-xl font-semibold mb-4">Certified Artifacts</h2>
              <ArtifactsList artifacts={mockArtifacts} onSelect={setSelectedArtifact} selectedId={selectedArtifact?.id} />
            </div>
            <div className="lg:col-span-2">
              {selectedArtifact ? (
                <CertifiedArtifact artifact={selectedArtifact} />
              ) : (
                <div className="flex items-center justify-center h-64 text-muted-foreground">
                  <p className="text-sm">Select an artifact to view details</p>
                </div>
              )}
            </div>
          </div>
        );
      
      case 'verify':
        return <VerifyPanel />;
      
      case 'datasets':
        return (
          <div className="text-muted-foreground">
            <h2 className="text-xl font-semibold text-foreground mb-4">Datasets</h2>
            <p className="text-sm">Dataset management coming soon.</p>
          </div>
        );
      
      case 'settings':
        return (
          <div className="text-muted-foreground">
            <h2 className="text-xl font-semibold text-foreground mb-4">Settings</h2>
            <p className="text-sm">Configuration options coming soon.</p>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar activeView={activeView} onViewChange={setActiveView} />
      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-6xl mx-auto">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}
