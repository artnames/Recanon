/**
 * Dataset Registry Types
 * 
 * Datasets are immutable references, not raw data storage.
 * Each dataset has a SHA-256 hash that uniquely identifies the exact bytes.
 */

export type DatasetType = 'csv' | 'json' | 'api-snapshot' | 'onchain-snapshot';

export interface Dataset {
  /** Unique identifier (e.g., dataset-a7c9e3f2) */
  id: string;
  /** Human-readable name */
  name: string;
  /** Dataset type */
  type: DatasetType;
  /** SHA-256 hash of the dataset (normalized to sha256:<hex>) */
  hash: string;
  /** Source URL or description (optional) */
  source?: string;
  /** Normalization rules - explains what is hashed and how */
  normalizationNotes: string;
  /** Optional tags for filtering */
  tags?: string[];
  /** Registration timestamp */
  registeredAt: string;
  /** Status - always immutable for registered datasets */
  status: 'immutable';
}

export interface DatasetFormData {
  name: string;
  type: DatasetType;
  hash: string;
  source?: string;
  normalizationNotes: string;
  tags?: string[];
}

/**
 * Validate and normalize a hash string
 * Accepts: sha256:xxx or 64-char hex
 * Returns: sha256:xxx format or null if invalid
 */
export function normalizeHash(input: string): string | null {
  const trimmed = input.trim().toLowerCase();
  
  // Already has sha256: prefix
  if (trimmed.startsWith('sha256:')) {
    const hex = trimmed.slice(7);
    if (/^[a-f0-9]{64}$/.test(hex)) {
      return `sha256:${hex}`;
    }
    return null;
  }
  
  // Raw 64-char hex
  if (/^[a-f0-9]{64}$/.test(trimmed)) {
    return `sha256:${trimmed}`;
  }
  
  return null;
}

/**
 * Generate a dataset ID from hash
 */
export function generateDatasetId(hash: string): string {
  const hex = hash.replace('sha256:', '');
  return `dataset-${hex.slice(0, 8)}`;
}
