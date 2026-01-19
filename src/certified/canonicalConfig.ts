/**
 * Canonical Renderer URL Configuration
 * 
 * Resolution order:
 * 1. localStorage override (for runtime debugging/testing)
 * 2. VITE_CANONICAL_RENDERER_URL env var (if set and non-empty)
 * 3. Default Railway production URL
 * 
 * NO localhost fallback - hosted preview cannot reach localhost.
 */

const STORAGE_KEY = 'canonical_renderer_url';
const DEFAULT_CANONICAL_URL = 'https://nexart-canonical-renderer-production.up.railway.app';

/**
 * Get the resolved canonical renderer URL
 * Priority: localStorage > env var > default Railway URL
 */
export function getCanonicalUrl(): string {
  // 1. Check localStorage override
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && stored.trim()) {
      return stored.trim();
    }
  }

  // 2. Check env var
  const envUrl = import.meta.env.VITE_CANONICAL_RENDERER_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    return envUrl.trim();
  }

  // 3. Default to Railway production URL
  return DEFAULT_CANONICAL_URL;
}

/**
 * Set a runtime override for the canonical URL (stored in localStorage)
 */
export function setCanonicalUrl(url: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, url.trim());
  }
}

/**
 * Clear the localStorage override, reverting to env var or default
 */
export function clearCanonicalUrl(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
  }
}

/**
 * Check if a localStorage override is currently active
 */
export function hasLocalOverride(): boolean {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(STORAGE_KEY);
    return !!(stored && stored.trim());
  }
  return false;
}

/**
 * Get the default URL (for display purposes)
 */
export function getDefaultCanonicalUrl(): string {
  return DEFAULT_CANONICAL_URL;
}