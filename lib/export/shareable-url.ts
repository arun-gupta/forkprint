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
 * Decodes the `?repos=` query parameter from a URL search string into a repos array.
 * Returns an empty array if the parameter is absent or empty.
 */
export function decodeRepos(search: string): string[] {
  const params = new URLSearchParams(search)
  const raw = params.get('repos')
  if (!raw) return []
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}
