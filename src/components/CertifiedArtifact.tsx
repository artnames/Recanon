import { ShieldCheck, Play } from "lucide-react";
import type { CertifiedArtifact as ArtifactType } from "@/types/backtest";
import { HashDisplay } from "./HashDisplay";
import { VerifiedBadge } from "./VerifiedBadge";
import { MetricCard } from "./MetricCard";
import { EquityChart } from "./EquityChart";
import { DrawdownChart } from "./DrawdownChart";
import { Button } from "./ui/button";
import { ArtifactExportMenu } from "./ArtifactExportMenu";
import type { CertifiedArtifactBundle } from "@/types/certifiedArtifact";
import { generateBacktestCodeModeProgram, DEFAULT_VARS, varsToArray } from "@/certified/codeModeProgram";
import { CANONICAL_RENDERER_URL } from "@/certified/canonicalClient";

interface CertifiedArtifactProps {
  artifact: ArtifactType;
  onReplay?: () => void;
}

// Convert legacy artifact to new bundle format for export
// Legacy artifacts are always static mode (no animation)
function convertToBundle(artifact: ArtifactType): CertifiedArtifactBundle {
  return {
    bundleVersion: '2.0.0',
    canonicalUrl: CANONICAL_RENDERER_URL,
    snapshot: {
      code: generateBacktestCodeModeProgram(),
      seed: artifact.executionSeed,
      vars: varsToArray(DEFAULT_VARS),
      metadata: {
        strategyId: artifact.strategyId,
        strategyHash: artifact.strategyHash,
        datasetId: 'dataset-001',
        datasetHash: artifact.datasetHash,
      },
    },
    expectedImageHash: artifact.verificationHash,
    verificationRequirements: 'static-single-hash',
    nodeMetadata: {
      protocol: 'nexart',
      protocolVersion: '1.2.0',
      sdkVersion: '1.6.0',
      nodeVersion: '20.x.x',
      rendererVersion: '1.0.0',
      timestamp: artifact.executedAt,
      deterministic: true,
    },
    timestamp: artifact.executedAt,
  };
}

export function CertifiedArtifact({ artifact, onReplay }: CertifiedArtifactProps) {
  const bundle = convertToBundle(artifact);

  return (
    <div className="space-y-6">
      {/* Seal Header */}
      <div className="artifact-seal">
        <div className="relative flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <ShieldCheck className="w-6 h-6 text-verified" />
              <span className="text-lg font-semibold">Certified Backtest</span>
              <VerifiedBadge status={artifact.status} />
            </div>
            <div className="text-xs text-muted-foreground mb-4">
              Executed {new Date(artifact.executedAt).toLocaleString()}
            </div>
            <div className="space-y-2">
              <HashDisplay hash={artifact.verificationHash} label="Image Hash" />
              <HashDisplay hash={artifact.strategyHash} label="Strategy" />
              <HashDisplay hash={artifact.datasetHash} label="Dataset" />
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground uppercase tracking-wider">Seed</span>
                <code className="font-mono text-hash">{artifact.executionSeed}</code>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Button variant="default" size="sm" onClick={onReplay}>
              <Play className="w-3.5 h-3.5 mr-1" />
              Replay
            </Button>
            <ArtifactExportMenu bundle={bundle} artifactId={artifact.id} variant="compact" />
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-border text-xs text-muted-foreground">
          <span className="text-verified font-medium">Immutable:</span> This result cannot be altered. 
          Anyone can independently verify by replaying with the same inputs via the Canonical Renderer.
        </div>
      </div>

      {/* Metrics Grid */}
      <div>
        <h3 className="section-header">Performance Metrics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard 
            label="Total Return" 
            value={`${artifact.metrics.totalReturn >= 0 ? '+' : ''}${artifact.metrics.totalReturn.toFixed(2)}`}
            suffix="%"
            trend={artifact.metrics.totalReturn >= 0 ? 'up' : 'down'}
          />
          <MetricCard 
            label="Sharpe Ratio" 
            value={artifact.metrics.sharpeRatio.toFixed(2)}
            trend={artifact.metrics.sharpeRatio >= 1 ? 'up' : 'neutral'}
          />
          <MetricCard 
            label="Max Drawdown" 
            value={artifact.metrics.maxDrawdown.toFixed(2)}
            suffix="%"
            trend="down"
          />
          <MetricCard 
            label="Win Rate" 
            value={artifact.metrics.winRate.toFixed(1)}
            suffix="%"
          />
        </div>
      </div>

      {/* Charts */}
      <div>
        <h3 className="section-header">Equity Curve</h3>
        <div className="p-4 rounded-md border border-border bg-card">
          <EquityChart data={artifact.equityCurve} />
        </div>
      </div>

      <div>
        <h3 className="section-header">Drawdown</h3>
        <div className="p-4 rounded-md border border-border bg-card">
          <DrawdownChart data={artifact.equityCurve} />
        </div>
      </div>

      {/* Additional Metrics */}
      <div>
        <h3 className="section-header">Trade Statistics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard 
            label="Total Trades" 
            value={artifact.metrics.totalTrades}
          />
          <MetricCard 
            label="Profit Factor" 
            value={artifact.metrics.profitFactor.toFixed(2)}
          />
          <MetricCard 
            label="Avg Trade Return" 
            value={`${artifact.metrics.averageTradeReturn >= 0 ? '+' : ''}${artifact.metrics.averageTradeReturn.toFixed(2)}`}
            suffix="%"
          />
          <MetricCard 
            label="Annualized Return" 
            value={`${artifact.metrics.annualizedReturn >= 0 ? '+' : ''}${artifact.metrics.annualizedReturn.toFixed(1)}`}
            suffix="%"
          />
        </div>
      </div>
    </div>
  );
}
