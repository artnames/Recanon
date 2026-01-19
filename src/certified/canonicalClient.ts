/**
 * NexArt Canonical Renderer Client
 * 
 * HTTP client for the authoritative NexArt Canonical Renderer server.
 * All certified executions MUST go through this client - no local fallbacks.
 * No browser SDK, no PRNG mirror, no mock.
 * 
 * Server repo: artnames/nexart-canonical-renderer
 * Endpoints: POST /render, POST /verify
 */

import type { CodeModeSnapshot, CodeModeVars } from './codeModeProgram';
import { varsToArray, DEFAULT_VARS, generateBacktestCodeModeProgram } from './codeModeProgram';

/**
 * Canonical Renderer URL
 * Configure via environment variable or default to localhost for development
 */
export const CANONICAL_RENDERER_URL = 
  import.meta.env.VITE_CANONICAL_RENDERER_URL || 
  'http://localhost:5000';

// ============================================================
// REQUEST/RESPONSE TYPES
// ============================================================

/**
 * Snapshot input for certified execution via Code Mode
 * Contains all data needed to deterministically render/verify
 */
export interface CanonicalSnapshot {
  /** The Code Mode program source */
  code: string;
  /** Deterministic seed controlling all randomness */
  seed: number;
  /** VAR[0] through VAR[9] parameters (0-100 range) */
  vars: number[];
  /** Optional execution settings */
  execution?: {
    frames?: number;
    loop?: boolean;
  };
  /** Optional metadata for tracking */
  metadata?: {
    strategyId?: string;
    strategyHash?: string;
    datasetId?: string;
    datasetHash?: string;
  };
}

/**
 * Response from POST /render endpoint
 */
export interface CanonicalRenderResponse {
  success: boolean;
  error?: string;
  data?: {
    /** Unique artifact identifier */
    artifactId: string;
    /** SHA-256 hash of the raw output bytes (PNG/MP4) */
    imageHash: string;
    /** Animation hash if loop=true */
    animationHash?: string;
    /** Base64 encoded output (PNG or MP4 poster frame) */
    outputBase64: string;
    /** MIME type of output */
    mimeType: 'image/png' | 'video/mp4';
    /** Node metadata */
    metadata: {
      protocol: string;
      protocolVersion: string;
      sdkVersion: string;
      nodeVersion: string;
      rendererVersion: string;
      timestamp: string;
      deterministic: boolean;
    };
    /** Computed metrics from the visualization */
    computedMetrics?: {
      totalReturn: number;
      cagr: number;
      maxDrawdown: number;
      volatility: number;
      finalEquity: number;
      sharpeEstimate: number;
    };
  };
}

/**
 * Request body for POST /verify endpoint
 */
export interface CanonicalVerifyRequest {
  snapshot: CanonicalSnapshot;
  expectedHash: string;
}

/**
 * Response from POST /verify endpoint
 */
export interface CanonicalVerifyResponse {
  verified: boolean;
  error?: string;
  data?: {
    originalHash: string;
    computedHash: string;
    matchDetails: {
      codeMatch: boolean;
      seedMatch: boolean;
      varsMatch: boolean;
      outputMatch: boolean;
    };
    timestamp: string;
    rendererVersion: string;
    nodeVersion: string;
  };
}

// ============================================================
// LEGACY TYPES (for backwards compatibility)
// ============================================================

export interface LegacyCanonicalSnapshot {
  strategyId: string;
  strategyHash: string;
  strategyCode?: string;
  datasetId: string;
  datasetHash: string;
  seed: number;
  startDate: string;
  endDate: string;
  parameters: Record<string, unknown>;
}

// ============================================================
// CLIENT FUNCTIONS
// ============================================================

/**
 * Check if the Canonical Renderer is reachable
 */
export async function isCanonicalRendererAvailable(): Promise<boolean> {
  try {
    const response = await fetch(`${CANONICAL_RENDERER_URL}/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Get Canonical Renderer info
 */
export function getCanonicalRendererInfo(): {
  url: string;
  configured: boolean;
} {
  return {
    url: CANONICAL_RENDERER_URL,
    configured: !!import.meta.env.VITE_CANONICAL_RENDERER_URL,
  };
}

/**
 * Render a certified backtest via the Canonical Renderer
 * 
 * POST ${CANONICAL_RENDERER_URL}/render
 * 
 * Request body:
 * {
 *   "snapshot": {
 *     "code": "function setup() {...} function draw() {...}",
 *     "seed": 42,
 *     "vars": [50, 55, 30, 50, 10, 50, 20, 40, 30, 70],
 *     "execution": { "frames": 1, "loop": false }
 *   }
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "artifactId": "CBT-xxx",
 *     "imageHash": "sha256:...",
 *     "outputBase64": "iVBORw0KGgo...",
 *     "mimeType": "image/png",
 *     "metadata": { protocol, protocolVersion, sdkVersion, nodeVersion, ... }
 *   }
 * }
 */
export async function renderCertified(
  snapshot: CanonicalSnapshot
): Promise<CanonicalRenderResponse> {
  const url = `${CANONICAL_RENDERER_URL}/render`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ snapshot }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `Canonical Renderer error (${response.status}): ${errorText}`,
      };
    }

    const result = await response.json();
    return result as CanonicalRenderResponse;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: `Failed to connect to Canonical Renderer at ${url}: ${message}`,
    };
  }
}

/**
 * Verify a certified result via the Canonical Renderer
 * 
 * POST ${CANONICAL_RENDERER_URL}/verify
 * 
 * Request body:
 * {
 *   "snapshot": { code, seed, vars, execution },
 *   "expectedHash": "sha256:..."
 * }
 * 
 * Response:
 * {
 *   "verified": true/false,
 *   "data": {
 *     "originalHash": "sha256:...",
 *     "computedHash": "sha256:...",
 *     "matchDetails": { codeMatch, seedMatch, varsMatch, outputMatch },
 *     "timestamp": "2024-...",
 *     "rendererVersion": "1.0.0",
 *     "nodeVersion": "20.x.x"
 *   }
 * }
 */
export async function verifyCertified(
  snapshot: CanonicalSnapshot,
  expectedHash: string
): Promise<CanonicalVerifyResponse> {
  const url = `${CANONICAL_RENDERER_URL}/verify`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ snapshot, expectedHash }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        verified: false,
        error: `Canonical Renderer error (${response.status}): ${errorText}`,
      };
    }

    const result = await response.json();
    return result as CanonicalVerifyResponse;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      verified: false,
      error: `Failed to connect to Canonical Renderer at ${url}: ${message}`,
    };
  }
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Create a Code Mode snapshot from backtest parameters
 */
export function createBacktestSnapshot(
  seed: number,
  vars?: Partial<CodeModeVars>,
  options?: { frames?: number; loop?: boolean },
  metadata?: CanonicalSnapshot['metadata']
): CanonicalSnapshot {
  const mergedVars = { ...DEFAULT_VARS, ...vars };
  
  return {
    code: generateBacktestCodeModeProgram(),
    seed,
    vars: varsToArray(mergedVars),
    execution: options,
    metadata,
  };
}

/**
 * Convert legacy snapshot format to Code Mode snapshot
 */
export function legacyToCodeModeSnapshot(
  legacy: LegacyCanonicalSnapshot
): CanonicalSnapshot {
  // Map legacy parameters to VAR array
  const params = legacy.parameters as Record<string, number>;
  
  const vars: CodeModeVars = {
    horizon: params.horizon ?? DEFAULT_VARS.horizon,
    drift: params.drift ?? DEFAULT_VARS.drift,
    volatility: params.volatility ?? DEFAULT_VARS.volatility,
    leverage: params.leverage ?? DEFAULT_VARS.leverage,
    feeSlippage: params.feeSlippage ?? DEFAULT_VARS.feeSlippage,
    rebalance: params.rebalance ?? DEFAULT_VARS.rebalance,
    shockFreq: params.shockFreq ?? DEFAULT_VARS.shockFreq,
    shockMag: params.shockMag ?? DEFAULT_VARS.shockMag,
    meanReversion: params.meanReversion ?? DEFAULT_VARS.meanReversion,
    visualDensity: params.visualDensity ?? DEFAULT_VARS.visualDensity,
  };

  return {
    code: generateBacktestCodeModeProgram(),
    seed: legacy.seed,
    vars: varsToArray(vars),
    metadata: {
      strategyId: legacy.strategyId,
      strategyHash: legacy.strategyHash,
      datasetId: legacy.datasetId,
      datasetHash: legacy.datasetHash,
    },
  };
}

/**
 * Verify from artifact bundle JSON
 * Extracts snapshot and hash from bundle and calls verify endpoint
 */
export async function verifyBundleViaCanonical(
  bundle: {
    snapshot: CanonicalSnapshot;
    verification: { imageHash: string };
  }
): Promise<CanonicalVerifyResponse> {
  return verifyCertified(bundle.snapshot, bundle.verification.imageHash);
}
