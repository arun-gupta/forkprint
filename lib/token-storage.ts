export const TOKEN_STORAGE_KEY = 'repo_pulse_github_token'
export const LEGACY_TOKEN_STORAGE_KEY = 'forkprint_github_token'

export function readToken(): string | null {
  try {
    return window.localStorage.getItem(TOKEN_STORAGE_KEY) ?? window.localStorage.getItem(LEGACY_TOKEN_STORAGE_KEY)
  } catch {
    return null
  }
}

export function writeToken(value: string): void {
  const trimmed = value.trim()

  if (!trimmed) {
    clearToken()
    return
  }

  try {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, trimmed)
    window.localStorage.removeItem(LEGACY_TOKEN_STORAGE_KEY)
  } catch {}
}

export function clearToken(): void {
  try {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY)
    window.localStorage.removeItem(LEGACY_TOKEN_STORAGE_KEY)
  } catch {}
}
