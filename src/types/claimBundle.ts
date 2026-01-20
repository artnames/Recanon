/**
 * Claim Bundle Schema
 * 
 * Portable JSON format for real-world claims with sealed verification.
 * Domain-agnostic: works for sports, finance, governance, science, etc.
 * 
 * Version: recanon.event.v1
 */

export const CLAIM_BUNDLE_VERSION = 'recanon.event.v1';

export interface ClaimDetails {
  title: string;
  statement: string;
  eventDate: string; // ISO datetime
  subject: string;
  notes: string;
}

export interface ClaimSource {
  label: string;
  url: string;
  retrievedAt: string; // ISO datetime
  selectorOrEvidence: string;
}

export interface ClaimCanonical {
  via: 'proxy';
  protocol: string;
  protocolVersion: string;
}

export interface ClaimSnapshot {
  code: string;
  seed: number;
  vars: number[];
  execution: {
    frames: number;
    loop: boolean;
  };
}

export interface ClaimBaseline {
  posterHash: string;
  animationHash: string | null;
}

export interface ClaimCheck {
  lastCheckedAt: string;
  result: string;
}

export interface ClaimBundle {
  bundleVersion: string;
  createdAt: string;
  mode: 'static' | 'loop';
  claim: ClaimDetails;
  sources: ClaimSource[];
  canonical: ClaimCanonical;
  snapshot: ClaimSnapshot;
  baseline: ClaimBaseline;
  check: ClaimCheck;
}

/**
 * Create an empty claim bundle with default values
 */
export function createEmptyClaimBundle(): ClaimBundle {
  return {
    bundleVersion: CLAIM_BUNDLE_VERSION,
    createdAt: '',
    mode: 'static',
    claim: {
      title: '',
      statement: '',
      eventDate: '',
      subject: '',
      notes: '',
    },
    sources: [],
    canonical: {
      via: 'proxy',
      protocol: 'nexart',
      protocolVersion: '1.2.0',
    },
    snapshot: {
      code: '',
      seed: 12345,
      vars: [50, 50, 50, 50, 50, 50, 50, 50, 50, 50],
      execution: {
        frames: 1,
        loop: false,
      },
    },
    baseline: {
      posterHash: '',
      animationHash: null,
    },
    check: {
      lastCheckedAt: '',
      result: '',
    },
  };
}

/**
 * Serialize bundle to JSON string
 */
export function serializeClaimBundle(bundle: ClaimBundle): string {
  return JSON.stringify(bundle, null, 2);
}

/**
 * Download bundle as JSON file
 */
export function downloadClaimBundle(bundle: ClaimBundle): void {
  const json = serializeClaimBundle(bundle);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
  a.href = url;
  a.download = `recanon-bundle-${timestamp}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
