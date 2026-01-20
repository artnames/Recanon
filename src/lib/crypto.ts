/**
 * Crypto utilities for deterministic fingerprinting
 */

/**
 * Generate a cryptographically secure random seed using crypto.getRandomValues
 * Falls back to Math.random if crypto is not available
 */
export function generateSecureRandomSeed(): number {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    // Ensure positive and within safe integer range (1 to 2,147,483,647)
    return (arr[0] % 2147483646) + 1;
  }
  // Fallback
  return Math.floor(Math.random() * 2147483646) + 1;
}

/**
 * Generate an array of 10 random vars (0-100)
 */
export function generateSecureRandomVars(): number[] {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const arr = new Uint8Array(10);
    crypto.getRandomValues(arr);
    return Array.from(arr).map(v => v % 101); // 0-100
  }
  // Fallback
  return Array.from({ length: 10 }, () => Math.floor(Math.random() * 101));
}

/**
 * Generate a unique claim ID using timestamp + random suffix
 */
export function generateNewClaimId(): string {
  const timestamp = Date.now().toString(36);
  const random = generateSecureRandomSeed().toString(36).slice(-4);
  return `claim_${timestamp}_${random}`;
}

/**
 * Compute SHA-256 hash of a string (async, uses SubtleCrypto)
 * Returns hex string prefixed with "sha256:"
 */
export async function sha256(input: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return `sha256:${hashHex}`;
  }
  // Fallback: simple djb2 hash (not cryptographic, but deterministic)
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash) + input.charCodeAt(i);
    hash = hash >>> 0; // Convert to unsigned 32-bit
  }
  return `djb2:${hash.toString(16).padStart(8, '0')}`;
}

/**
 * Compute SHA-256 hash synchronously using a simple algorithm
 * For quick display purposes (not cryptographically strong fallback)
 */
export function sha256Sync(input: string): string {
  // Simple hash for synchronous display - djb2 variant
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const combined = (4294967296 * (2097151 & h2)) + (h1 >>> 0);
  return `hash:${combined.toString(16).padStart(16, '0')}`;
}

/**
 * Compute a payload fingerprint for debugging
 * Format: sha256(code + '|' + seed + '|' + vars.join(',') + '|' + loop)
 */
export async function computePayloadFingerprint(
  code: string,
  seed: number,
  vars: number[],
  loop: boolean
): Promise<string> {
  const payload = `${code}|${seed}|${vars.join(',')}|${loop}`;
  return sha256(payload);
}

/**
 * Synchronous version of payload fingerprint for immediate display
 */
export function computePayloadFingerprintSync(
  code: string,
  seed: number,
  vars: number[],
  loop: boolean
): string {
  const payload = `${code}|${seed}|${vars.join(',')}|${loop}`;
  return sha256Sync(payload);
}
