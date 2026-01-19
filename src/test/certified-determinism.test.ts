/**
 * Determinism Proof Test for Certified Execution
 * 
 * This test verifies that:
 * 1. Same inputs produce identical verificationHash
 * 2. Different seed produces different hash
 * 3. NexArt SDK is being used (not mock)
 */

import { describe, it, expect } from 'vitest';
import { 
  runCertifiedBacktest, 
  isNexArtAvailable, 
  getNexArtInfo 
} from '@/certified/engine';

const TEST_PARAMS = {
  strategyId: 'test-strategy',
  strategyHash: 'sha256:a7c9e3f2d8b4a1e6c5f9d2b8a3e7f4c1d9b5a2e8f6c3d7b1a4e9f5c2d8b3a6e7',
  datasetId: 'test-dataset',
  datasetHash: 'sha256:f2b8c4d1e9a7f5c3d8b2a6e1f4c9d5b7a3e8f2c6d1b9a4e7f3c8d2b5a1e6f9c4',
  startDate: '2023-01-01',
  endDate: '2023-12-31',
  seed: 42,
  parameters: { riskLevel: 'medium' },
};

describe('Certified Execution Determinism', () => {
  it('should have NexArt SDK available', () => {
    expect(isNexArtAvailable()).toBe(true);
  });

  it('should report correct NexArt SDK info', () => {
    const info = getNexArtInfo();
    expect(info.protocol).toBe('nexart');
    expect(info.sdkName).toBe('@nexart/codemode-sdk');
    expect(info.protocolVersion).toBeDefined();
  });

  it('should produce identical verificationHash for same inputs', async () => {
    // Run certified backtest twice with identical params
    const result1 = await runCertifiedBacktest(TEST_PARAMS);
    const result2 = await runCertifiedBacktest(TEST_PARAMS);

    // Verification hashes must be identical (determinism proof)
    expect(result1.verificationHash).toBe(result2.verificationHash);
    
    // Output metrics must be identical
    expect(result1.metrics.totalReturn).toBe(result2.metrics.totalReturn);
    expect(result1.metrics.sharpeRatio).toBe(result2.metrics.sharpeRatio);
    expect(result1.metrics.maxDrawdown).toBe(result2.metrics.maxDrawdown);
    
    // Equity curves must be identical
    expect(result1.equityCurve.length).toBe(result2.equityCurve.length);
    expect(result1.equityCurve[0].equity).toBe(result2.equityCurve[0].equity);
  });

  it('should produce different hash when seed changes by 1', async () => {
    const result1 = await runCertifiedBacktest(TEST_PARAMS);
    const result2 = await runCertifiedBacktest({
      ...TEST_PARAMS,
      seed: TEST_PARAMS.seed + 1, // Change seed by 1
    });

    // Hashes MUST be different
    expect(result1.verificationHash).not.toBe(result2.verificationHash);
    
    // Outputs should also differ
    expect(result1.metrics.totalReturn).not.toBe(result2.metrics.totalReturn);
  });

  it('should include NexArt metadata in certified results', async () => {
    const result = await runCertifiedBacktest(TEST_PARAMS);
    
    expect(result.nexartMetadata).toBeDefined();
    expect(result.nexartMetadata?.protocol).toBe('nexart');
    expect(result.nexartMetadata?.deterministic).toBe(true);
  });

  it('should mark result as sealed', async () => {
    const result = await runCertifiedBacktest(TEST_PARAMS);
    expect(result.sealed).toBe(true);
  });
});
