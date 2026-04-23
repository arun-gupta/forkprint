'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

export const BASELINE_SCOPE = ''

export interface AuthSession {
  token: string
  username: string
  scopes?: readonly string[]
  isPAT?: boolean
}

interface AuthContextValue {
  session: AuthSession | null
  signIn: (session: AuthSession) => void
  signOut: () => void
  hasScope: (scope: string) => boolean
  elevatedScopes: readonly string[]
  bannerDismissed: boolean
  dismissBanner: () => void
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  signIn: () => {},
  signOut: () => {},
  hasScope: () => false,
  elevatedScopes: [],
  bannerDismissed: false,
  dismissBanner: () => {},
})

const STORAGE_KEY = 'repo_pulse_session'

function readStoredSession(): AuthSession | null {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
    return raw ? (JSON.parse(raw) as AuthSession) : null
  } catch {
    return null
  }
}

function writeStoredSession(session: AuthSession | null): void {
  try {
    if (session) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  } catch {}
}

function normalizeScopes(input: readonly string[] | undefined): readonly string[] {
  if (!input || input.length === 0) return [] as const
  return input
}

const ELEVATED_SCOPE_SET = new Set(['read:org', 'admin:org'])

export function getElevatedScopes(scopes: readonly string[] | undefined): readonly string[] {
  return (scopes ?? []).filter((s) => ELEVATED_SCOPE_SET.has(s))
}

export function AuthProvider({
  children,
  initialSession = null,
}: {
  children: React.ReactNode
  initialSession?: AuthSession | null
}) {
  const [session, setSession] = useState<AuthSession | null>(() => {
    if (initialSession) return { ...initialSession, scopes: normalizeScopes(initialSession.scopes) }
    const stored = readStoredSession()
    return stored ? { ...stored, scopes: normalizeScopes(stored.scopes) } : null
  })
  const [bannerDismissed, setBannerDismissed] = useState(false)

  const signIn = useCallback((newSession: AuthSession) => {
    const normalized = { ...newSession, scopes: normalizeScopes(newSession.scopes) }
    setSession(normalized)
    writeStoredSession(normalized)
    setBannerDismissed(false)
  }, [])

  const signOut = useCallback(() => {
    setSession(null)
    writeStoredSession(null)
    setBannerDismissed(false)
  }, [])

  // Sync sign-in / sign-out across tabs
  useEffect(() => {
    function handleStorage(e: StorageEvent) {
      if (e.key !== STORAGE_KEY) return
      if (!e.newValue) {
        setSession(null)
      } else {
        try {
          const stored = JSON.parse(e.newValue) as AuthSession
          setSession({ ...stored, scopes: normalizeScopes(stored.scopes) })
        } catch {}
      }
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  const hasScope = useCallback(
    (scope: string) => (session?.scopes ?? []).includes(scope),
    [session],
  )

  const dismissBanner = useCallback(() => {
    setBannerDismissed(true)
  }, [])

  const elevatedScopes = useMemo(
    () => getElevatedScopes(session?.scopes),
    [session],
  )

  const value = useMemo(
    () => ({ session, signIn, signOut, hasScope, elevatedScopes, bannerDismissed, dismissBanner }),
    [session, signIn, signOut, hasScope, elevatedScopes, bannerDismissed, dismissBanner],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
