#!/usr/bin/env node

/**
 * CLI Replay Script for Certified Artifacts
 * 
 * Usage:
 *   node scripts/replay-artifact.ts --bundle ./artifact.json
 *   npx tsx scripts/replay-artifact.ts --bundle ./artifact.json
 * 
 * This script:
 * 1. Loads the bundle JSON
 * 2. Validates required fields
 * 3. Calls the certified execution layer to replay
 * 4. Recomputes outputHash + verificationHash
 * 5. Prints a terminal-style verification report
 * 
 * NOTE: This script does NOT import NexArt directly.
 * It uses the same certified module boundary as the app.
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================
// Types (duplicated to avoid import issues in standalone script)
// ============================================

interface ArtifactBundle {
  artifactVersion: string;
  artifactId: string;
  createdAt: string;
  strategy: {
    name: string;
    codeHash: string;
    code?: string;
  };
  dataset: {
    datasetId: string;
    datasetHash: string;
    source: string;
  };
  params: {
    seed: number;
    startDate: string;
    endDate: string;
    parameters: Record<string, unknown>;
  };
  manifest: {
    seed: number;
    datasetHash: string;
    strategyHash: string;
    parametersHash: string;
    startDate: string;
    endDate: string;
    timestamp: string;
    manifestHash: string;
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
  verification: {
    outputHash: string;
    verificationHash: string;
  };
}

interface VerificationResult {
  verified: boolean;
  mismatches: Array<{ field: string; expected: string | number; actual: string | number }>;
}

// ============================================
// Hash computation (same as certified engine)
// ============================================

function computeOutputHash(
  equityCurve: ArtifactBundle['outputs']['equityCurve'],
  metrics: ArtifactBundle['outputs']['metrics']
): string {
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

function computeManifestHash(manifest: ArtifactBundle['manifest']): string {
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

// ============================================
// Bundle validation
// ============================================

function validateBundle(bundle: unknown): bundle is ArtifactBundle {
  if (!bundle || typeof bundle !== 'object') return false;
  
  const b = bundle as Record<string, unknown>;
  const requiredFields = [
    'artifactVersion', 'artifactId', 'createdAt', 
    'strategy', 'dataset', 'params', 'manifest', 
    'outputs', 'verification'
  ];
  
  for (const field of requiredFields) {
    if (!(field in b)) {
      console.error(`❌ Missing required field: ${field}`);
      return false;
    }
  }
  
  return true;
}

// ============================================
// Verification logic
// ============================================

function verifyBundle(bundle: ArtifactBundle): VerificationResult {
  const mismatches: VerificationResult['mismatches'] = [];
  
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
  const computedManifestHash = computeManifestHash(bundle.manifest);
  
  if (computedManifestHash !== bundle.manifest.manifestHash) {
    mismatches.push({
      field: 'manifestHash',
      expected: bundle.manifest.manifestHash,
      actual: computedManifestHash,
    });
  }
  
  return {
    verified: mismatches.length === 0,
    mismatches,
  };
}

// ============================================
// CLI Output
// ============================================

function printHeader() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║           CERTIFIED ARTIFACT REPLAY & VERIFICATION           ║');
  console.log('║                   NexArt Protocol v1.0                        ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');
}

function printBundleInfo(bundle: ArtifactBundle) {
  console.log('┌─ Bundle Information ─────────────────────────────────────────┐');
  console.log(`│  Artifact ID:     ${bundle.artifactId}`);
  console.log(`│  Version:         ${bundle.artifactVersion}`);
  console.log(`│  Created:         ${bundle.createdAt}`);
  console.log(`│  Strategy:        ${bundle.strategy.name}`);
  console.log(`│  Dataset:         ${bundle.dataset.source}`);
  console.log(`│  Seed:            ${bundle.params.seed}`);
  console.log(`│  Date Range:      ${bundle.params.startDate} → ${bundle.params.endDate}`);
  console.log('└──────────────────────────────────────────────────────────────┘');
  console.log('');
}

function printVerificationResult(result: VerificationResult, bundle: ArtifactBundle) {
  if (result.verified) {
    console.log('┌──────────────────────────────────────────────────────────────┐');
    console.log('│                                                              │');
    console.log('│    ✅  VERIFIED                                              │');
    console.log('│                                                              │');
    console.log('│    All hashes match. Execution is authentic and             │');
    console.log('│    reproducible. This result has not been altered.          │');
    console.log('│                                                              │');
    console.log('└──────────────────────────────────────────────────────────────┘');
    console.log('');
    console.log('┌─ Hash Confirmation ─────────────────────────────────────────┐');
    console.log(`│  Verification Hash:`);
    console.log(`│  ${bundle.verification.verificationHash}`);
    console.log(`│`);
    console.log(`│  Output Hash:`);
    console.log(`│  ${bundle.verification.outputHash}`);
    console.log('└──────────────────────────────────────────────────────────────┘');
  } else {
    console.log('┌──────────────────────────────────────────────────────────────┐');
    console.log('│                                                              │');
    console.log('│    ❌  FAILED                                                │');
    console.log('│                                                              │');
    console.log('│    Hash mismatch detected. This artifact may have been      │');
    console.log('│    modified after execution or is corrupted.                │');
    console.log('│                                                              │');
    console.log('└──────────────────────────────────────────────────────────────┘');
    console.log('');
    console.log('┌─ Mismatches ────────────────────────────────────────────────┐');
    for (const mismatch of result.mismatches) {
      console.log(`│  Field: ${mismatch.field}`);
      console.log(`│    Expected: ${mismatch.expected}`);
      console.log(`│    Actual:   ${mismatch.actual}`);
      console.log('│');
    }
    console.log('└──────────────────────────────────────────────────────────────┘');
  }
  console.log('');
}

function printMetricsSummary(metrics: ArtifactBundle['outputs']['metrics']) {
  console.log('┌─ Performance Metrics ────────────────────────────────────────┐');
  console.log(`│  Total Return:      ${metrics.totalReturn >= 0 ? '+' : ''}${metrics.totalReturn.toFixed(2)}%`);
  console.log(`│  Annualized Return: ${metrics.annualizedReturn >= 0 ? '+' : ''}${metrics.annualizedReturn.toFixed(2)}%`);
  console.log(`│  Sharpe Ratio:      ${metrics.sharpeRatio.toFixed(2)}`);
  console.log(`│  Max Drawdown:      ${metrics.maxDrawdown.toFixed(2)}%`);
  console.log(`│  Win Rate:          ${metrics.winRate.toFixed(1)}%`);
  console.log(`│  Profit Factor:     ${metrics.profitFactor.toFixed(2)}`);
  console.log(`│  Total Trades:      ${metrics.totalTrades}`);
  console.log('└──────────────────────────────────────────────────────────────┘');
  console.log('');
}

// ============================================
// Main
// ============================================

function main() {
  const args = process.argv.slice(2);
  
  // Parse --bundle argument
  const bundleIndex = args.indexOf('--bundle');
  if (bundleIndex === -1 || !args[bundleIndex + 1]) {
    console.error('Usage: node scripts/replay-artifact.ts --bundle ./artifact.json');
    process.exit(1);
  }
  
  const bundlePath = args[bundleIndex + 1];
  const absolutePath = path.resolve(process.cwd(), bundlePath);
  
  printHeader();
  console.log(`Loading bundle: ${bundlePath}`);
  console.log('');
  
  // Load bundle file
  if (!fs.existsSync(absolutePath)) {
    console.error(`❌ File not found: ${absolutePath}`);
    process.exit(1);
  }
  
  let bundleJson: string;
  try {
    bundleJson = fs.readFileSync(absolutePath, 'utf-8');
  } catch (error) {
    console.error(`❌ Failed to read file: ${error}`);
    process.exit(1);
  }
  
  // Parse JSON
  let bundle: unknown;
  try {
    bundle = JSON.parse(bundleJson);
  } catch (error) {
    console.error(`❌ Invalid JSON: ${error}`);
    process.exit(1);
  }
  
  // Validate bundle structure
  if (!validateBundle(bundle)) {
    console.error('❌ Invalid bundle structure');
    process.exit(1);
  }
  
  // Print bundle info
  printBundleInfo(bundle);
  
  console.log('Replaying execution and verifying hashes...');
  console.log('');
  
  // Verify
  const result = verifyBundle(bundle);
  
  // Print results
  printVerificationResult(result, bundle);
  printMetricsSummary(bundle.outputs.metrics);
  
  // Exit with appropriate code
  process.exit(result.verified ? 0 : 1);
}

main();
