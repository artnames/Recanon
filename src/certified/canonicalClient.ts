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

// ============================================================
// RAW RESPONSE TYPES (from upstream renderer - flat or wrapped)
// ============================================================

/**
 * Raw flat response from POST /render endpoint (static mode)
 */
interface RawRenderResponseStaticFlat {
  type: 'static';
  mime: 'image/png';
  imageHash: string;
  imageBase64: string;
  metadata: CanonicalMetadata;
}

/**
 * Raw flat response from POST /render endpoint (loop mode)
 */
interface RawRenderResponseLoopFlat {
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
 * Union type for raw flat render responses
 */
type RawRenderResponseFlat = RawRenderResponseStaticFlat | RawRenderResponseLoopFlat;

/**
 * Wrapped response format (legacy or some upstream versions)
 */
interface WrappedResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Raw verify response (static mode) - flat
 */
interface RawVerifyResponseStaticFlat {
  verified: boolean;
  computedHash: string;
  expectedHash: string;
  protocolCompliant?: boolean;
  metadata?: CanonicalMetadata;
}

/**
 * Raw verify response (loop mode) - flat
 */
interface RawVerifyResponseLoopFlat {
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

// ============================================================
// NORMALIZED RESPONSE TYPES (what the UI always sees)
// ============================================================

/**
 * Normalized render result - stable interface for all consumers
 * UI components use ONLY these fields, never raw response fields
 */
export interface NormalizedRenderResult {
  /** Execution mode */
  mode: 'static' | 'loop';
  /** SHA-256 hash of poster/static image */
  posterHash: string;
  /** Base64 encoded PNG (static image or poster frame) */
  posterBase64: string;
  /** Animation hash (loop mode only, null for static) */
  animationHash: string | null;
  /** Base64 encoded MP4 (loop mode only, null for static) */
  animationBase64: string | null;
  /** MIME type of primary output */
  mime: 'image/png' | 'video/mp4';
  /** Node metadata */
  metadata: CanonicalMetadata;
  /** Frame count (loop mode only) */
  frames?: number;
  /** FPS (loop mode only) */
  fps?: number;
  /** Canvas dimensions */
  width?: number;
  height?: number;
  
  // Legacy compatibility aliases
  /** @deprecated Use posterHash instead */
  imageHash: string;
  /** @deprecated Use posterBase64 instead */
  outputBase64: string;
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
// RESPONSE NORMALIZATION LAYER
// ============================================================

/**
 * Detects if response is wrapped format (has success/data structure)
 */
function isWrappedResponse<T>(raw: unknown): raw is WrappedResponse<T> {
  return (
    typeof raw === 'object' && 
    raw !== null && 
    'success' in raw &&
    typeof (raw as WrappedResponse<T>).success === 'boolean'
  );
}

/**
 * Unwraps response if wrapped, otherwise returns as-is
 */
function unwrapResponse<T>(raw: unknown): T {
  if (isWrappedResponse<T>(raw)) {
    if (!raw.success) {
      throw new Error(raw.error || 'Upstream returned success: false');
    }
    if (!raw.data) {
      throw new Error('Upstream returned success: true but no data');
    }
    return raw.data;
  }
  return raw as T;
}

/**
 * Normalizes raw render response (flat or wrapped) to stable interface
 */
export function normalizeRenderResponse(raw: unknown): NormalizedRenderResult {
  const data = unwrapResponse<RawRenderResponseFlat>(raw);
  
  if (data.type === 'animation') {
    // Loop mode: use posterHash as the canonical poster hash
    return {
      mode: 'loop',
      posterHash: data.posterHash,
      posterBase64: data.posterBase64,
      animationHash: data.animationHash,
      animationBase64: data.animationBase64,
      mime: 'video/mp4',
      metadata: data.metadata,
      frames: data.frames,
      fps: data.fps,
      width: data.width,
      height: data.height,
      // Legacy aliases
      imageHash: data.posterHash,
      outputBase64: data.posterBase64,
    };
  } else {
    // Static mode
    return {
      mode: 'static',
      posterHash: data.imageHash,
      posterBase64: data.imageBase64,
      animationHash: null,
      animationBase64: null,
      mime: 'image/png',
      metadata: data.metadata,
      // Legacy aliases
      imageHash: data.imageHash,
      outputBase64: data.imageBase64,
    };
  }
}

/**
 * Normalizes raw verify response (flat or wrapped) to stable interface
 */
export function normalizeVerifyResponse(raw: unknown, isLoop: boolean): CanonicalVerifyResponse {
  const data = unwrapResponse<RawVerifyResponseStaticFlat | RawVerifyResponseLoopFlat>(raw);
  
  // Detect loop mode from response or from caller hint
  const responseIsLoop = 'mode' in data && data.mode === 'loop';
  const actuallyLoop = responseIsLoop || isLoop;
  
  if (actuallyLoop && 'posterVerified' in data) {
    const loopData = data as RawVerifyResponseLoopFlat;
    return {
      mode: 'loop',
      verified: loopData.verified,
      posterVerified: loopData.posterVerified,
      animationVerified: loopData.animationVerified,
      expectedPosterHash: loopData.expectedPosterHash,
      computedPosterHash: loopData.computedPosterHash,
      expectedAnimationHash: loopData.expectedAnimationHash,
      computedAnimationHash: loopData.computedAnimationHash,
      hashMatchType: loopData.hashMatchType,
      metadata: loopData.metadata,
    };
  } else {
    const staticData = data as RawVerifyResponseStaticFlat;
    return {
      mode: 'static',
      verified: staticData.verified,
      expectedHash: staticData.expectedHash,
      computedHash: staticData.computedHash,
      protocolCompliant: staticData.protocolCompliant,
      metadata: staticData.metadata,
    };
  }
}

// ============================================================
// ERROR HANDLING WITH HINTS
// ============================================================

/**
 * Creates a descriptive error with status code, body, and action hint
 */
export class CanonicalError extends Error {
  public readonly statusCode: number;
  public readonly rawBody: string;
  public readonly hint: string;

  constructor(statusCode: number, rawBody: string, hint: string) {
    const message = `Proxy error (${statusCode}): ${rawBody.substring(0, 200)}`;
    super(message);
    this.name = 'CanonicalError';
    this.statusCode = statusCode;
    this.rawBody = rawBody;
    this.hint = hint;
  }
}

/**
 * Determines the appropriate hint based on error details
 */
function getErrorHint(status: number, body: string): string {
  const bodyLower = body.toLowerCase();
  
  // Rate limiting
  if (status === 429) {
    return 'Rate limit exceeded. Wait a moment and try again.';
  }
  
  // CORS issues
  if (bodyLower.includes('cors') || bodyLower.includes('origin')) {
    return 'CORS error. Ensure the proxy is correctly configured.';
  }
  
  // Invalid code
  if (bodyLower.includes('invalid_code') || bodyLower.includes('code must be')) {
    return 'Snapshot code is invalid. Ensure code is a non-empty string.';
  }
  
  // Canvas violation
  if (bodyLower.includes('createcanvas') || bodyLower.includes('canvas')) {
    return 'Canvas is fixed at 1950×2400. Remove createCanvas() from your code.';
  }
  
  // Loop mode issues
  if (bodyLower.includes('loop') || bodyLower.includes('animation') || bodyLower.includes('frames')) {
    return 'Loop mode error. Ensure execution.frames ≥ 2 and execution.loop = true.';
  }
  
  // Proxy/network issues
  if (status === 502 || status === 503 || status === 504) {
    return 'Canonical renderer is unreachable. Check network or try again later.';
  }
  
  // Auth/forbidden
  if (status === 401 || status === 403) {
    return 'Authentication error. Check API credentials.';
  }
  
  // Generic client error
  if (status >= 400 && status < 500) {
    return 'Invalid request. Check your snapshot parameters.';
  }
  
  // Generic server error
  if (status >= 500) {
    return 'Server error. Try again or contact support.';
  }
  
  return 'Unknown error. Check console for details.';
}

/**
 * Handles non-2xx responses by throwing CanonicalError
 */
async function handleErrorResponse(response: Response): Promise<never> {
  const bodyText = await response.text();
  const hint = getErrorHint(response.status, bodyText);
  throw new CanonicalError(response.status, bodyText, hint);
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
 * Returns normalized result with consistent fields for static/loop modes.
 * Handles both flat and wrapped upstream responses.
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
      try {
        await handleErrorResponse(response);
      } catch (err) {
        if (err instanceof CanonicalError) {
          console.error('[Canonical Client] Render error:', err.statusCode, err.rawBody);
          return {
            success: false,
            error: `${err.message}\n\nNext step: ${err.hint}`,
          };
        }
        throw err;
      }
    }

    // Parse response (handles both flat and wrapped formats)
    const raw = await response.json();
    console.log('[Canonical Client] Render success, raw type:', raw.type || (raw.data?.type) || 'unknown');
    
    // Normalize to consistent interface
    const normalized = normalizeRenderResponse(raw);
    
    return {
      success: true,
      data: normalized,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Canonical Client] Network error:', message);
    
    const hint = error instanceof CanonicalError 
      ? error.hint 
      : 'Check network connection and proxy configuration.';
    
    return {
      success: false,
      error: `Failed to connect to proxy: ${message}\n\nNext step: ${hint}`,
    };
  }
}

/**
 * Verify a static (non-loop) certified result via the Canonical Renderer proxy
 * 
 * POST /verify
 * Request: { snapshot, expectedHash }
 * Response: normalized CanonicalVerifyResponse
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
      try {
        await handleErrorResponse(response);
      } catch (err) {
        if (err instanceof CanonicalError) {
          return {
            mode: 'static',
            verified: false,
            error: `${err.message}\n\nNext step: ${err.hint}`,
          };
        }
        throw err;
      }
    }

    // Parse and normalize response
    const raw = await response.json();
    return normalizeVerifyResponse(raw, false);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const hint = error instanceof CanonicalError 
      ? error.hint 
      : 'Check network connection.';
    
    return {
      mode: 'static',
      verified: false,
      error: `Failed to connect to proxy: ${message}\n\nNext step: ${hint}`,
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
 * Response: normalized CanonicalVerifyResponse
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
      try {
        await handleErrorResponse(response);
      } catch (err) {
        if (err instanceof CanonicalError) {
          return {
            mode: 'loop',
            verified: false,
            error: `${err.message}\n\nNext step: ${err.hint}`,
          };
        }
        throw err;
      }
    }

    // Parse and normalize response
    const raw = await response.json();
    return normalizeVerifyResponse(raw, true);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const hint = error instanceof CanonicalError 
      ? error.hint 
      : 'Check network connection.';
    
    return {
      mode: 'loop',
      verified: false,
      error: `Failed to connect to proxy: ${message}\n\nNext step: ${hint}`,
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
