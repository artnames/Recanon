import type { Strategy, CertifiedArtifact, EquityCurvePoint } from "@/types/backtest";

export const mockStrategies: Strategy[] = [
  {
    id: "strat-001",
    name: "Momentum Crossover",
    codeHash: "sha256:a7c9e3f2d8b4a1e6c5f9d2b8a3e7f4c1d9b5a2e8f6c3d7b1a4e9f5c2d8b3a6e7",
    registeredAt: "2024-01-15T10:30:00Z",
    locked: true,
    description: "Dual EMA crossover with momentum confirmation"
  },
  {
    id: "strat-002",
    name: "Mean Reversion RSI",
    codeHash: "sha256:f2b8c4d1e9a7f5c3d8b2a6e1f4c9d5b7a3e8f2c6d1b9a4e7f3c8d2b5a1e6f9c4",
    registeredAt: "2024-02-20T14:15:00Z",
    locked: true,
    description: "RSI-based mean reversion with dynamic bands"
  },
  {
    id: "strat-003",
    name: "Volatility Breakout",
    codeHash: "sha256:c5d9a2e7f1b4c8d3a6e9f2b5c1d7a4e8f3b6c9d2a5e1f4b7c3d8a2e6f1b9c4d5",
    registeredAt: "2024-03-10T09:45:00Z",
    locked: true,
    description: "ATR-based breakout with trailing stops"
  }
];

// Generate realistic equity curve data
function generateEquityCurve(startDate: string, endDate: string): EquityCurvePoint[] {
  const points: EquityCurvePoint[] = [];
  let equity = 100000;
  let peak = equity;
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  const dayMs = 24 * 60 * 60 * 1000;
  
  for (let d = start; d <= end; d = new Date(d.getTime() + dayMs * 7)) {
    // Random walk with slight upward bias
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

export const mockArtifact: CertifiedArtifact = {
  id: "CBT-2024-001",
  strategyId: "strat-001",
  strategyHash: "sha256:a7c9e3f2d8b4a1e6c5f9d2b8a3e7f4c1d9b5a2e8f6c3d7b1a4e9f5c2d8b3a6e7",
  datasetHash: "sha256:d8b4a1e6c5f9d2b8a3e7f4c1a7c9e3f2d9b5a2e8f6c3d7b1a4e9f5c2d8b3a6e7",
  parameterHash: "sha256:e6c5f9d2b8a3e7f4c1d8b4a1a7c9e3f2d9b5a2e8f6c3d7b1a4e9f5c2d8b3a6e7",
  executionSeed: 42,
  verificationHash: "sha256:f9d2b8a3e7f4c1d8b4a1e6c5a7c9e3f2d9b5a2e8f6c3d7b1a4e9f5c2d8b3a6e7",
  executedAt: "2024-03-15T16:42:33Z",
  metrics: {
    totalReturn: 47.32,
    annualizedReturn: 12.8,
    sharpeRatio: 1.47,
    maxDrawdown: -15.23,
    winRate: 58.4,
    profitFactor: 1.82,
    totalTrades: 156,
    averageTradeReturn: 0.31
  },
  equityCurve: generateEquityCurve("2020-01-01", "2024-01-01"),
  replayInstructions: "nexart replay --artifact CBT-2024-001 --verify",
  status: "verified"
};

export const mockArtifacts: CertifiedArtifact[] = [
  mockArtifact,
  {
    ...mockArtifact,
    id: "CBT-2024-002",
    strategyId: "strat-002",
    executedAt: "2024-03-14T11:20:15Z",
    verificationHash: "sha256:b8a3e7f4c1d8b4a1e6c5f9d2a7c9e3f2d9b5a2e8f6c3d7b1a4e9f5c2d8b3a6e7",
    metrics: {
      ...mockArtifact.metrics,
      totalReturn: 31.15,
      sharpeRatio: 1.23,
      maxDrawdown: -12.41
    }
  },
  {
    ...mockArtifact,
    id: "CBT-2024-003",
    strategyId: "strat-003",
    executedAt: "2024-03-13T09:15:42Z",
    verificationHash: "sha256:e7f4c1d8b4a1e6c5f9d2b8a3a7c9e3f2d9b5a2e8f6c3d7b1a4e9f5c2d8b3a6e7",
    metrics: {
      ...mockArtifact.metrics,
      totalReturn: 62.87,
      sharpeRatio: 1.71,
      maxDrawdown: -18.56
    }
  }
];
