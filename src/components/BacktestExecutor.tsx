import { useState } from "react";
import { Play, RefreshCw } from "lucide-react";
import { Button } from "./ui/button";
import { ExecutionSteps } from "./ExecutionSteps";
import { StrategyCard } from "./StrategyCard";
import { ExecutionModeToggle } from "./ExecutionModeToggle";
import type { Strategy, ExecutionStep, BacktestConfig } from "@/types/backtest";
import type { ExecutionMode } from "@/certified/engine";

interface BacktestExecutorProps {
  strategies: Strategy[];
  onExecute: (config: BacktestConfig, mode: ExecutionMode) => void;
  isExecuting: boolean;
  executionSteps: ExecutionStep[];
}

const DATASETS = [
  { id: 'sp500-2020-2024', label: 'S&P 500 (2020-2024)', hash: 'sha256:a7c9e3f2d8b4a1e6c5f9d2b8a3e7f4c1d9b5a2e8f6c3d7b1a4e9f5c2d8b3a6e7' },
  { id: 'nasdaq-2018-2024', label: 'NASDAQ 100 (2018-2024)', hash: 'sha256:f2b8c4d1e9a7f5c3d8b2a6e1f4c9d5b7a3e8f2c6d1b9a4e7f3c8d2b5a1e6f9c4' },
  { id: 'btc-2019-2024', label: 'BTC/USD (2019-2024)', hash: 'sha256:c5d9a2e7f1b4c8d3a6e9f2b5c1d7a4e8f3b6c9d2a5e1f4b7c3d8a2e6f1b9c4d5' },
];

export function BacktestExecutor({ strategies, onExecute, isExecuting, executionSteps }: BacktestExecutorProps) {
  const [selectedStrategy, setSelectedStrategy] = useState<string | null>(null);
  const [selectedDataset, setSelectedDataset] = useState<string>(DATASETS[0].id);
  const [seed, setSeed] = useState<number>(42);
  const [startDate, setStartDate] = useState('2020-01-01');
  const [endDate, setEndDate] = useState('2024-01-01');
  const [executionMode, setExecutionMode] = useState<ExecutionMode>('draft');

  const selectedDatasetInfo = DATASETS.find(d => d.id === selectedDataset);
  const selectedStrategyInfo = strategies.find(s => s.id === selectedStrategy);

  const handleExecute = () => {
    if (!selectedStrategy) return;
    onExecute({
      strategyId: selectedStrategy,
      dataset: selectedDataset,
      startDate,
      endDate,
      seed,
      parameters: {}
    }, executionMode);
  };

  const generateSeed = () => {
    setSeed(Math.floor(Math.random() * 1000000));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Configuration Panel */}
      <div className="space-y-6">
        {/* Execution Mode Toggle */}
        <ExecutionModeToggle
          mode={executionMode}
          onModeChange={setExecutionMode}
          disabled={isExecuting}
        />

        {/* Strategy Selection */}
        <div>
          <h3 className="section-header">Select Strategy</h3>
          <div className="space-y-2">
            {strategies.map((strategy) => (
              <StrategyCard
                key={strategy.id}
                strategy={strategy}
                selected={selectedStrategy === strategy.id}
                onSelect={() => setSelectedStrategy(strategy.id)}
              />
            ))}
          </div>
        </div>

        {/* Dataset Selection */}
        <div>
          <h3 className="section-header">Dataset</h3>
          <div className="space-y-2">
            {DATASETS.map((dataset) => (
              <button
                key={dataset.id}
                onClick={() => setSelectedDataset(dataset.id)}
                className={`w-full text-left p-3 rounded-md border transition-all ${
                  selectedDataset === dataset.id
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card hover:border-muted-foreground/30"
                }`}
              >
                <div className="font-medium text-sm">{dataset.label}</div>
                <div className="text-xs text-hash font-mono mt-1 truncate">{dataset.hash}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Time Range */}
        <div>
          <h3 className="section-header">Time Range</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-md bg-input border border-border text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-md bg-input border border-border text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
        </div>

        {/* Execution Seed */}
        <div>
          <h3 className="section-header">Execution Seed</h3>
          <div className="flex gap-2">
            <input
              type="number"
              value={seed}
              onChange={(e) => setSeed(parseInt(e.target.value) || 0)}
              className="flex-1 px-3 py-2 rounded-md bg-input border border-border text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <Button variant="outline" size="default" onClick={generateSeed}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {executionMode === 'certified' 
              ? "Required for deterministic, reproducible execution"
              : "Seed is optional in Draft mode"
            }
          </p>
        </div>

        {/* Execute Button */}
        <Button
          variant={executionMode === 'certified' ? 'execute' : 'secondary'}
          size="lg"
          className="w-full"
          disabled={!selectedStrategy || isExecuting}
          onClick={handleExecute}
        >
          <Play className="w-4 h-4" />
          {isExecuting 
            ? "Executing..." 
            : executionMode === 'certified'
              ? "Execute Certified Backtest"
              : "Execute Draft"
          }
        </Button>

        {/* Execution Summary for Certified Mode */}
        {executionMode === 'certified' && selectedStrategy && selectedDatasetInfo && (
          <div className="p-3 rounded-md bg-muted/50 border border-border text-xs space-y-1">
            <div className="font-medium text-muted-foreground">Execution Manifest Preview</div>
            <div className="font-mono space-y-0.5 text-muted-foreground">
              <div>Strategy: <span className="text-hash">{selectedStrategyInfo?.codeHash.slice(0, 24)}...</span></div>
              <div>Dataset: <span className="text-hash">{selectedDatasetInfo.hash.slice(0, 24)}...</span></div>
              <div>Seed: <span className="text-hash">{seed}</span></div>
              <div>Range: <span className="text-hash">{startDate} → {endDate}</span></div>
            </div>
          </div>
        )}
      </div>

      {/* Execution Progress */}
      <div>
        <h3 className="section-header">Execution Progress</h3>
        <div className="p-4 rounded-md border border-border bg-card">
          {executionSteps.length > 0 ? (
            <ExecutionSteps steps={executionSteps} />
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Play className="w-8 h-8 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Configure and execute a backtest to see progress</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
