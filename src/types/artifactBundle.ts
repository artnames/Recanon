/**
 * Artifact Bundle Schema
 * 
 * Stable JSON schema for exported certified artifacts.
 * This format enables portable, self-describing, replayable artifacts.
 * 
 * Version: 1.0.0
 */

export const ARTIFACT_BUNDLE_VERSION = '1.0.0';

export interface ArtifactBundleStrategy {
  name: string;
  codeHash: string;
  code?: string; // Optional for v1; include if available
}

export interface ArtifactBundleDataset {
  datasetId: string;
  datasetHash: string;
  source: string; // String label describing the dataset source
}

export interface ArtifactBundleParams {
  seed: number;
  startDate: string;
  endDate: string;
  parameters: Record<string, unknown>;
}

export interface ArtifactBundleManifest {
  seed: number;
  datasetHash: string;
  strategyHash: string;
  parametersHash: string;
  startDate: string;
  endDate: string;
  timestamp: string;
}

export interface ArtifactBundleOutputs {
  equityCurve: Array<{
    date: string;
    equity: number;
    drawdown: number;
  }>;
  metrics: {
    totalReturn: number;
    annualizedReturn: number;
    sharpeRatio: number;
    maxDrawdown: number;
    winRate: number;
    profitFactor: number;
    totalTrades: number;
    averageTradeReturn: number;
  };
}

export interface ArtifactBundleVerification {
  outputHash: string;
  verificationHash: string;
}

/**
 * Complete Artifact Bundle
 * 
 * Contains everything required to replay except the runtime itself.
 * Fields are ordered consistently for deterministic serialization.
 */
export interface ArtifactBundle {
  artifactVersion: string;
  artifactId: string;
  createdAt: string;
  strategy: ArtifactBundleStrategy;
  dataset: ArtifactBundleDataset;
  params: ArtifactBundleParams;
  manifest: ArtifactBundleManifest & {
    manifestHash: string;
  };
  outputs: ArtifactBundleOutputs;
  verification: ArtifactBundleVerification;
}

/**
 * Verification result from API or CLI replay
 */
export interface VerificationApiResult {
  verified: boolean;
  artifactId: string;
  originalHash: string;
  computedHash: string;
  timestamp: string;
  mismatches?: {
    field: string;
    expected: string | number;
    actual: string | number;
  }[];
  message: string;
}
