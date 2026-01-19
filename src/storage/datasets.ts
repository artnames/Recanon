/**
 * Dataset Registry Storage (localStorage-backed)
 * 
 * Provides CRUD operations for the dataset registry.
 * Seeds example datasets on first load.
 */

import type { Dataset, DatasetFormData } from '@/types/dataset';
import { normalizeHash, generateDatasetId } from '@/types/dataset';

const STORAGE_KEY = 'recanon_datasets';
const SEEDED_KEY = 'recanon_datasets_seeded';

/**
 * Seed datasets - these match the ones used in BacktestExecutor
 */
const SEED_DATASETS: Dataset[] = [
  {
    id: 'dataset-a7c9e3f2',
    name: 'S&P 500 (2020-2024)',
    type: 'csv',
    hash: 'sha256:a7c9e3f2d8b4a1e6c5f9d2b8a3e7f4c1d9b5a2e8f6c3d7b1a4e9f5c2d8b3a6e7',
    source: 'Yahoo Finance API export',
    normalizationNotes: 'CSV with columns: date,open,high,low,close,volume. Sorted ascending by date. All values trimmed. Line endings normalized to LF. No BOM. UTF-8 encoded. Hash computed on raw bytes after normalization.',
    tags: ['equity', 'index', 'US'],
    registeredAt: '2024-01-15T10:00:00Z',
    status: 'immutable',
  },
  {
    id: 'dataset-f2b8c4d1',
    name: 'NASDAQ 100 (2018-2024)',
    type: 'csv',
    hash: 'sha256:f2b8c4d1e9a7f5c3d8b2a6e1f4c9d5b7a3e8f2c6d1b9a4e7f3c8d2b5a1e6f9c4',
    source: 'Refinitiv Eikon export',
    normalizationNotes: 'CSV with columns: date,open,high,low,close,adj_close,volume. Sorted ascending by date. Decimal precision: 4 places. Line endings normalized to LF. UTF-8 encoded. Hash computed on raw bytes.',
    tags: ['equity', 'index', 'US', 'tech'],
    registeredAt: '2024-01-15T10:05:00Z',
    status: 'immutable',
  },
  {
    id: 'dataset-c5d9a2e7',
    name: 'BTC/USD (2019-2024)',
    type: 'json',
    hash: 'sha256:c5d9a2e7f1b4c8d3a6e9f2b5c1d7a4e8f3b6c9d2a5e1f4b7c3d8a2e6f1b9c4d5',
    source: 'Binance REST API snapshot',
    normalizationNotes: 'JSON array of OHLCV candles. Keys sorted alphabetically. No whitespace. Numbers as strings with 8 decimal precision. Timestamps in milliseconds UTC. Hash computed on minified JSON bytes.',
    tags: ['crypto', 'btc', 'spot'],
    registeredAt: '2024-01-15T10:10:00Z',
    status: 'immutable',
  },
];

/**
 * Initialize storage with seed data if needed
 */
function ensureSeeded(): void {
  if (typeof window === 'undefined') return;
  
  const seeded = localStorage.getItem(SEEDED_KEY);
  if (seeded) return;
  
  // Check if storage is empty
  const existing = localStorage.getItem(STORAGE_KEY);
  if (!existing) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_DATASETS));
  }
  
  localStorage.setItem(SEEDED_KEY, 'true');
}

/**
 * Get all datasets from storage
 */
export function getAllDatasets(): Dataset[] {
  ensureSeeded();
  
  if (typeof window === 'undefined') return [];
  
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return [];
  
  try {
    return JSON.parse(stored) as Dataset[];
  } catch {
    return [];
  }
}

/**
 * Get a single dataset by ID
 */
export function getDatasetById(id: string): Dataset | null {
  const datasets = getAllDatasets();
  return datasets.find(d => d.id === id) || null;
}

/**
 * Get a single dataset by hash
 */
export function getDatasetByHash(hash: string): Dataset | null {
  const normalized = normalizeHash(hash);
  if (!normalized) return null;
  
  const datasets = getAllDatasets();
  return datasets.find(d => d.hash === normalized) || null;
}

/**
 * Register a new dataset
 */
export function registerDataset(data: DatasetFormData): Dataset | null {
  const normalizedHash = normalizeHash(data.hash);
  if (!normalizedHash) return null;
  
  // Check for duplicate hash
  const existing = getDatasetByHash(normalizedHash);
  if (existing) return null;
  
  const dataset: Dataset = {
    id: generateDatasetId(normalizedHash),
    name: data.name.trim(),
    type: data.type,
    hash: normalizedHash,
    source: data.source?.trim() || undefined,
    normalizationNotes: data.normalizationNotes.trim(),
    tags: data.tags?.filter(t => t.trim()) || undefined,
    registeredAt: new Date().toISOString(),
    status: 'immutable',
  };
  
  const datasets = getAllDatasets();
  datasets.push(dataset);
  
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(datasets));
  }
  
  return dataset;
}

/**
 * Delete a dataset by ID
 */
export function deleteDataset(id: string): boolean {
  const datasets = getAllDatasets();
  const filtered = datasets.filter(d => d.id !== id);
  
  if (filtered.length === datasets.length) return false;
  
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  }
  
  return true;
}

/**
 * Get datasets used by artifacts (stub - to be implemented when artifacts have datasetHash)
 */
export function getArtifactsUsingDataset(_datasetId: string): string[] {
  // TODO: Query artifact storage for artifacts referencing this dataset
  return [];
}
