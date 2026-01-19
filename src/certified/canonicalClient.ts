/**
 * NexArt Canonical Renderer Client
 * 
 * HTTP client for the authoritative NexArt Canonical Renderer server.
 * All certified executions MUST go through this client - no local fallbacks.
 * 
 * Server repo: artnames/nexart-canonical-renderer
 * Endpoints: POST /render, POST /verify
 */

/**
 * Canonical Renderer URL
 * Configure via environment variable or default to localhost for development
 */
export const CANONICAL_RENDERER_URL = 
  import.meta.env.VITE_CANONICAL_RENDERER_URL || 
  'http://localhost:5000';

/**
 * Snapshot input for certified execution
 * Contains all data needed to deterministically render/verify
 */
export interface CanonicalSnapshot {
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

/**
 * Response from POST /render endpoint
 */
export interface CanonicalRenderResponse {
  success: boolean;
  error?: string;
  data?: {
    artifactId: string;
    outputHash: string;
    verificationHash: string;
    metadata: {
      protocol: string;
      protocolVersion: string;
      engine: string;
      rendererVersion: string;
      timestamp: string;
      deterministic: boolean;
    };
    outputs: {
      equityCurve: Array<{ date: string; equity: number; drawdown: number }>;
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
      strategyMatch: boolean;
      datasetMatch: boolean;
      parametersMatch: boolean;
      outputMatch: boolean;
    };
    timestamp: string;
    rendererVersion: string;
  };
}

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
 *     "strategyId": "momentum-v1",
 *     "strategyHash": "sha256:...",
 *     "datasetId": "sp500-2020-2024",
 *     "datasetHash": "sha256:...",
 *     "seed": 42,
 *     "startDate": "2023-01-01",
 *     "endDate": "2023-12-31",
 *     "parameters": { "riskLevel": "medium" }
 *   }
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "artifactId": "CBT-xxx",
 *     "outputHash": "sha256:...",
 *     "verificationHash": "sha256:...",
 *     "metadata": { ... },
 *     "outputs": { equityCurve: [...], metrics: {...} }
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
 *   "snapshot": { ... },
 *   "expectedHash": "sha256:..."
 * }
 * 
 * Response:
 * {
 *   "verified": true/false,
 *   "data": {
 *     "originalHash": "sha256:...",
 *     "computedHash": "sha256:...",
 *     "matchDetails": { strategyMatch: true, ... },
 *     "timestamp": "2024-...",
 *     "rendererVersion": "1.0.0"
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

/**
 * Verify from artifact bundle JSON
 * Extracts snapshot and hash from bundle and calls verify endpoint
 */
export async function verifyBundleViaCanonical(
  bundle: {
    params: { seed: number; startDate: string; endDate: string; parameters: Record<string, unknown> };
    strategy: { name: string; codeHash: string; code?: string };
    dataset: { datasetId: string; datasetHash: string };
    verification: { verificationHash: string };
  }
): Promise<CanonicalVerifyResponse> {
  const snapshot: CanonicalSnapshot = {
    strategyId: bundle.strategy.name,
    strategyHash: bundle.strategy.codeHash,
    strategyCode: bundle.strategy.code,
    datasetId: bundle.dataset.datasetId,
    datasetHash: bundle.dataset.datasetHash,
    seed: bundle.params.seed,
    startDate: bundle.params.startDate,
    endDate: bundle.params.endDate,
    parameters: bundle.params.parameters,
  };

  return verifyCertified(snapshot, bundle.verification.verificationHash);
}
