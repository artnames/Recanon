import { useState, useEffect } from "react";
import { Play, RefreshCw } from "lucide-react";
import { Button } from "./ui/button";
import { ExecutionSteps } from "./ExecutionSteps";
import { StrategyCard } from "./StrategyCard";
import { ExecutionModeToggle } from "./ExecutionModeToggle";
import type { Strategy, ExecutionStep, BacktestConfig } from "@/types/backtest";
import type { ExecutionMode } from "@/certified/engine";
import type { Dataset } from "@/types/dataset";
import { getAllDatasets } from "@/storage/datasets";

interface BacktestExecutorProps {
  strategies: Strategy[];
  onExecute: (config: BacktestConfig, mode: ExecutionMode) => void;
  isExecuting: boolean;
  executionSteps: ExecutionStep[];
}

export function BacktestExecutor({ strategies, onExecute, isExecuting, executionSteps }: BacktestExecutorProps) {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedStrategy, setSelectedStrategy] = useState<string | null>(null);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>('');
  const [seed, setSeed] = useState<number>(42);
  const [startDate, setStartDate] = useState('2020-01-01');
  const [endDate, setEndDate] = useState('2024-01-01');
  const [executionMode, setExecutionMode] = useState<ExecutionMode>('draft');

  // Load datasets from registry
  useEffect(() => {
    const loadedDatasets = getAllDatasets();
    setDatasets(loadedDatasets);
    if (loadedDatasets.length > 0 && !selectedDatasetId) {
      setSelectedDatasetId(loadedDatasets[0].id);
    }
  }, []);

  const selectedDataset = datasets.find(d => d.id === selectedDatasetId);
  const selectedStrategyInfo = strategies.find(s => s.id === selectedStrategy);

  const handleExecute = () => {
    if (!selectedStrategy || !selectedDataset) return;
    onExecute({
      strategyId: selectedStrategy,
      dataset: selectedDatasetId,
      datasetHash: selectedDataset.hash,
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
            {datasets.length === 0 ? (
              <p className="text-sm text-muted-foreground p-3 rounded-md border border-border">
                No datasets registered. Go to Datasets to register one.
              </p>
            ) : (
              datasets.map((dataset) => (
                <button
                  key={dataset.id}
                  onClick={() => setSelectedDatasetId(dataset.id)}
                  className={`w-full text-left p-3 rounded-md border transition-all ${
                    selectedDatasetId === dataset.id
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card hover:border-muted-foreground/30"
                  }`}
                >
                  <div className="font-medium text-sm">{dataset.name}</div>
                  <div className="text-xs text-hash font-mono mt-1 truncate">{dataset.hash}</div>
                </button>
              ))
            )}
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
          disabled={!selectedStrategy || !selectedDataset || isExecuting}
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
        {executionMode === 'certified' && selectedStrategy && selectedDataset && (
          <div className="p-3 rounded-md bg-muted/50 border border-border text-xs space-y-1">
            <div className="font-medium text-muted-foreground">Execution Manifest Preview</div>
            <div className="font-mono space-y-0.5 text-muted-foreground">
              <div>Strategy: <span className="text-hash">{selectedStrategyInfo?.codeHash.slice(0, 24)}...</span></div>
              <div>Dataset: <span className="text-hash">{selectedDataset.hash.slice(0, 24)}...</span></div>
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
