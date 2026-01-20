/**
 * Example data for Claim Studio
 * Provides realistic sample data for Sports and P&L claims
 */

import type { 
  SportsClaimDetails, 
  PnlClaimDetails, 
  ClaimSource 
} from '@/types/claimBundle';

export const SPORTS_EXAMPLE: {
  details: SportsClaimDetails;
  sources: ClaimSource[];
  seed: number;
  vars: number[];
} = {
  details: {
    competition: 'UEFA Champions League',
    matchEvent: 'Semi-final 2nd Leg',
    homeTeam: 'Manchester City',
    awayTeam: 'Real Madrid',
    homeScore: 4,
    awayScore: 0,
    venue: 'Etihad Stadium, Manchester',
    eventDate: '2024-05-17T20:00',
    notes: 'Aggregate: 5-1. City advances to final.',
  },
  sources: [
    {
      label: 'UEFA Official Match Report',
      url: 'https://www.uefa.com/uefachampionsleague/match/2038229/',
      retrievedAt: new Date().toISOString().slice(0, 16),
      selectorOrEvidence: 'Full-time score display',
    },
    {
      label: 'BBC Sport Coverage',
      url: 'https://www.bbc.com/sport/football/68529834',
      retrievedAt: new Date().toISOString().slice(0, 16),
      selectorOrEvidence: 'Match result and summary',
    },
  ],
  seed: 42,
  vars: [50, 65, 35, 70, 80, 45, 55, 40, 60, 50],
};

export const PNL_EXAMPLE: {
  details: PnlClaimDetails;
  sources: ClaimSource[];
  seed: number;
  vars: number[];
} = {
  details: {
    assetName: 'BTC Momentum Strategy',
    startBalance: 50000,
    endBalance: 68750,
    fees: 125.50,
    periodStart: '2024-01-01',
    periodEnd: '2024-06-30',
    calculationMethod: 'percent',
    notes: 'H1 2024 performance. Rebalanced monthly.',
  },
  sources: [
    {
      label: 'Brokerage Statement',
      url: 'https://broker.example.com/statements/2024-h1',
      retrievedAt: new Date().toISOString().slice(0, 16),
      selectorOrEvidence: 'Account summary page 1',
    },
    {
      label: 'Trade Execution Log',
      url: 'https://broker.example.com/trades/export/2024-h1.csv',
      retrievedAt: new Date().toISOString().slice(0, 16),
      selectorOrEvidence: 'CSV export with all executed trades',
    },
    {
      label: 'Fee Schedule',
      url: 'https://broker.example.com/fees',
      retrievedAt: new Date().toISOString().slice(0, 16),
      selectorOrEvidence: 'Commission and fee breakdown',
    },
  ],
  seed: 42,
  vars: [70, 40, 75, 60, 50, 55, 45, 65, 50, 50],
};
