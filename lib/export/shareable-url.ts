/**
 * Encodes a list of repo slugs into a shareable URL using the `?repos=` query parameter.
 * The OAuth token is never included.
 */
export function encodeRepos(repos: string[]): string {
  const base = typeof window !== 'undefined' ? window.location.origin : ''
  if (repos.length === 0) return base + '/'
  const params = new URLSearchParams({ repos: repos.join(',') })
  return `${base}/?${params.toString()}`
}

/**
 * Returns true for valid `owner/repo` slugs — exactly one `/` with non-empty
 * owner and repo segments. Silently rejects leading slashes, bare names, and
 * deeply-nested paths that would otherwise reach the analysis flow.
 */
export function isValidRepoSlug(slug: string): boolean {
  const slash = slug.indexOf('/')
  if (slash === -1 || slash !== slug.lastIndexOf('/')) return false
  return slash > 0 && slash < slug.length - 1
}

/**
 * Decodes the `?repos=` query parameter from a URL search string into a repos array.
 * Silently drops any token that does not match the `owner/repo` slug format.
 * Returns an empty array if the parameter is absent or empty.
 */
export function decodeRepos(search: string): string[] {
  const params = new URLSearchParams(search)
  const raw = params.get('repos')
  if (!raw) return []
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(isValidRepoSlug)
}

import type { FoundationTarget } from '@/lib/cncf-sandbox/types'

export interface FoundationUrlState {
  foundation: FoundationTarget
  input: string
}

/**
 * Encodes Foundation mode state as a shareable URL.
 * The OAuth token is never included.
 * Produces: /?mode=foundation&foundation=cncf-sandbox&input=owner%2Frepo
 */
export function encodeFoundationUrl(state: FoundationUrlState): string {
  const base = typeof window !== 'undefined' ? window.location.origin : ''
  const params = new URLSearchParams({
    mode: 'foundation',
    foundation: state.foundation,
    input: state.input,
  })
  return `${base}/?${params.toString()}`
}

/**
 * Decodes Foundation mode state from a URL search string.
 * Returns null if mode=foundation is not present.
 */
export function decodeFoundationUrl(search: string): FoundationUrlState | null {
  const params = new URLSearchParams(search)
  if (params.get('mode') !== 'foundation') return null
  const foundation = params.get('foundation') as FoundationTarget | null
  const input = params.get('input')
  if (!foundation || !input) return null
  return { foundation, input }
}
