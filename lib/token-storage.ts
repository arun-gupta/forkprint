export const TOKEN_STORAGE_KEY = 'forkprint_github_token'

export function readToken(): string | null {
  try {
    return window.localStorage.getItem(TOKEN_STORAGE_KEY)
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
  } catch {}
}

export function clearToken(): void {
  try {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY)
  } catch {}
}
