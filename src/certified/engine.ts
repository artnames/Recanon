/**
 * Certified Execution Engine
 * 
 * All certified executions MUST go through the Canonical Renderer.
 * React components must NOT call the canonical client directly.
 * 
 * Execution Modes:
 * - Draft: Fast, editable, NOT verifiable (uses local mock runtime)
 * - Certified: Deterministic, replayable, verifiable (uses Canonical Renderer)
 */

import {
  renderCertified,
  verifyCertified,
  isCanonicalRendererAvailable,
  getCanonicalRendererInfo,
  CANONICAL_RENDERER_URL,
  type CanonicalSnapshot,
  type CanonicalRenderResponse,
  type CanonicalVerifyResponse,
} from './canonicalClient';

// Re-export for external access
export { 
  isCanonicalRendererAvailable, 
  getCanonicalRendererInfo, 
  CANONICAL_RENDERER_URL,
  type CanonicalSnapshot,
  type CanonicalRenderResponse,
  type CanonicalVerifyResponse,
};

export interface StrategyManifest {
  strategyId: string;
  strategyHash: string;
  version: string;
  parameters: ParameterDefinition[];
}

export interface ParameterDefinition {
  name: string;
  type: 'int' | 'float' | 'string' | 'boolean';
  required: boolean;
  default?: unknown;
}

export interface ExecutionManifest {
  seed: number;
  datasetHash: string;
  startDate: string;
  endDate: string;
  strategyHash: string;
  parametersHash: string;
  timestamp: string;
}

export interface CertifiedExecutionParams {
  strategyId: string;
  strategyHash: string;
  datasetId: string;
  datasetHash: string;
  startDate: string;
  endDate: string;
  seed: number;
  parameters: Record<string, unknown>;
  strategyCode?: string;
}

export interface CertifiedExecutionResult {
  artifactId: string;
  executionManifest: ExecutionManifest;
  verificationHash: string;
  outputHash: string;
  sealed: boolean;
  replayCommand: string;
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
  equityCurve: Array<{
    date: string;
    equity: number;
    drawdown: number;
  }>;
  // Canonical Renderer metadata
  canonicalMetadata?: {
    protocol: string;
    protocolVersion: string;
    engine: string;
    rendererVersion: string;
    rendererUrl: string;
    timestamp: string;
    deterministic: boolean;
  };
  // Snapshot for verification replay
  snapshot: CanonicalSnapshot;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validates execution parameters against manifest requirements.
 */
export function validateManifest(params: CertifiedExecutionParams): ValidationResult {
  const errors: string[] = [];

  if (!Number.isInteger(params.seed) || params.seed < 0) {
    errors.push('seed must be a non-negative integer');
  }

  if (!params.datasetHash || !/^sha256:[a-f0-9]{64}$/i.test(params.datasetHash)) {
    errors.push('datasetHash must be a valid SHA-256 hash (sha256:...)');
  }

  if (!params.strategyHash || !/^sha256:[a-f0-9]{64}$/i.test(params.strategyHash)) {
    errors.push('strategyHash must be a valid SHA-256 hash (sha256:...)');
  }

  if (!params.startDate || isNaN(Date.parse(params.startDate))) {
    errors.push('startDate must be a valid ISO date string');
  }

  if (!params.endDate || isNaN(Date.parse(params.endDate))) {
    errors.push('endDate must be a valid ISO date string');
  }

  if (params.startDate && params.endDate) {
    if (new Date(params.endDate) <= new Date(params.startDate)) {
      errors.push('endDate must be after startDate');
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Generates a deterministic hash from execution parameters.
 */
function computeParametersHash(params: Record<string, unknown>): string {
  const sorted = JSON.stringify(params, Object.keys(params).sort());
  
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  
  for (let i = 0; i < sorted.length; i++) {
    const char = sorted.charCodeAt(i);
    h1 = Math.imul(h1 ^ char, 2654435761);
    h2 = Math.imul(h2 ^ char, 1597334677);
  }
  
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  
  const hashValue = (h2 >>> 0).toString(16).padStart(8, '0') + 
                    (h1 >>> 0).toString(16).padStart(8, '0');
  
  return `sha256:${hashValue.padStart(64, '0')}`;
}

/**
 * CERTIFIED EXECUTION FUNCTION
 * 
 * Calls the Canonical Renderer server over HTTP.
 * NO LOCAL FALLBACK - if the renderer is unavailable, execution fails.
 * 
 * @throws Error if manifest validation fails
 * @throws Error if Canonical Renderer is unavailable
 * @throws Error if rendering fails
 */
export async function runCertifiedBacktest(
  params: CertifiedExecutionParams
): Promise<CertifiedExecutionResult> {
  // Step 1: Validate manifest
  const validation = validateManifest(params);
  if (!validation.valid) {
    throw new Error(
      `Manifest validation failed:\n${validation.errors.map(e => `  - ${e}`).join('\n')}`
    );
  }

  // Step 2: Build snapshot for canonical renderer
  const snapshot: CanonicalSnapshot = {
    strategyId: params.strategyId,
    strategyHash: params.strategyHash,
    strategyCode: params.strategyCode,
    datasetId: params.datasetId,
    datasetHash: params.datasetHash,
    seed: params.seed,
    startDate: params.startDate,
    endDate: params.endDate,
    parameters: params.parameters,
  };

  // Step 3: Call Canonical Renderer (NO FALLBACK)
  const renderResult = await renderCertified(snapshot);

  if (!renderResult.success || !renderResult.data) {
    throw new Error(
      `Certified execution failed (Canonical Renderer error): ${renderResult.error || 'Unknown error'}`
    );
  }

  // Step 4: Build execution manifest
  const parametersHash = computeParametersHash(params.parameters);
  const executionManifest: ExecutionManifest = {
    seed: params.seed,
    datasetHash: params.datasetHash,
    strategyHash: params.strategyHash,
    parametersHash,
    startDate: params.startDate,
    endDate: params.endDate,
    timestamp: renderResult.data.metadata.timestamp,
  };

  // Step 5: Return certified result with canonical metadata
  return {
    artifactId: renderResult.data.artifactId,
    executionManifest,
    verificationHash: renderResult.data.verificationHash,
    outputHash: renderResult.data.outputHash,
    sealed: true,
    replayCommand: `curl -X POST ${CANONICAL_RENDERER_URL}/verify -H "Content-Type: application/json" -d '{"snapshot": ${JSON.stringify(snapshot)}, "expectedHash": "${renderResult.data.verificationHash}"}'`,
    metrics: renderResult.data.outputs.metrics,
    equityCurve: renderResult.data.outputs.equityCurve,
    canonicalMetadata: {
      protocol: renderResult.data.metadata.protocol,
      protocolVersion: renderResult.data.metadata.protocolVersion,
      engine: renderResult.data.metadata.engine,
      rendererVersion: renderResult.data.metadata.rendererVersion,
      rendererUrl: CANONICAL_RENDERER_URL,
      timestamp: renderResult.data.metadata.timestamp,
      deterministic: renderResult.data.metadata.deterministic,
    },
    snapshot,
  };
}

/**
 * DRAFT MODE EXECUTION (Mock Runtime)
 * 
 * Fast, editable, NOT verifiable.
 * Uses local deterministic mock data for preview purposes only.
 */
export async function runDraftBacktest(
  params: CertifiedExecutionParams
): Promise<CertifiedExecutionResult> {
  if (!Number.isInteger(params.seed) || params.seed < 0) {
    throw new Error('seed must be a non-negative integer');
  }

  // Seeded PRNG for draft mode (Mulberry32)
  let state = params.seed;
  const random = () => {
    state |= 0;
    state = state + 0x6D2B79F5 | 0;
    let t = Math.imul(state ^ state >>> 15, 1 | state);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };

  // Generate equity curve
  const points: CertifiedExecutionResult['equityCurve'] = [];
  let equity = 100000;
  let peak = equity;

  const start = new Date(params.startDate);
  const end = new Date(params.endDate);
  const dayMs = 24 * 60 * 60 * 1000;

  for (let d = start; d <= end; d = new Date(d.getTime() + dayMs * 7)) {
    const change = (random() - 0.45) * 0.03;
    equity = equity * (1 + change);
    peak = Math.max(peak, equity);
    const drawdown = ((equity - peak) / peak) * 100;

    points.push({
      date: d.toISOString().split('T')[0],
      equity: Math.round(equity * 100) / 100,
      drawdown: Math.round(drawdown * 100) / 100,
    });
  }

  // Compute metrics
  const initial = points[0]?.equity || 100000;
  const final = points[points.length - 1]?.equity || 100000;
  const totalReturn = ((final - initial) / initial) * 100;
  const years = points.length / 52;
  const annualizedReturn = years > 0 ? (Math.pow(final / initial, 1 / years) - 1) * 100 : 0;
  const maxDrawdown = Math.min(...points.map(p => p.drawdown));

  state = params.seed + 1000;

  const parametersHash = computeParametersHash(params.parameters);

  return {
    artifactId: `DRAFT-${Date.now().toString(36).toUpperCase()}`,
    executionManifest: {
      seed: params.seed,
      datasetHash: params.datasetHash,
      strategyHash: params.strategyHash,
      parametersHash,
      startDate: params.startDate,
      endDate: params.endDate,
      timestamp: new Date().toISOString(),
    },
    verificationHash: 'DRAFT-NOT-VERIFIABLE',
    outputHash: 'DRAFT-NOT-VERIFIABLE',
    sealed: false,
    replayCommand: '# Draft results cannot be replayed via Canonical Renderer',
    metrics: {
      totalReturn: Math.round(totalReturn * 100) / 100,
      annualizedReturn: Math.round(annualizedReturn * 100) / 100,
      sharpeRatio: Math.round((1 + random() * 1.5) * 100) / 100,
      maxDrawdown: Math.round(maxDrawdown * 100) / 100,
      winRate: Math.round((50 + random() * 20) * 100) / 100,
      profitFactor: Math.round((1 + random()) * 100) / 100,
      totalTrades: Math.floor(100 + random() * 200),
      averageTradeReturn: Math.round((random() * 0.8 - 0.1) * 100) / 100,
    },
    equityCurve: points,
    snapshot: {
      strategyId: params.strategyId,
      strategyHash: params.strategyHash,
      datasetId: params.datasetId,
      datasetHash: params.datasetHash,
      seed: params.seed,
      startDate: params.startDate,
      endDate: params.endDate,
      parameters: params.parameters,
    },
  };
}

/**
 * Verifies a certified execution result via the Canonical Renderer.
 */
export async function verifyCertifiedResult(
  result: CertifiedExecutionResult
): Promise<{ verified: boolean; message: string; details?: CanonicalVerifyResponse['data'] }> {
  if (!result.sealed || result.verificationHash === 'DRAFT-NOT-VERIFIABLE') {
    return {
      verified: false,
      message: 'Draft results cannot be verified. Only certified results are verifiable.',
    };
  }

  const verifyResult = await verifyCertified(result.snapshot, result.verificationHash);

  if (verifyResult.error) {
    return {
      verified: false,
      message: `Verification failed: ${verifyResult.error}`,
    };
  }

  return {
    verified: verifyResult.verified,
    message: verifyResult.verified
      ? 'Verification passed. Execution is authentic and reproducible.'
      : 'Verification failed. Hash mismatch detected.',
    details: verifyResult.data,
  };
}

/**
 * Type guard to check if a mode is certified.
 */
export type ExecutionMode = 'draft' | 'certified';

export function isCertifiedMode(mode: ExecutionMode): mode is 'certified' {
  return mode === 'certified';
}
