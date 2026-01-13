export interface Strategy {
  id: string;
  name: string;
  codeHash: string;
  registeredAt: string;
  locked: boolean;
  description?: string;
}

export interface BacktestConfig {
  strategyId: string;
  dataset: string;
  startDate: string;
  endDate: string;
  seed: number;
  parameters: Record<string, number | string | boolean>;
}

export interface BacktestMetrics {
  totalReturn: number;
  annualizedReturn: number;
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
  profitFactor: number;
  totalTrades: number;
  averageTradeReturn: number;
}

export interface EquityCurvePoint {
  date: string;
  equity: number;
  drawdown: number;
  benchmark?: number;
}

export interface CertifiedArtifact {
  id: string;
  strategyId: string;
  strategyHash: string;
  datasetHash: string;
  parameterHash: string;
  executionSeed: number;
  verificationHash: string;
  executedAt: string;
  metrics: BacktestMetrics;
  equityCurve: EquityCurvePoint[];
  replayInstructions: string;
  status: 'verified' | 'pending' | 'failed';
}

export interface ExecutionStep {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'completed' | 'failed';
  hash?: string;
  timestamp?: string;
}
