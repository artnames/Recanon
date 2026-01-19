/**
 * Artifact API Layer (Mock Implementation)
 * 
 * Provides read-only endpoints for artifact retrieval and verification.
 * No authentication required for verification endpoints.
 * 
 * In production, these would be real HTTP endpoints.
 */

import type { CertifiedArtifactBundle, VerificationResult } from '@/types/certifiedArtifact';
import { verifyCertified } from '@/certified/canonicalClient';

// In-memory artifact store (mock database)
const artifactStore = new Map<string, CertifiedArtifactBundle>();

/**
 * Registers an artifact bundle in the store
 */
export function registerArtifact(bundle: CertifiedArtifactBundle): void {
  const id = bundle.snapshot.metadata?.strategyId || `artifact-${Date.now()}`;
  artifactStore.set(id, bundle);
}

/**
 * GET /api/artifacts/:id
 * Returns full artifact JSON
 */
export async function getArtifact(id: string): Promise<CertifiedArtifactBundle | null> {
  await new Promise(resolve => setTimeout(resolve, 100));
  return artifactStore.get(id) ?? null;
}

/**
 * GET /api/artifacts/:id/bundle
 * Returns the export bundle JSON
 */
export async function getArtifactBundle(id: string): Promise<CertifiedArtifactBundle | null> {
  return getArtifact(id);
}

/**
 * POST /api/verify
 * Calls Canonical Renderer to verify artifact
 */
export async function verifyArtifact(
  params: { artifactId?: string; expectedHash?: string; bundle?: CertifiedArtifactBundle }
): Promise<VerificationResult> {
  await new Promise(resolve => setTimeout(resolve, 200));
  
  let bundle: CertifiedArtifactBundle | null = null;
  
  if (params.bundle) {
    bundle = params.bundle;
  } else if (params.artifactId) {
    bundle = await getArtifact(params.artifactId);
  } else if (params.expectedHash) {
    for (const stored of artifactStore.values()) {
      if (stored.expectedImageHash === params.expectedHash) {
        bundle = stored;
        break;
      }
    }
  }
  
  if (!bundle) {
    return {
      verified: false,
      originalHash: params.expectedHash ?? 'UNKNOWN',
      computedHash: 'N/A',
      matchDetails: {
        codeMatch: false,
        seedMatch: false,
        varsMatch: false,
        outputMatch: false,
      },
      rendererVersion: 'N/A',
      nodeVersion: 'N/A',
      timestamp: new Date().toISOString(),
      error: 'Artifact not found. Cannot verify.',
    };
  }
  
  // Verify via Canonical Renderer
  const result = await verifyCertified(bundle.snapshot, bundle.expectedImageHash);
  
  if (result.error) {
    return {
      verified: false,
      originalHash: bundle.expectedImageHash,
      computedHash: 'N/A',
      matchDetails: {
        codeMatch: false,
        seedMatch: false,
        varsMatch: false,
        outputMatch: false,
      },
      rendererVersion: 'N/A',
      nodeVersion: 'N/A',
      timestamp: new Date().toISOString(),
      error: result.error,
    };
  }
  
  return {
    verified: result.verified,
    originalHash: result.data?.originalHash ?? bundle.expectedImageHash,
    computedHash: result.data?.computedHash ?? 'N/A',
    matchDetails: result.data?.matchDetails ?? {
      codeMatch: false,
      seedMatch: false,
      varsMatch: false,
      outputMatch: false,
    },
    rendererVersion: result.data?.rendererVersion ?? 'N/A',
    nodeVersion: result.data?.nodeVersion ?? 'N/A',
    timestamp: result.data?.timestamp ?? new Date().toISOString(),
  };
}

/**
 * List all stored artifacts (for demo/testing)
 */
export async function listArtifacts(): Promise<CertifiedArtifactBundle[]> {
  await new Promise(resolve => setTimeout(resolve, 50));
  return Array.from(artifactStore.values());
}

/**
 * Clear all stored artifacts (for testing)
 */
export function clearArtifactStore(): void {
  artifactStore.clear();
}
