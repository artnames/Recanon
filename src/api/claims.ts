/**
 * Sealed Claims API
 * 
 * Data layer for storing and retrieving sealed claim bundles from Supabase.
 * Also provides local storage fallback for instant UX.
 */

import { supabase } from '@/integrations/supabase/client';
import type { ClaimBundle } from '@/types/claimBundle';
import type { Json } from '@/integrations/supabase/types';

// ============================================================
// TYPES
// ============================================================

export interface SealedClaimRow {
  id: string;
  created_at: string;
  bundle_version: string;
  mode: 'static' | 'loop';
  claim_type: string | null;
  title: string | null;
  statement: string | null;
  subject: string | null;
  event_date: string | null;
  poster_hash: string;
  animation_hash: string | null;
  sources: unknown;
  bundle_json: unknown; // JSON from DB, cast to ClaimBundle when needed
  keywords: string | null;
}

export interface SaveSealedClaimResult {
  id: string;
  poster_hash: string;
}

// ============================================================
// HASH NORMALIZATION
// ============================================================

const SHA256_PREFIX = 'sha256:';

/**
 * Normalize hash to always have sha256: prefix
 */
export function normalizeSha256(hash: string | null | undefined): string {
  if (!hash) return '';
  const trimmed = hash.trim();
  if (trimmed.startsWith(SHA256_PREFIX)) {
    return trimmed;
  }
  return `${SHA256_PREFIX}${trimmed}`;
}

/**
 * Strip sha256: prefix for storage/comparison
 */
export function stripSha256Prefix(hash: string): string {
  if (hash.startsWith(SHA256_PREFIX)) {
    return hash.slice(SHA256_PREFIX.length);
  }
  return hash;
}

// ============================================================
// LOCAL STORAGE CACHE
// ============================================================

const LOCAL_CLAIMS_KEY = 'recanon_local_claims';
const MAX_LOCAL_CLAIMS = 50;

interface LocalClaimEntry {
  id: string;
  posterHash: string;
  createdAt: string;
  bundle: ClaimBundle;
}

/**
 * Get local claims cache
 */
export function getLocalClaims(): LocalClaimEntry[] {
  try {
    const stored = localStorage.getItem(LOCAL_CLAIMS_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

/**
 * Save claim to local cache
 */
export function saveLocalClaim(entry: LocalClaimEntry): void {
  try {
    const claims = getLocalClaims();
    // Check if already exists by posterHash
    const existingIndex = claims.findIndex(c => c.posterHash === entry.posterHash);
    if (existingIndex >= 0) {
      claims[existingIndex] = entry; // Update
    } else {
      claims.unshift(entry); // Add to front
    }
    // Cap at max
    const capped = claims.slice(0, MAX_LOCAL_CLAIMS);
    localStorage.setItem(LOCAL_CLAIMS_KEY, JSON.stringify(capped));
  } catch (e) {
    console.warn('Failed to save local claim:', e);
  }
}

/**
 * Get local claim by ID
 */
export function getLocalClaimById(id: string): LocalClaimEntry | null {
  const claims = getLocalClaims();
  return claims.find(c => c.id === id) || null;
}

/**
 * Get local claim by poster hash
 */
export function getLocalClaimByHash(posterHash: string): LocalClaimEntry | null {
  const claims = getLocalClaims();
  const normalized = normalizeSha256(posterHash);
  const stripped = stripSha256Prefix(posterHash);
  return claims.find(c => 
    c.posterHash === normalized || 
    c.posterHash === stripped ||
    stripSha256Prefix(c.posterHash) === stripped
  ) || null;
}

// ============================================================
// SUPABASE API
// ============================================================

/**
 * Build keywords string for search
 */
function buildKeywords(bundle: ClaimBundle): string {
  const parts: string[] = [];
  
  if (bundle.claim.title) parts.push(bundle.claim.title);
  if (bundle.claim.statement) parts.push(bundle.claim.statement);
  if (bundle.claim.subject) parts.push(bundle.claim.subject);
  if (bundle.claim.notes) parts.push(bundle.claim.notes);
  
  // Add source labels and URLs
  bundle.sources?.forEach(source => {
    if (source.label) parts.push(source.label);
    if (source.url) parts.push(source.url);
  });
  
  // Add hash for search
  if (bundle.baseline.posterHash) {
    parts.push(stripSha256Prefix(bundle.baseline.posterHash));
  }
  
  return parts.join(' ').toLowerCase();
}

/**
 * Save a sealed claim bundle to Supabase
 */
export async function saveSealedClaim(bundle: ClaimBundle): Promise<SaveSealedClaimResult> {
  // Ensure hashes are normalized
  const normalizedBundle: ClaimBundle = {
    ...bundle,
    baseline: {
      posterHash: normalizeSha256(bundle.baseline.posterHash),
      animationHash: bundle.baseline.animationHash 
        ? normalizeSha256(bundle.baseline.animationHash) 
        : null,
    },
  };

  const posterHash = normalizedBundle.baseline.posterHash;
  
  // Build row data - cast to Json for Supabase
  const row = {
    bundle_version: bundle.bundleVersion,
    mode: bundle.mode,
    claim_type: bundle.claim.type || null,
    title: bundle.claim.title || null,
    statement: bundle.claim.statement || null,
    subject: bundle.claim.subject || null,
    event_date: bundle.claim.eventDate || null,
    poster_hash: posterHash,
    animation_hash: normalizedBundle.baseline.animationHash || null,
    sources: (bundle.sources || []) as unknown as Json,
    bundle_json: normalizedBundle as unknown as Json,
    keywords: buildKeywords(bundle),
  };

  const { data, error } = await supabase
    .from('sealed_claims')
    .insert([row])
    .select('id, poster_hash')
    .single();

  if (error) {
    // Check for duplicate hash
    if (error.code === '23505') {
      // Unique constraint violation - claim already exists
      const existing = await getSealedClaimByHash(posterHash);
      if (existing) {
        return { id: existing.id, poster_hash: existing.poster_hash };
      }
    }
    throw new Error(`Failed to save sealed claim: ${error.message}`);
  }

  // Also save locally for instant access
  saveLocalClaim({
    id: data.id,
    posterHash: data.poster_hash,
    createdAt: new Date().toISOString(),
    bundle: normalizedBundle,
  });

  return { id: data.id, poster_hash: data.poster_hash };
}

/**
 * List sealed claims with optional search filter
 */
export async function listSealedClaims(options?: { 
  q?: string; 
  limit?: number;
  offset?: number;
}): Promise<SealedClaimRow[]> {
  const { q, limit = 50, offset = 0 } = options || {};
  
  let query = supabase
    .from('sealed_claims')
    .select('*')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  // If search query, use text search or ILIKE
  if (q && q.trim()) {
    const searchTerm = `%${q.trim().toLowerCase()}%`;
    query = query.or(`title.ilike.${searchTerm},statement.ilike.${searchTerm},subject.ilike.${searchTerm},poster_hash.ilike.${searchTerm},keywords.ilike.${searchTerm}`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to list sealed claims:', error);
    throw new Error(`Failed to list sealed claims: ${error.message}`);
  }

  return (data || []) as SealedClaimRow[];
}

/**
 * Get a sealed claim by ID
 */
export async function getSealedClaimById(id: string): Promise<SealedClaimRow | null> {
  const { data, error } = await supabase
    .from('sealed_claims')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('Failed to get sealed claim by ID:', error);
    return null;
  }

  return data as SealedClaimRow | null;
}

/**
 * Get a sealed claim by poster hash
 */
export async function getSealedClaimByHash(posterHash: string): Promise<SealedClaimRow | null> {
  // Normalize the hash for search
  const normalized = normalizeSha256(posterHash);
  
  // Try with normalized version first
  let { data, error } = await supabase
    .from('sealed_claims')
    .select('*')
    .eq('poster_hash', normalized)
    .maybeSingle();

  if (error) {
    console.error('Failed to get sealed claim by hash:', error);
    return null;
  }

  if (!data) {
    // Try without prefix
    const stripped = stripSha256Prefix(posterHash);
    const result = await supabase
      .from('sealed_claims')
      .select('*')
      .eq('poster_hash', stripped)
      .maybeSingle();
    
    data = result.data;
  }

  return data as SealedClaimRow | null;
}

/**
 * Check if a claim with this poster hash already exists
 */
export async function claimExistsByHash(posterHash: string): Promise<boolean> {
  const claim = await getSealedClaimByHash(posterHash);
  return claim !== null;
}
