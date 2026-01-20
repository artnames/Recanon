/**
 * Claim Bundle Schema
 * 
 * Portable JSON format for real-world claims with sealed verification.
 * Domain-agnostic: works for sports, finance, governance, science, etc.
 * 
 * Version: recanon.event.v1
 */

export const CLAIM_BUNDLE_VERSION = 'recanon.event.v1';

export type ClaimType = 'generic' | 'sports' | 'pnl';

// Generic claim details
export interface GenericClaimDetails {
  title: string;
  statement: string;
  eventDate: string;
  subject: string;
  notes: string;
}

// Sports-specific claim details
export interface SportsClaimDetails {
  competition: string;
  matchEvent: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  venue: string;
  eventDate: string;
  notes: string;
}

// P&L-specific claim details
export interface PnlClaimDetails {
  assetName: string;
  startBalance: number;
  endBalance: number;
  fees: number;
  periodStart: string;
  periodEnd: string;
  calculationMethod: 'simple' | 'percent' | 'cagr';
  notes: string;
}

export type ClaimDetails = GenericClaimDetails | SportsClaimDetails | PnlClaimDetails;

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
  claim: {
    type: ClaimType;
    // Standard fields for backwards compatibility
    title: string;
    statement: string;
    eventDate: string;
    subject: string;
    notes: string;
    // Template-specific details
    details: ClaimDetails;
  };
  sources: ClaimSource[];
  canonical: ClaimCanonical;
  snapshot: ClaimSnapshot;
  baseline: ClaimBaseline;
  check: ClaimCheck;
}

/**
 * Create an empty generic claim bundle with default values
 */
export function createEmptyClaimBundle(): ClaimBundle {
  return {
    bundleVersion: CLAIM_BUNDLE_VERSION,
    createdAt: '',
    mode: 'static',
    claim: {
      type: 'generic',
      title: '',
      statement: '',
      eventDate: '',
      subject: '',
      notes: '',
      details: {
        title: '',
        statement: '',
        eventDate: '',
        subject: '',
        notes: '',
      } as GenericClaimDetails,
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
 * Create empty sports claim details
 */
export function createEmptySportsDetails(): SportsClaimDetails {
  return {
    competition: '',
    matchEvent: '',
    homeTeam: '',
    awayTeam: '',
    homeScore: 0,
    awayScore: 0,
    venue: '',
    eventDate: '',
    notes: '',
  };
}

/**
 * Create empty P&L claim details
 */
export function createEmptyPnlDetails(): PnlClaimDetails {
  return {
    assetName: '',
    startBalance: 0,
    endBalance: 0,
    fees: 0,
    periodStart: '',
    periodEnd: '',
    calculationMethod: 'percent',
    notes: '',
  };
}

/**
 * Create empty generic claim details
 */
export function createEmptyGenericDetails(): GenericClaimDetails {
  return {
    title: '',
    statement: '',
    eventDate: '',
    subject: '',
    notes: '',
  };
}

/**
 * Generate title from sports details
 */
export function generateSportsTitle(details: SportsClaimDetails): string {
  if (!details.homeTeam || !details.awayTeam || !details.competition) return '';
  return `${details.homeTeam} vs ${details.awayTeam} — ${details.competition}`;
}

/**
 * Generate statement from sports details
 */
export function generateSportsStatement(details: SportsClaimDetails): string {
  if (!details.homeTeam || !details.awayTeam) return '';
  return `${details.homeTeam} ${details.homeScore}–${details.awayScore} ${details.awayTeam}`;
}

/**
 * Generate subject from sports details
 */
export function generateSportsSubject(details: SportsClaimDetails): string {
  if (!details.competition || !details.matchEvent) return details.competition || '';
  return `${details.competition} / ${details.matchEvent}`;
}

/**
 * Generate title from P&L details
 */
export function generatePnlTitle(details: PnlClaimDetails): string {
  if (!details.assetName) return '';
  return `${details.assetName} — P&L Statement`;
}

/**
 * Generate statement from P&L details
 */
export function generatePnlStatement(details: PnlClaimDetails): string {
  if (!details.assetName) return '';
  const profit = details.endBalance - details.startBalance - details.fees;
  const sign = profit >= 0 ? '+' : '';
  return `${details.assetName}: ${sign}$${profit.toFixed(2)} profit over period`;
}

/**
 * Calculate P&L metrics
 */
export function calculatePnlMetrics(details: PnlClaimDetails): {
  profit: number;
  returnPct: number;
  netBalance: number;
} {
  const profit = details.endBalance - details.startBalance - details.fees;
  const returnPct = details.startBalance > 0 
    ? (profit / details.startBalance) * 100 
    : 0;
  const netBalance = details.endBalance - details.fees;
  return { profit, returnPct, netBalance };
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
