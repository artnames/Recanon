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
import { getCanonicalUrl, hasLocalOverride } from './canonicalConfig';

// Re-export config functions for convenience
export { getCanonicalUrl, setCanonicalUrl, clearCanonicalUrl, hasLocalOverride } from './canonicalConfig';

/**
 * @deprecated Use getCanonicalUrl() instead for dynamic resolution
 * This export is kept for backwards compatibility but always returns current resolved URL
 */
export const CANONICAL_RENDERER_URL = getCanonicalUrl();

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
    /** SHA-256 hash of the raw output bytes (PNG for static, poster PNG for loop) */
    imageHash: string;
    /** Animation hash if loop=true (SHA-256 of MP4 bytes) */
    animationHash?: string;
    /** Base64 encoded output (PNG or MP4 poster frame) */
    outputBase64: string;
    /** Base64 encoded animation if loop=true */
    animationBase64?: string;
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
 * Request body for POST /verify endpoint (static mode)
 */
export interface CanonicalVerifyRequestStatic {
  snapshot: CanonicalSnapshot;
  expectedHash: string;
}

/**
 * Request body for POST /verify endpoint (loop mode)
 * Loop mode REQUIRES both hashes - never use expectedHash alone
 */
export interface CanonicalVerifyRequestLoop {
  snapshot: CanonicalSnapshot;
  expectedPosterHash: string;
  expectedAnimationHash: string;
}

/**
 * Unified verify request type
 */
export type CanonicalVerifyRequest = CanonicalVerifyRequestStatic | CanonicalVerifyRequestLoop;

/**
 * Response from POST /verify endpoint
 */
export interface CanonicalVerifyResponse {
  /** Execution mode detected */
  mode: 'static' | 'loop';
  /** Overall verification status */
  verified: boolean;
  error?: string;
  data?: {
    /** For static mode */
    originalHash?: string;
    computedHash?: string;
    /** For loop mode - poster verification */
    posterVerified?: boolean;
    expectedPosterHash?: string;
    computedPosterHash?: string;
    /** For loop mode - animation verification */
    animationVerified?: boolean;
    expectedAnimationHash?: string;
    computedAnimationHash?: string;
    /** How hashes matched */
    hashMatchType?: 'exact' | 'partial' | 'none';
    /** Standard match details */
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
    const url = getCanonicalUrl();
    const response = await fetch(`${url}/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Check health with detailed error info
 */
export async function checkCanonicalHealth(): Promise<{
  available: boolean;
  latency?: number;
  error?: string;
}> {
  const url = getCanonicalUrl();
  const start = performance.now();
  
  try {
    const response = await fetch(`${url}/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    const latency = Math.round(performance.now() - start);
    
    if (response.ok) {
      return { available: true, latency };
    } else {
      return { 
        available: false, 
        error: `HTTP ${response.status}: ${response.statusText}` 
      };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { available: false, error: message };
  }
}

/**
 * Get Canonical Renderer info
 */
export function getCanonicalRendererInfo(): {
  url: string;
  configured: boolean;
  hasOverride: boolean;
} {
  return {
    url: getCanonicalUrl(),
    configured: !!import.meta.env.VITE_CANONICAL_RENDERER_URL,
    hasOverride: hasLocalOverride(),
  };
}

/**
 * Render a certified backtest via the Canonical Renderer
 * 
 * POST /render
 */
export async function renderCertified(
  snapshot: CanonicalSnapshot
): Promise<CanonicalRenderResponse> {
  const baseUrl = getCanonicalUrl();
  const url = `${baseUrl}/render`;
  
  // Debug: Log what we're sending
  console.log('[Canonical Client] Sending render request to:', url);
  console.log('[Canonical Client] Snapshot code length:', snapshot.code?.length ?? 'undefined');
  console.log('[Canonical Client] Snapshot seed:', snapshot.seed);
  console.log('[Canonical Client] Snapshot vars:', snapshot.vars);
  console.log('[Canonical Client] Full request body:', JSON.stringify({ snapshot }, null, 2).slice(0, 500) + '...');
  
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
      console.error('[Canonical Client] Render error:', response.status, errorText);
      return {
        success: false,
        error: `Canonical Renderer error (${response.status}): ${errorText}`,
      };
    }

    const result = await response.json();
    console.log('[Canonical Client] Render success:', result.data?.artifactId);
    return result as CanonicalRenderResponse;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Canonical Client] Network error:', message);
    return {
      success: false,
      error: `Failed to connect to Canonical Renderer at ${url}: ${message}`,
    };
  }
}

/**
 * Verify a static (non-loop) certified result via the Canonical Renderer
 * 
 * POST /verify
 * Request: { snapshot, expectedHash }
 */
export async function verifyCertifiedStatic(
  snapshot: CanonicalSnapshot,
  expectedHash: string
): Promise<CanonicalVerifyResponse> {
  const baseUrl = getCanonicalUrl();
  const url = `${baseUrl}/verify`;
  
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
        mode: 'static',
        verified: false,
        error: `Canonical Renderer error (${response.status}): ${errorText}`,
      };
    }

    const result = await response.json();
    return { mode: 'static', ...result } as CanonicalVerifyResponse;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      mode: 'static',
      verified: false,
      error: `Failed to connect to Canonical Renderer at ${url}: ${message}`,
    };
  }
}

/**
 * Verify a loop certified result via the Canonical Renderer
 * 
 * Loop verification REQUIRES both poster AND animation hashes.
 * Never use expectedHash for loop mode.
 * 
 * POST /verify
 * Request: { snapshot, expectedPosterHash, expectedAnimationHash }
 */
export async function verifyCertifiedLoop(
  snapshot: CanonicalSnapshot,
  expectedPosterHash: string,
  expectedAnimationHash: string
): Promise<CanonicalVerifyResponse> {
  const baseUrl = getCanonicalUrl();
  const url = `${baseUrl}/verify`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        snapshot, 
        expectedPosterHash, 
        expectedAnimationHash 
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        mode: 'loop',
        verified: false,
        error: `Canonical Renderer error (${response.status}): ${errorText}`,
      };
    }

    const result = await response.json();
    return { mode: 'loop', ...result } as CanonicalVerifyResponse;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      mode: 'loop',
      verified: false,
      error: `Failed to connect to Canonical Renderer at ${url}: ${message}`,
    };
  }
}

/**
 * Legacy verify function - routes to static or loop based on snapshot
 * @deprecated Use verifyCertifiedStatic or verifyCertifiedLoop directly
 */
export async function verifyCertified(
  snapshot: CanonicalSnapshot,
  expectedHash: string,
  expectedAnimationHash?: string
): Promise<CanonicalVerifyResponse> {
  const isLoop = snapshot.execution?.loop === true;
  
  if (isLoop && expectedAnimationHash) {
    return verifyCertifiedLoop(snapshot, expectedHash, expectedAnimationHash);
  }
  
  return verifyCertifiedStatic(snapshot, expectedHash);
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
 * Check if a snapshot is configured for loop mode
 */
export function isLoopMode(snapshot: CanonicalSnapshot): boolean {
  return snapshot.execution?.loop === true;
}
