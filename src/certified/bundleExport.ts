/**
 * Artifact Bundle Export Utilities
 * 
 * Handles creation and export of portable artifact bundles.
 * Bundles are deterministic: fields ordered consistently.
 */

import type { CertifiedExecutionResult } from './engine';
import type { Strategy } from '@/types/backtest';
import type { ArtifactBundle, VerificationApiResult } from '@/types/artifactBundle';
import { ARTIFACT_BUNDLE_VERSION } from '@/types/artifactBundle';

interface BundleCreationParams {
  result: CertifiedExecutionResult;
  strategy: Strategy;
  datasetId: string;
  datasetSource: string;
  parameters: Record<string, unknown>;
}

/**
 * Computes a hash for the manifest (deterministic ordering)
 */
function computeManifestHash(manifest: CertifiedExecutionResult['executionManifest']): string {
  const orderedData = [
    manifest.seed,
    manifest.datasetHash,
    manifest.strategyHash,
    manifest.parametersHash,
    manifest.startDate,
    manifest.endDate,
    manifest.timestamp
  ].join('|');
  
  let hash = 0;
  for (let i = 0; i < orderedData.length; i++) {
    const char = orderedData.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `sha256:${Math.abs(hash).toString(16).padStart(64, '0')}`;
}

/**
 * Computes output hash from equity curve and metrics
 */
function computeOutputHash(
  equityCurve: CertifiedExecutionResult['equityCurve'],
  metrics: CertifiedExecutionResult['metrics']
): string {
  // Deterministic serialization with sorted keys
  const metricsOrdered = JSON.stringify(metrics, Object.keys(metrics).sort());
  const curveData = equityCurve.map(p => `${p.date}:${p.equity}:${p.drawdown}`).join('|');
  const combined = `${metricsOrdered}|${curveData}`;
  
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `sha256:${Math.abs(hash).toString(16).padStart(64, '0')}`;
}

/**
 * Creates a portable artifact bundle from a certified execution result.
 * The bundle contains everything required to replay except the runtime itself.
 */
export function createArtifactBundle(params: BundleCreationParams): ArtifactBundle {
  const { result, strategy, datasetId, datasetSource, parameters } = params;
  
  const outputHash = computeOutputHash(result.equityCurve, result.metrics);
  const manifestHash = computeManifestHash(result.executionManifest);
  
  // Create bundle with deterministic field ordering
  const bundle: ArtifactBundle = {
    artifactVersion: ARTIFACT_BUNDLE_VERSION,
    artifactId: result.artifactId,
    createdAt: result.executionManifest.timestamp,
    strategy: {
      name: strategy.name,
      codeHash: strategy.codeHash,
      // code: undefined, // Omit in v1 unless explicitly included
    },
    dataset: {
      datasetId,
      datasetHash: result.executionManifest.datasetHash,
      source: datasetSource,
    },
    params: {
      seed: result.executionManifest.seed,
      startDate: result.executionManifest.startDate,
      endDate: result.executionManifest.endDate,
      parameters,
    },
    manifest: {
      ...result.executionManifest,
      manifestHash,
    },
    outputs: {
      equityCurve: result.equityCurve,
      metrics: result.metrics,
    },
    verification: {
      outputHash,
      verificationHash: result.verificationHash,
    },
  };
  
  return bundle;
}

/**
 * Serializes bundle to JSON with consistent field ordering (deterministic)
 */
export function serializeBundle(bundle: ArtifactBundle): string {
  // Use replacer to ensure consistent ordering
  const orderedKeys = [
    'artifactVersion',
    'artifactId', 
    'createdAt',
    'strategy',
    'dataset',
    'params',
    'manifest',
    'outputs',
    'verification'
  ];
  
  return JSON.stringify(bundle, orderedKeys, 2);
}

/**
 * Downloads bundle as JSON file
 */
export function downloadBundle(bundle: ArtifactBundle): void {
  const json = serializeBundle(bundle);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${bundle.artifactId}-bundle.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generates CLI replay command for the bundle
 */
export function generateReplayCommand(bundle: ArtifactBundle): string {
  return `node scripts/replay-artifact.ts --bundle ./${bundle.artifactId}-bundle.json`;
}

/**
 * Parses a bundle from JSON string
 */
export function parseBundle(json: string): ArtifactBundle {
  const bundle = JSON.parse(json) as ArtifactBundle;
  
  // Validate required fields
  const requiredFields = ['artifactVersion', 'artifactId', 'createdAt', 'strategy', 'dataset', 'params', 'manifest', 'outputs', 'verification'];
  for (const field of requiredFields) {
    if (!(field in bundle)) {
      throw new Error(`Invalid bundle: missing required field '${field}'`);
    }
  }
  
  return bundle;
}

/**
 * Verifies bundle integrity by recomputing hashes
 */
export function verifyBundle(bundle: ArtifactBundle): VerificationApiResult {
  const mismatches: VerificationApiResult['mismatches'] = [];
  
  // Recompute output hash
  const computedOutputHash = computeOutputHash(
    bundle.outputs.equityCurve,
    bundle.outputs.metrics
  );
  
  if (computedOutputHash !== bundle.verification.outputHash) {
    mismatches.push({
      field: 'outputHash',
      expected: bundle.verification.outputHash,
      actual: computedOutputHash,
    });
  }
  
  // Recompute manifest hash
  const computedManifestHash = computeManifestHash({
    seed: bundle.manifest.seed,
    datasetHash: bundle.manifest.datasetHash,
    strategyHash: bundle.manifest.strategyHash,
    parametersHash: bundle.manifest.parametersHash,
    startDate: bundle.manifest.startDate,
    endDate: bundle.manifest.endDate,
    timestamp: bundle.manifest.timestamp,
  });
  
  if (computedManifestHash !== bundle.manifest.manifestHash) {
    mismatches.push({
      field: 'manifestHash',
      expected: bundle.manifest.manifestHash,
      actual: computedManifestHash,
    });
  }
  
  const verified = mismatches.length === 0;
  
  return {
    verified,
    artifactId: bundle.artifactId,
    originalHash: bundle.verification.verificationHash,
    computedHash: verified ? bundle.verification.verificationHash : 'MISMATCH',
    timestamp: new Date().toISOString(),
    mismatches: verified ? undefined : mismatches,
    message: verified 
      ? 'Verification passed. Bundle is authentic and unmodified.'
      : `Verification failed. ${mismatches.length} mismatch(es) detected.`,
  };
}
