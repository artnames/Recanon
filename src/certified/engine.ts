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
  type NormalizedRenderResult,
  type CanonicalMetadata,
} from './canonicalClient';
import { DEFAULT_VARS, type CodeModeVars } from './codeModeProgram';
import { validateNoCreateCanvas } from './codeValidator';

// Re-export for external access
export { 
  isCanonicalRendererAvailable, 
  getCanonicalRendererInfo,
  getCanonicalUrl,
  type CanonicalSnapshot,
  type CanonicalRenderResponse,
  type CanonicalVerifyResponse,
  type NormalizedRenderResult,
  type CanonicalMetadata,
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
  mode: 'static' | 'loop';
  imageHash: string;
  animationHash?: string;
  outputBase64: string;
  animationBase64?: string;
  mimeType: 'image/png' | 'video/mp4';
  sealed: boolean;
  replayCommand: string;
  // Canonical Renderer metadata
  canonicalMetadata: CanonicalMetadata & {
    rendererUrl: string;
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

  // Step 3: Preflight validation - block createCanvas() calls (ignoring comments)
  const canvasValidation = validateNoCreateCanvas(snapshot.code);
  if (!canvasValidation.valid) {
    const lineInfo = canvasValidation.lineNumber 
      ? `\n\nFound at line ${canvasValidation.lineNumber}:\n  ${canvasValidation.lineContent}`
      : '';
    
    throw new Error(
      `Found disallowed createCanvas()\n\nCanvas is provided by the Canonical Renderer (1950×2400). Remove createCanvas() and use width/height variables.${lineInfo}`
    );
  }

  // Step 4: Call Canonical Renderer (NO FALLBACK)
  const renderResult = await renderCertified(snapshot);

  if (!renderResult.success || !renderResult.data) {
    throw new Error(
      `Sealed execution blocked (Canonical Renderer error): ${renderResult.error || 'Unknown error'}`
    );
  }

  const data = renderResult.data;

  // Step 5: Return certified result with canonical metadata
  // Generate unique artifact ID from hash prefix + timestamp
  const artifactId = `SEALED-${data.imageHash.slice(0, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
  
  return {
    artifactId,
    snapshot,
    mode: data.mode,
    imageHash: data.imageHash,
    animationHash: data.animationHash,
    outputBase64: data.outputBase64,
    animationBase64: data.animationBase64,
    mimeType: data.mode === 'loop' ? 'video/mp4' : 'image/png',
    sealed: true,
    replayCommand: `curl -X POST ${getCanonicalUrl()}/verify -H "Content-Type: application/json" -d '{"snapshot": ${JSON.stringify(snapshot)}, "expectedHash": "${data.imageHash}"}'`,
    canonicalMetadata: {
      ...data.metadata,
      rendererUrl: getCanonicalUrl(),
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
): Promise<{ verified: boolean; message: string; response?: CanonicalVerifyResponse }> {
  const verifyResult = await verifyCertified(snapshot, expectedHash);

  if (verifyResult.error) {
    return {
      verified: false,
      message: `Check failed: ${verifyResult.error}`,
      response: verifyResult,
    };
  }

  return {
    verified: verifyResult.verified,
    message: verifyResult.verified
      ? 'Check passed. Execution is authentic and reproducible.'
      : 'Check failed. Hash mismatch detected.',
    response: verifyResult,
  };
}

/**
 * Type guard to check if a mode is certified.
 */
export type ExecutionMode = 'draft' | 'certified';

export function isCertifiedMode(mode: ExecutionMode): mode is 'certified' {
  return mode === 'certified';
}
