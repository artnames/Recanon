/**
 * Certified Artifact Types
 * 
 * Defines the structure for certified backtest artifacts
 * produced by the NexArt Canonical Renderer.
 */

import type { CanonicalSnapshot } from '@/certified/canonicalClient';

/**
 * Node metadata from the Canonical Renderer
 * All fields are optional to match actual API responses
 */
export interface CanonicalNodeMetadata {
  protocol?: string;
  protocolVersion?: string;
  sdkVersion?: string;
  nodeVersion?: string;
  rendererVersion?: string;
  rendererUrl?: string;
  timestamp?: string;
  deterministic?: boolean;
}

/**
 * Computed metrics from the backtest visualization
 */
export interface BacktestMetrics {
  totalReturn: number;
  cagr: number;
  maxDrawdown: number;
  volatility: number;
  finalEquity: number;
  sharpeEstimate: number;
}

/**
 * Verification requirements indicator
 */
export type VerificationRequirements = 
  | 'static-single-hash'
  | 'loop-requires-both-hashes';

/**
 * Certified Artifact structure
 * 
 * This is the complete artifact produced by a certified execution.
 * Contains everything needed for verification and export.
 */
export interface CertifiedArtifact {
  /** Runtime identifier */
  runtime: 'nexart-canonical-renderer';
  
  /** Unique artifact ID */
  artifactId: string;
  
  /** The snapshot used for execution */
  snapshot: CanonicalSnapshot;
  
  /** SHA-256 hash of the output image bytes (poster for loop mode) */
  imageHash: string;
  
  /** SHA-256 hash of animation if loop=true */
  animationHash?: string;
  
  /** Base64 encoded output (PNG or MP4 poster) */
  outputBase64: string;
  
  /** Base64 encoded animation if loop=true */
  animationBase64?: string;
  
  /** MIME type of the output */
  mimeType: 'image/png' | 'video/mp4';
  
  /** Node metadata from the renderer */
  nodeMetadata: CanonicalNodeMetadata;
  
  /** Computed metrics from the visualization */
  metrics?: BacktestMetrics;
  
  /** Verification status */
  sealed: boolean;
  
  /** Creation timestamp */
  createdAt: string;
}

/**
 * Certified Artifact Export Bundle
 * 
 * Portable JSON format for sharing and verification.
 * For loop mode, both poster and animation hashes are required.
 */
export interface CertifiedArtifactBundle {
  /** Bundle format version */
  bundleVersion: '2.0.0';
  
  /** Canonical renderer URL used */
  canonicalUrl: string;
  
  /** The complete snapshot */
  snapshot: CanonicalSnapshot;
  
  /** 
   * Expected image/poster hash for verification 
   * For static: the single image hash
   * For loop: the poster frame hash
   */
  expectedImageHash: string;
  
  /** 
   * Expected animation hash (required for loop mode)
   * Loop verification requires BOTH hashes
   */
  expectedAnimationHash?: string;
  
  /**
   * Verification requirements indicator
   * Tells verifiers what hashes are required
   */
  verificationRequirements: VerificationRequirements;
  
  /** Node metadata at time of creation */
  nodeMetadata: CanonicalNodeMetadata;
  
  /** Creation timestamp */
  timestamp: string;
  
  /** Optional: base64 output for offline viewing */
  outputBase64?: string;
  
  /** Optional: base64 animation for offline viewing (loop mode) */
  animationBase64?: string;
  
  /** Optional: computed metrics */
  metrics?: BacktestMetrics;
}

/**
 * Verification result from the Canonical Renderer
 */
export interface VerificationResult {
  /** Execution mode */
  mode: 'static' | 'loop';
  /** Overall verification status */
  verified: boolean;
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
  rendererVersion: string;
  nodeVersion: string;
  timestamp: string;
  error?: string;
}

/**
 * Check if artifact is loop mode
 */
export function isLoopArtifact(artifact: CertifiedArtifact): boolean {
  return artifact.snapshot.execution?.loop === true;
}

/**
 * Creates an export bundle from a certified artifact
 */
export function createExportBundle(
  artifact: CertifiedArtifact,
  canonicalUrl: string,
  includeOutput: boolean = false
): CertifiedArtifactBundle {
  const isLoop = isLoopArtifact(artifact);
  
  return {
    bundleVersion: '2.0.0',
    canonicalUrl,
    snapshot: artifact.snapshot,
    expectedImageHash: artifact.imageHash,
    expectedAnimationHash: isLoop ? artifact.animationHash : undefined,
    verificationRequirements: isLoop ? 'loop-requires-both-hashes' : 'static-single-hash',
    nodeMetadata: artifact.nodeMetadata,
    timestamp: artifact.createdAt,
    outputBase64: includeOutput ? artifact.outputBase64 : undefined,
    animationBase64: includeOutput && isLoop ? artifact.animationBase64 : undefined,
    metrics: artifact.metrics,
  };
}

/**
 * Serializes bundle to JSON with consistent ordering
 */
export function serializeBundle(bundle: CertifiedArtifactBundle): string {
  return JSON.stringify(bundle, null, 2);
}

/**
 * Downloads bundle as JSON file
 */
export function downloadBundle(bundle: CertifiedArtifactBundle, artifactId: string): void {
  const json = serializeBundle(bundle);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${artifactId}-certified-bundle.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
