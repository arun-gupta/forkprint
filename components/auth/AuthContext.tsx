'use client'

import { createContext, useCallback, useContext, useMemo, useState } from 'react'

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
  const [session, setSession] = useState<AuthSession | null>(
    initialSession
      ? { ...initialSession, scopes: normalizeScopes(initialSession.scopes) }
      : null,
  )
  const [bannerDismissed, setBannerDismissed] = useState(false)

  const signIn = useCallback((newSession: AuthSession) => {
    setSession({ ...newSession, scopes: normalizeScopes(newSession.scopes) })
    setBannerDismissed(false)
  }, [])

  const signOut = useCallback(() => {
    setSession(null)
    setBannerDismissed(false)
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
