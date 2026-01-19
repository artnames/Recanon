/**
 * Artifact API Layer (Mock Implementation)
 * 
 * Provides read-only endpoints for artifact retrieval and verification.
 * No authentication required for verification endpoints.
 * 
 * In production, these would be real HTTP endpoints.
 */

import type { CertifiedArtifactBundle, VerificationResult } from '@/types/certifiedArtifact';
import { verifyCertifiedStatic, verifyCertifiedLoop, isLoopMode } from '@/certified/canonicalClient';

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
 * 
 * For loop mode: uses verifyCertifiedLoop with both hashes
 * For static mode: uses verifyCertifiedStatic with single hash
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
      mode: 'static',
      verified: false,
      originalHash: params.expectedHash,
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
  
  const isLoop = isLoopMode(bundle.snapshot);
  
  // Verify via Canonical Renderer using appropriate method
  if (isLoop) {
    // Loop mode: MUST use both hashes
    if (!bundle.expectedAnimationHash) {
      return {
        mode: 'loop',
        verified: false,
        expectedPosterHash: bundle.expectedImageHash,
        matchDetails: {
          codeMatch: false,
          seedMatch: false,
          varsMatch: false,
          outputMatch: false,
        },
        rendererVersion: 'N/A',
        nodeVersion: 'N/A',
        timestamp: new Date().toISOString(),
        error: 'Loop verification requires both poster and animation hashes. Missing expectedAnimationHash.',
      };
    }
    
    const result = await verifyCertifiedLoop(
      bundle.snapshot, 
      bundle.expectedImageHash, 
      bundle.expectedAnimationHash
    );
    
    if (result.error) {
      return {
        mode: 'loop',
        verified: false,
        expectedPosterHash: bundle.expectedImageHash,
        expectedAnimationHash: bundle.expectedAnimationHash,
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
      mode: 'loop',
      verified: result.verified,
      posterVerified: result.posterVerified,
      expectedPosterHash: result.expectedPosterHash ?? bundle.expectedImageHash,
      computedPosterHash: result.computedPosterHash,
      animationVerified: result.animationVerified,
      expectedAnimationHash: result.expectedAnimationHash ?? bundle.expectedAnimationHash,
      computedAnimationHash: result.computedAnimationHash,
      hashMatchType: result.hashMatchType,
      matchDetails: {
        codeMatch: result.verified,
        seedMatch: result.verified,
        varsMatch: result.verified,
        outputMatch: result.verified,
      },
      rendererVersion: result.metadata?.rendererVersion ?? 'N/A',
      nodeVersion: result.metadata?.nodeVersion ?? 'N/A',
      timestamp: result.metadata?.timestamp ?? new Date().toISOString(),
    };
  } else {
    // Static mode: use single hash
    const result = await verifyCertifiedStatic(bundle.snapshot, bundle.expectedImageHash);
    
    if (result.error) {
      return {
        mode: 'static',
        verified: false,
        originalHash: bundle.expectedImageHash,
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
      mode: 'static',
      verified: result.verified,
      originalHash: result.expectedHash ?? bundle.expectedImageHash,
      computedHash: result.computedHash,
      matchDetails: {
        codeMatch: result.verified,
        seedMatch: result.verified,
        varsMatch: result.verified,
        outputMatch: result.verified,
      },
      rendererVersion: result.metadata?.rendererVersion ?? 'N/A',
      nodeVersion: result.metadata?.nodeVersion ?? 'N/A',
      timestamp: result.metadata?.timestamp ?? new Date().toISOString(),
    };
  }
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
