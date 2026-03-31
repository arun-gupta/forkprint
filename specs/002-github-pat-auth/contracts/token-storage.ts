/**
 * Contract: Token Storage
 * P1-F02 — GitHub PAT Authentication
 *
 * Defines the public interface for reading and writing the GitHub token
 * from browser-local storage. This is the only place the storage key is defined.
 */

export const TOKEN_STORAGE_KEY = 'forkprint_github_token'

/** Read the stored token. Returns null if absent or storage is unavailable. */
export declare function readToken(): string | null

/** Persist a token. Trims whitespace; removes the key if value is empty. */
export declare function writeToken(value: string): void

/** Remove the stored token. */
export declare function clearToken(): void
