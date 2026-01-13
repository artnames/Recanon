import { useState, useCallback } from "react";
import { Sidebar } from "@/components/Sidebar";
import { StrategiesPanel } from "@/components/StrategiesPanel";
import { BacktestExecutor } from "@/components/BacktestExecutor";
import { ArtifactsList } from "@/components/ArtifactsList";
import { CertifiedArtifact } from "@/components/CertifiedArtifact";
import { VerifyPanel } from "@/components/VerifyPanel";
import { DraftResultBanner } from "@/components/DraftResultBanner";
import { CertifiedResultHeader } from "@/components/CertifiedResultHeader";
import { MetricCard } from "@/components/MetricCard";
import { EquityChart } from "@/components/EquityChart";
import { DrawdownChart } from "@/components/DrawdownChart";
import { mockStrategies, mockArtifacts } from "@/data/mockData";
import { 
  runCertifiedBacktest, 
  type ExecutionMode, 
  type CertifiedExecutionResult 
} from "@/certified/engine";
import type { BacktestConfig, ExecutionStep, CertifiedArtifact as ArtifactType } from "@/types/backtest";

const DATASET_HASHES: Record<string, string> = {
  'sp500-2020-2024': 'sha256:a7c9e3f2d8b4a1e6c5f9d2b8a3e7f4c1d9b5a2e8f6c3d7b1a4e9f5c2d8b3a6e7',
  'nasdaq-2018-2024': 'sha256:f2b8c4d1e9a7f5c3d8b2a6e1f4c9d5b7a3e8f2c6d1b9a4e7f3c8d2b5a1e6f9c4',
  'btc-2019-2024': 'sha256:c5d9a2e7f1b4c8d3a6e9f2b5c1d7a4e8f3b6c9d2a5e1f4b7c3d8a2e6f1b9c4d5',
};

export default function Index() {
  const [activeView, setActiveView] = useState("strategies");
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionSteps, setExecutionSteps] = useState<ExecutionStep[]>([]);
  const [selectedArtifact, setSelectedArtifact] = useState<ArtifactType | null>(null);
  
  // Execution results
  const [lastExecutionMode, setLastExecutionMode] = useState<ExecutionMode | null>(null);
  const [certifiedResult, setCertifiedResult] = useState<CertifiedExecutionResult | null>(null);
  const [draftResult, setDraftResult] = useState<{
    metrics: ArtifactType['metrics'];
    equityCurve: ArtifactType['equityCurve'];
  } | null>(null);

  const handleExecute = useCallback(async (config: BacktestConfig, mode: ExecutionMode) => {
    setIsExecuting(true);
    setLastExecutionMode(mode);
    setCertifiedResult(null);
    setDraftResult(null);
    
    const strategy = mockStrategies.find(s => s.id === config.strategyId);
    if (!strategy) return;

    const steps: ExecutionStep[] = mode === 'certified' 
      ? [
          { id: '1', label: 'Validating Manifest', status: 'active' },
          { id: '2', label: 'Loading Strategy', status: 'pending' },
          { id: '3', label: 'Loading Dataset', status: 'pending' },
          { id: '4', label: 'Initializing NexArt Engine', status: 'pending' },
          { id: '5', label: 'Executing Deterministic Backtest', status: 'pending' },
          { id: '6', label: 'Computing Metrics', status: 'pending' },
          { id: '7', label: 'Generating Verification Hash', status: 'pending' },
          { id: '8', label: 'Sealing Artifact', status: 'pending' },
        ]
      : [
          { id: '1', label: 'Loading Strategy', status: 'active' },
          { id: '2', label: 'Loading Dataset', status: 'pending' },
          { id: '3', label: 'Executing Backtest', status: 'pending' },
          { id: '4', label: 'Computing Metrics', status: 'pending' },
        ];
    
    setExecutionSteps(steps);

    // Simulate execution steps
    for (let i = 0; i < steps.length; i++) {
      await new Promise(resolve => setTimeout(resolve, mode === 'certified' ? 600 : 400));
      setExecutionSteps(prev => prev.map((step, idx) => {
        if (idx === i) {
          return { 
            ...step, 
            status: 'completed', 
            timestamp: new Date().toLocaleTimeString(),
            hash: mode === 'certified' && idx >= 4 
              ? `sha256:${Math.random().toString(36).substring(2, 18)}...` 
              : undefined
          };
        }
        if (idx === i + 1) {
          return { ...step, status: 'active' };
        }
        return step;
      }));
    }

    if (mode === 'certified') {
      // Use the certified engine
      try {
        const result = await runCertifiedBacktest({
          strategyId: config.strategyId,
          strategyHash: strategy.codeHash,
          datasetId: config.dataset,
          datasetHash: DATASET_HASHES[config.dataset] || DATASET_HASHES['sp500-2020-2024'],
          startDate: config.startDate,
          endDate: config.endDate,
          seed: config.seed,
          parameters: config.parameters
        });
        setCertifiedResult(result);
      } catch (error) {
        console.error('Certified execution failed:', error);
      }
    } else {
      // Draft mode - simple mock result
      setDraftResult({
        metrics: {
          totalReturn: Math.random() * 60 - 10,
          annualizedReturn: Math.random() * 20,
          sharpeRatio: 0.5 + Math.random() * 1.5,
          maxDrawdown: -(5 + Math.random() * 20),
          winRate: 45 + Math.random() * 15,
          profitFactor: 1 + Math.random(),
          totalTrades: Math.floor(100 + Math.random() * 200),
          averageTradeReturn: (Math.random() - 0.3) * 0.5
        },
        equityCurve: generateMockEquityCurve(config.startDate, config.endDate)
      });
    }

    setIsExecuting(false);
  }, []);

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

            {/* Results Section */}
            {(certifiedResult || draftResult) && !isExecuting && (
              <div className="pt-6 border-t border-border space-y-6">
                <h2 className="text-xl font-semibold">Execution Results</h2>
                
                {lastExecutionMode === 'draft' && draftResult && (
                  <>
                    <DraftResultBanner />
                    
                    {/* Draft Metrics */}
                    <div>
                      <h3 className="section-header">Performance Metrics (Draft)</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <MetricCard 
                          label="Total Return" 
                          value={`${draftResult.metrics.totalReturn >= 0 ? '+' : ''}${draftResult.metrics.totalReturn.toFixed(2)}`}
                          suffix="%"
                        />
                        <MetricCard 
                          label="Sharpe Ratio" 
                          value={draftResult.metrics.sharpeRatio.toFixed(2)}
                        />
                        <MetricCard 
                          label="Max Drawdown" 
                          value={draftResult.metrics.maxDrawdown.toFixed(2)}
                          suffix="%"
                        />
                        <MetricCard 
                          label="Win Rate" 
                          value={draftResult.metrics.winRate.toFixed(1)}
                          suffix="%"
                        />
                      </div>
                    </div>

                    {/* Draft Charts */}
                    <div>
                      <h3 className="section-header">Equity Curve (Draft)</h3>
                      <div className="p-4 rounded-md border border-border bg-card">
                        <EquityChart data={draftResult.equityCurve} />
                      </div>
                    </div>
                  </>
                )}

                {lastExecutionMode === 'certified' && certifiedResult && (
                  <>
                    <CertifiedResultHeader result={certifiedResult} />
                    
                    {/* Certified Metrics */}
                    <div>
                      <h3 className="section-header">Performance Metrics</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <MetricCard 
                          label="Total Return" 
                          value={`${certifiedResult.metrics.totalReturn >= 0 ? '+' : ''}${certifiedResult.metrics.totalReturn.toFixed(2)}`}
                          suffix="%"
                          trend={certifiedResult.metrics.totalReturn >= 0 ? 'up' : 'down'}
                        />
                        <MetricCard 
                          label="Sharpe Ratio" 
                          value={certifiedResult.metrics.sharpeRatio.toFixed(2)}
                          trend={certifiedResult.metrics.sharpeRatio >= 1 ? 'up' : 'neutral'}
                        />
                        <MetricCard 
                          label="Max Drawdown" 
                          value={certifiedResult.metrics.maxDrawdown.toFixed(2)}
                          suffix="%"
                          trend="down"
                        />
                        <MetricCard 
                          label="Win Rate" 
                          value={certifiedResult.metrics.winRate.toFixed(1)}
                          suffix="%"
                        />
                      </div>
                    </div>

                    {/* Certified Charts */}
                    <div>
                      <h3 className="section-header">Equity Curve</h3>
                      <div className="p-4 rounded-md border border-border bg-card">
                        <EquityChart data={certifiedResult.equityCurve} />
                      </div>
                    </div>

                    <div>
                      <h3 className="section-header">Drawdown</h3>
                      <div className="p-4 rounded-md border border-border bg-card">
                        <DrawdownChart data={certifiedResult.equityCurve} />
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        );
      
      case 'artifacts':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div>
              <h2 className="text-xl font-semibold mb-4">Certified Artifacts</h2>
              <ArtifactsList
                artifacts={mockArtifacts}
                onSelect={setSelectedArtifact}
                selectedId={selectedArtifact?.id}
              />
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

// Helper function for draft mode
function generateMockEquityCurve(startDate: string, endDate: string) {
  const points: Array<{ date: string; equity: number; drawdown: number }> = [];
  let equity = 100000;
  let peak = equity;
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  const dayMs = 24 * 60 * 60 * 1000;
  
  for (let d = start; d <= end; d = new Date(d.getTime() + dayMs * 7)) {
    const change = (Math.random() - 0.45) * 0.03;
    equity = equity * (1 + change);
    peak = Math.max(peak, equity);
    const drawdown = ((equity - peak) / peak) * 100;
    
    points.push({
      date: d.toISOString().split('T')[0],
      equity: Math.round(equity),
      drawdown: Math.round(drawdown * 100) / 100
    });
  }
  
  return points;
}
