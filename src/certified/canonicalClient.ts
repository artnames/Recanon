/**
 * NexArt Canonical Renderer Client
 * 
 * HTTP client for the Canonical Renderer via secure proxy.
 * All requests go through the edge function proxy - the browser NEVER calls the renderer directly.
 * The renderer URL is kept secret on the server side.
 * 
 * Proxy endpoints:
 *   GET  /api/canonical/health  -> /health
 *   POST /api/canonical/render  -> /render  
 *   POST /api/canonical/verify  -> /verify
 */

import type { CodeModeSnapshot, CodeModeVars } from './codeModeProgram';
import { varsToArray, DEFAULT_VARS, generateBacktestCodeModeProgram } from './codeModeProgram';
import { getProxyUrl, isProxyConfigured } from './canonicalConfig';

// Re-export config functions for convenience
export { getProxyUrl, isProxyConfigured } from './canonicalConfig';

// Legacy exports for backwards compatibility (now deprecated)
export { getCanonicalUrl, setCanonicalUrl, clearCanonicalUrl, hasLocalOverride } from './canonicalConfig';

/**
 * @deprecated Use getProxyUrl() instead
 */
export const CANONICAL_RENDERER_URL = getProxyUrl();

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
 * Metadata returned from the Canonical Renderer
 */
export interface CanonicalMetadata {
  protocol?: string;
  protocolVersion?: string;
  sdkVersion?: string;
  nodeVersion?: string;
  rendererVersion?: string;
  timestamp?: string;
  deterministic?: boolean;
}

/**
 * Raw response from POST /render endpoint (static mode)
 * The renderer returns flat JSON, not wrapped in {success, data}
 */
export interface RawRenderResponseStatic {
  type: 'static';
  mime: 'image/png';
  imageHash: string;
  imageBase64: string;
  metadata: CanonicalMetadata;
}

/**
 * Raw response from POST /render endpoint (loop mode)
 * The renderer returns flat JSON, not wrapped in {success, data}
 */
export interface RawRenderResponseLoop {
  type: 'animation';
  mime: 'video/mp4';
  animationHash: string;
  animationBase64: string;
  posterHash: string;
  posterBase64: string;
  imageHash: string;  // Same as posterHash (for compatibility)
  imageBase64: string; // Same as posterBase64 (for compatibility)
  frames: number;
  fps: number;
  width: number;
  height: number;
  metadata: CanonicalMetadata;
}

/**
 * Union type for raw render responses
 */
export type RawRenderResponse = RawRenderResponseStatic | RawRenderResponseLoop;

/**
 * Normalized response from renderCertified()
 * Provides consistent interface regardless of static/loop mode
 */
export interface NormalizedRenderResult {
  mode: 'static' | 'loop';
  /** SHA-256 hash of static PNG or poster PNG */
  imageHash: string;
  /** Base64 encoded PNG (static image or poster frame) */
  outputBase64: string;
  /** MIME type of primary output */
  mime: 'image/png' | 'video/mp4';
  /** Animation hash (loop mode only) */
  animationHash?: string;
  /** Base64 encoded MP4 (loop mode only) */
  animationBase64?: string;
  /** Frame count (loop mode only) */
  frames?: number;
  /** FPS (loop mode only) */
  fps?: number;
  /** Canvas dimensions (loop mode only) */
  width?: number;
  height?: number;
  /** Node metadata */
  metadata: CanonicalMetadata;
}

/**
 * Response wrapper from renderCertified()
 * Either success with data or error with message
 */
export interface CanonicalRenderResponse {
  success: boolean;
  error?: string;
  data?: NormalizedRenderResult;
}

/**
 * Raw response from POST /verify endpoint (static mode)
 */
export interface RawVerifyResponseStatic {
  verified: boolean;
  computedHash: string;
  expectedHash: string;
  protocolCompliant?: boolean;
  metadata?: CanonicalMetadata;
}

/**
 * Raw response from POST /verify endpoint (loop mode)
 */
export interface RawVerifyResponseLoop {
  mode: 'loop';
  verified: boolean;
  posterVerified: boolean;
  animationVerified: boolean;
  computedPosterHash: string;
  computedAnimationHash: string;
  expectedPosterHash: string;
  expectedAnimationHash: string;
  hashMatchType?: 'exact' | 'partial' | 'none';
  metadata?: CanonicalMetadata;
}

/**
 * Normalized response from POST /verify endpoint
 */
export interface CanonicalVerifyResponse {
  /** Execution mode detected */
  mode: 'static' | 'loop';
  /** Overall verification status */
  verified: boolean;
  error?: string;
  /** For static mode */
  expectedHash?: string;
  computedHash?: string;
  protocolCompliant?: boolean;
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
  /** Metadata from renderer */
  metadata?: CanonicalMetadata;
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
 * Check if the Canonical Renderer proxy is reachable
 */
export async function isCanonicalRendererAvailable(): Promise<boolean> {
  try {
    const proxyUrl = getProxyUrl();
    const response = await fetch(`${proxyUrl}/health`, {
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
 * Calls proxy which forwards to renderer's /health endpoint
 */
export async function checkCanonicalHealth(): Promise<{
  available: boolean;
  latency?: number;
  error?: string;
  healthData?: {
    status?: string;
    node?: string;
    version?: string;
    sdk_version?: string;
    protocol_version?: string;
    canvas?: { width: number; height: number };
    timestamp?: string;
  };
}> {
  const proxyUrl = getProxyUrl();
  const start = performance.now();
  
  try {
    const response = await fetch(`${proxyUrl}/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    const latency = Math.round(performance.now() - start);
    
    if (response.ok) {
      const healthData = await response.json();
      return { available: true, latency, healthData };
    } else {
      // Handle rate limiting
      if (response.status === 429) {
        const errorData = await response.json();
        return { 
          available: false, 
          error: errorData.message || 'Rate limit exceeded. Please wait before retrying.' 
        };
      }
      const errorText = await response.text();
      return { 
        available: false, 
        error: `HTTP ${response.status}: ${errorText || response.statusText}` 
      };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { available: false, error: message };
  }
}

/**
 * Get Canonical Renderer info
 * Note: Actual renderer URL is now hidden behind proxy
 */
export function getCanonicalRendererInfo(): {
  url: string;
  configured: boolean;
  hasOverride: boolean;
} {
  return {
    url: 'Protected Proxy',
    configured: isProxyConfigured(),
    hasOverride: false,
  };
}

/**
 * Render a certified backtest via the Canonical Renderer proxy
 * 
 * POST /render
 * 
 * Returns normalized result with consistent fields for static/loop modes
 */
export async function renderCertified(
  snapshot: CanonicalSnapshot
): Promise<CanonicalRenderResponse> {
  const proxyUrl = getProxyUrl();
  const url = `${proxyUrl}/render`;
  
  // Debug: Log what we're sending
  console.log('[Canonical Client] Sending render request via proxy');
  console.log('[Canonical Client] Snapshot code length:', snapshot.code?.length ?? 'undefined');
  console.log('[Canonical Client] Snapshot seed:', snapshot.seed);
  
  try {
    // Send snapshot directly at root level (not wrapped in { snapshot: ... })
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(snapshot),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Canonical Client] Render error:', response.status, errorText);
      
      // Handle rate limiting
      if (response.status === 429) {
        try {
          const errorData = JSON.parse(errorText);
          return {
            success: false,
            error: errorData.message || 'Rate limit exceeded. Please wait before retrying.',
          };
        } catch {
          return {
            success: false,
            error: 'Rate limit exceeded. Please wait before retrying.',
          };
        }
      }
      
      return {
        success: false,
        error: `Proxy error (${response.status}): ${errorText}`,
      };
    }

    // Parse flat response from renderer
    const raw = await response.json() as RawRenderResponse;
    console.log('[Canonical Client] Render success, type:', raw.type);
    
    // Normalize to consistent interface
    if (raw.type === 'animation') {
      // Loop mode: use posterHash as imageHash (canonical poster hash)
      return {
        success: true,
        data: {
          mode: 'loop',
          imageHash: raw.posterHash, // Use posterHash as the canonical poster hash
          outputBase64: raw.posterBase64,
          mime: 'image/png', // Poster is always PNG
          animationHash: raw.animationHash,
          animationBase64: raw.animationBase64,
          frames: raw.frames,
          fps: raw.fps,
          width: raw.width,
          height: raw.height,
          metadata: raw.metadata,
        },
      };
    } else {
      // Static mode
      return {
        success: true,
        data: {
          mode: 'static',
          imageHash: raw.imageHash,
          outputBase64: raw.imageBase64,
          mime: 'image/png',
          metadata: raw.metadata,
        },
      };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Canonical Client] Network error:', message);
    return {
      success: false,
      error: `Failed to connect to proxy: ${message}`,
    };
  }
}

/**
 * Verify a static (non-loop) certified result via the Canonical Renderer proxy
 * 
 * POST /verify
 * Request: { snapshot, expectedHash }
 * Response: { verified, computedHash, expectedHash, protocolCompliant, metadata }
 */
export async function verifyCertifiedStatic(
  snapshot: CanonicalSnapshot,
  expectedHash: string
): Promise<CanonicalVerifyResponse> {
  const proxyUrl = getProxyUrl();
  const url = `${proxyUrl}/verify`;
  
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
      
      // Handle rate limiting
      if (response.status === 429) {
        try {
          const errorData = JSON.parse(errorText);
          return {
            mode: 'static',
            verified: false,
            error: errorData.message || 'Rate limit exceeded. Please wait before retrying.',
          };
        } catch {
          return {
            mode: 'static',
            verified: false,
            error: 'Rate limit exceeded. Please wait before retrying.',
          };
        }
      }
      
      return {
        mode: 'static',
        verified: false,
        error: `Proxy error (${response.status}): ${errorText}`,
      };
    }

    // Parse flat response
    const raw = await response.json() as RawVerifyResponseStatic;
    
    return {
      mode: 'static',
      verified: raw.verified,
      expectedHash: raw.expectedHash,
      computedHash: raw.computedHash,
      protocolCompliant: raw.protocolCompliant,
      metadata: raw.metadata,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      mode: 'static',
      verified: false,
      error: `Failed to connect to proxy: ${message}`,
    };
  }
}

/**
 * Verify a loop certified result via the Canonical Renderer proxy
 * 
 * Loop verification REQUIRES both poster AND animation hashes.
 * Never use expectedHash for loop mode.
 * 
 * POST /verify
 * Request: { snapshot, expectedPosterHash, expectedAnimationHash }
 * Response: { mode, verified, posterVerified, animationVerified, computedPosterHash, 
 *             computedAnimationHash, expectedPosterHash, expectedAnimationHash, hashMatchType, metadata }
 */
export async function verifyCertifiedLoop(
  snapshot: CanonicalSnapshot,
  expectedPosterHash: string,
  expectedAnimationHash: string
): Promise<CanonicalVerifyResponse> {
  const proxyUrl = getProxyUrl();
  const url = `${proxyUrl}/verify`;
  
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
      
      // Handle rate limiting
      if (response.status === 429) {
        try {
          const errorData = JSON.parse(errorText);
          return {
            mode: 'loop',
            verified: false,
            error: errorData.message || 'Rate limit exceeded. Please wait before retrying.',
          };
        } catch {
          return {
            mode: 'loop',
            verified: false,
            error: 'Rate limit exceeded. Please wait before retrying.',
          };
        }
      }
      
      return {
        mode: 'loop',
        verified: false,
        error: `Proxy error (${response.status}): ${errorText}`,
      };
    }

    // Parse flat response
    const raw = await response.json() as RawVerifyResponseLoop;
    
    return {
      mode: 'loop',
      verified: raw.verified,
      posterVerified: raw.posterVerified,
      animationVerified: raw.animationVerified,
      expectedPosterHash: raw.expectedPosterHash,
      computedPosterHash: raw.computedPosterHash,
      expectedAnimationHash: raw.expectedAnimationHash,
      computedAnimationHash: raw.computedAnimationHash,
      hashMatchType: raw.hashMatchType,
      metadata: raw.metadata,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      mode: 'loop',
      verified: false,
      error: `Failed to connect to proxy: ${message}`,
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
