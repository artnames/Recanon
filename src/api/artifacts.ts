/**
 * Artifact API Layer (Mock Implementation)
 * 
 * Provides read-only endpoints for artifact retrieval and verification.
 * No authentication required for verification endpoints.
 * 
 * In production, these would be real HTTP endpoints.
 */

import type { ArtifactBundle, VerificationApiResult } from '@/types/artifactBundle';
import { verifyBundle, parseBundle } from '@/certified/bundleExport';

// In-memory artifact store (mock database)
const artifactStore = new Map<string, ArtifactBundle>();

/**
 * Registers an artifact bundle in the store
 */
export function registerArtifact(bundle: ArtifactBundle): void {
  artifactStore.set(bundle.artifactId, bundle);
}

/**
 * GET /api/artifacts/:id
 * Returns full artifact JSON
 */
export async function getArtifact(id: string): Promise<ArtifactBundle | null> {
  // Simulate network latency
  await new Promise(resolve => setTimeout(resolve, 100));
  return artifactStore.get(id) ?? null;
}

/**
 * GET /api/artifacts/:id/bundle
 * Returns the export bundle JSON
 */
export async function getArtifactBundle(id: string): Promise<ArtifactBundle | null> {
  // Same as getArtifact for now - in production might have different access controls
  return getArtifact(id);
}

/**
 * POST /api/verify
 * Replays via certified engine and returns verification result
 * 
 * Accepts either:
 * - { artifactId: string } - looks up and verifies stored artifact
 * - { bundle: ArtifactBundle } - verifies provided bundle directly
 * - { verificationHash: string } - looks up by hash
 */
export async function verifyArtifact(
  params: { artifactId?: string; verificationHash?: string; bundle?: ArtifactBundle }
): Promise<VerificationApiResult> {
  // Simulate network latency
  await new Promise(resolve => setTimeout(resolve, 200));
  
  let bundle: ArtifactBundle | null = null;
  
  if (params.bundle) {
    bundle = params.bundle;
  } else if (params.artifactId) {
    bundle = await getArtifact(params.artifactId);
  } else if (params.verificationHash) {
    // Search by verification hash
    for (const stored of artifactStore.values()) {
      if (stored.verification.verificationHash === params.verificationHash) {
        bundle = stored;
        break;
      }
    }
  }
  
  if (!bundle) {
    return {
      verified: false,
      artifactId: params.artifactId ?? 'UNKNOWN',
      originalHash: params.verificationHash ?? 'UNKNOWN',
      computedHash: 'N/A',
      timestamp: new Date().toISOString(),
      mismatches: [{ field: 'artifact', expected: 'exists', actual: 'not_found' }],
      message: 'Artifact not found. Cannot verify.',
    };
  }
  
  // Use the bundle verification logic
  return verifyBundle(bundle);
}

/**
 * Verify from JSON string (used by CLI)
 */
export async function verifyBundleFromJson(json: string): Promise<VerificationApiResult> {
  try {
    const bundle = parseBundle(json);
    return verifyBundle(bundle);
  } catch (error) {
    return {
      verified: false,
      artifactId: 'PARSE_ERROR',
      originalHash: 'N/A',
      computedHash: 'N/A',
      timestamp: new Date().toISOString(),
      mismatches: [{ 
        field: 'json', 
        expected: 'valid bundle', 
        actual: error instanceof Error ? error.message : 'Invalid JSON' 
      }],
      message: `Failed to parse bundle: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * List all stored artifacts (for demo/testing)
 */
export async function listArtifacts(): Promise<ArtifactBundle[]> {
  await new Promise(resolve => setTimeout(resolve, 50));
  return Array.from(artifactStore.values());
}

/**
 * Clear all stored artifacts (for testing)
 */
export function clearArtifactStore(): void {
  artifactStore.clear();
}
