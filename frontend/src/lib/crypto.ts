/**
 * Cryptographic Utilities
 * SHA-256 hashing for credential files
 */

/**
 * Compute SHA-256 hash of a file
 * Uses Web Crypto API for browser-compatible hashing
 */
export async function computeFileHash(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  return hashHex
}

/**
 * Compute SHA-256 hash of ArrayBuffer
 */
export async function computeArrayBufferHash(arrayBuffer: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  return hashHex
}

/**
 * Compute SHA-256 hash from a URL (fetches file first)
 */
export async function computeUrlHash(url: string): Promise<string> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch file: ${response.statusText}`)
  }
  const arrayBuffer = await response.arrayBuffer()
  return computeArrayBufferHash(arrayBuffer)
}

/**
 * Compare two hashes (case-insensitive)
 */
export function compareHashes(hash1: string, hash2: string): boolean {
  return hash1.toLowerCase() === hash2.toLowerCase()
}
