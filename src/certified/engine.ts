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
  getCanonicalUrl,
  createBacktestSnapshot,
  type CanonicalSnapshot,
  type CanonicalRenderResponse,
  type CanonicalVerifyResponse,
} from './canonicalClient';
import { DEFAULT_VARS, type CodeModeVars } from './codeModeProgram';

// Re-export for external access
export { 
  isCanonicalRendererAvailable, 
  getCanonicalRendererInfo,
  getCanonicalUrl,
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
  vars: number[];
  timestamp: string;
  codeHash: string;
}

export interface CertifiedExecutionParams {
  seed: number;
  vars?: Partial<CodeModeVars>;
  strategyId?: string;
  strategyHash?: string;
  datasetId?: string;
  datasetHash?: string;
}

export interface CertifiedExecutionResult {
  artifactId: string;
  snapshot: CanonicalSnapshot;
  imageHash: string;
  animationHash?: string;
  outputBase64: string;
  mimeType: 'image/png' | 'video/mp4';
  sealed: boolean;
  replayCommand: string;
  metrics?: {
    totalReturn: number;
    cagr: number;
    maxDrawdown: number;
    volatility: number;
    finalEquity: number;
    sharpeEstimate: number;
  };
  // Canonical Renderer metadata
  canonicalMetadata: {
    protocol: string;
    protocolVersion: string;
    sdkVersion: string;
    nodeVersion: string;
    rendererVersion: string;
    rendererUrl: string;
    timestamp: string;
    deterministic: boolean;
  };
}

export interface DraftExecutionResult {
  artifactId: string;
  sealed: false;
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
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validates execution parameters.
 */
export function validateParams(params: CertifiedExecutionParams): ValidationResult {
  const errors: string[] = [];

  if (!Number.isInteger(params.seed) || params.seed < 0) {
    errors.push('seed must be a non-negative integer');
  }

  if (params.vars) {
    const varsArray = Object.values(params.vars);
    for (const v of varsArray) {
      if (v !== undefined && (v < 0 || v > 100)) {
        errors.push('VAR values must be between 0 and 100');
        break;
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * CERTIFIED EXECUTION FUNCTION
 * 
 * Calls the Canonical Renderer server over HTTP.
 * NO LOCAL FALLBACK - if the renderer is unavailable, execution fails.
 * 
 * @throws Error if parameter validation fails
 * @throws Error if Canonical Renderer is unavailable
 * @throws Error if rendering fails
 */
export async function runCertifiedBacktest(
  params: CertifiedExecutionParams
): Promise<CertifiedExecutionResult> {
  // Step 1: Validate parameters
  const validation = validateParams(params);
  if (!validation.valid) {
    throw new Error(
      `Parameter validation failed:\n${validation.errors.map(e => `  - ${e}`).join('\n')}`
    );
  }

  // Step 2: Build Code Mode snapshot
  const snapshot = createBacktestSnapshot(
    params.seed,
    params.vars,
    { frames: 1, loop: false },
    {
      strategyId: params.strategyId,
      strategyHash: params.strategyHash,
      datasetId: params.datasetId,
      datasetHash: params.datasetHash,
    }
  );

  // Step 3: Preflight validation - block createCanvas() calls
  if (snapshot.code.includes('createCanvas(')) {
    throw new Error(
      'createCanvas() is not allowed in canonical execution. Canvas is fixed to 1950×2400 by the Canonical Renderer.'
    );
  }

  // Step 4: Call Canonical Renderer (NO FALLBACK)
  const renderResult = await renderCertified(snapshot);

  if (!renderResult.success || !renderResult.data) {
    throw new Error(
      `Certified execution failed (Canonical Renderer error): ${renderResult.error || 'Unknown error'}`
    );
  }

  // Step 4: Return certified result with canonical metadata
  return {
    artifactId: renderResult.data.artifactId,
    snapshot,
    imageHash: renderResult.data.imageHash,
    animationHash: renderResult.data.animationHash,
    outputBase64: renderResult.data.outputBase64,
    mimeType: renderResult.data.mimeType,
    sealed: true,
    replayCommand: `curl -X POST ${getCanonicalUrl()}/verify -H "Content-Type: application/json" -d '{"snapshot": ${JSON.stringify(snapshot)}, "expectedHash": "${renderResult.data.imageHash}"}'`,
    metrics: renderResult.data.computedMetrics,
    canonicalMetadata: {
      protocol: renderResult.data.metadata.protocol,
      protocolVersion: renderResult.data.metadata.protocolVersion,
      sdkVersion: renderResult.data.metadata.sdkVersion,
      nodeVersion: renderResult.data.metadata.nodeVersion,
      rendererVersion: renderResult.data.metadata.rendererVersion,
      rendererUrl: getCanonicalUrl(),
      timestamp: renderResult.data.metadata.timestamp,
      deterministic: renderResult.data.metadata.deterministic,
    },
  };
}

/**
 * DRAFT MODE EXECUTION (Mock Runtime)
 * 
 * Fast, editable, NOT verifiable.
 * Uses local deterministic mock data for preview purposes only.
 */
export async function runDraftBacktest(
  seed: number,
  startDate: string,
  endDate: string
): Promise<DraftExecutionResult> {
  if (!Number.isInteger(seed) || seed < 0) {
    throw new Error('seed must be a non-negative integer');
  }

  // Seeded PRNG for draft mode (Mulberry32)
  let state = seed;
  const random = () => {
    state |= 0;
    state = state + 0x6D2B79F5 | 0;
    let t = Math.imul(state ^ state >>> 15, 1 | state);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };

  // Generate equity curve
  const points: DraftExecutionResult['equityCurve'] = [];
  let equity = 100000;
  let peak = equity;

  const start = new Date(startDate);
  const end = new Date(endDate);
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

  state = seed + 1000;

  return {
    artifactId: `DRAFT-${Date.now().toString(36).toUpperCase()}`,
    sealed: false,
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
  };
}

/**
 * Verifies a certified execution result via the Canonical Renderer.
 */
export async function verifyCertifiedResult(
  snapshot: CanonicalSnapshot,
  expectedHash: string
): Promise<{ verified: boolean; message: string; details?: CanonicalVerifyResponse['data'] }> {
  const verifyResult = await verifyCertified(snapshot, expectedHash);

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
