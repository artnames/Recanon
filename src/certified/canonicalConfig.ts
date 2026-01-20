/**
 * Canonical Renderer Proxy Configuration
 * 
 * The browser NEVER calls the renderer directly.
 * All requests go through the secure proxy edge function.
 * 
 * The proxy URL is constructed from the Supabase project URL.
 */

/**
 * Get the proxy base URL for canonical renderer requests
 * Uses the Supabase edge function proxy
 */
export function getProxyUrl(): string {
  // Use the Supabase project URL to construct the edge function URL
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  
  if (supabaseUrl) {
    // Transform project URL to functions URL
    // e.g., https://fejsrcbbqxlopelhihmk.supabase.co -> https://fejsrcbbqxlopelhihmk.supabase.co/functions/v1/canonical-proxy
    return `${supabaseUrl}/functions/v1/canonical-proxy`;
  }
  
  // Fallback for development without Supabase
  console.warn('[Canonical Config] VITE_SUPABASE_URL not set, using hardcoded proxy URL');
  return 'https://fejsrcbbqxlopelhihmk.supabase.co/functions/v1/canonical-proxy';
}

/**
 * Check if proxy is configured
 */
export function isProxyConfigured(): boolean {
  return !!import.meta.env.VITE_SUPABASE_URL;
}

// ============================================================
// DEPRECATED: These functions are no longer used
// The renderer URL is now hidden behind the proxy
// ============================================================

const STORAGE_KEY = 'canonical_renderer_url';

/**
 * @deprecated No longer used - renderer URL is hidden
 */
export function getCanonicalUrl(): string {
  return getProxyUrl();
}

/**
 * @deprecated No longer used - cannot override proxy
 */
export function setCanonicalUrl(_url: string): void {
  console.warn('[Canonical Config] setCanonicalUrl is deprecated. The renderer URL is now protected behind a proxy.');
}

/**
 * @deprecated No longer used
 */
export function clearCanonicalUrl(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
  }
}

/**
 * @deprecated Always returns false - no local override possible
 */
export function hasLocalOverride(): boolean {
  return false;
}

/**
 * @deprecated No longer used
 */
export function getDefaultCanonicalUrl(): string {
  return getProxyUrl();
}
