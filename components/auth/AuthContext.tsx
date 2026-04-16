'use client'

import { createContext, useCallback, useContext, useMemo, useState } from 'react'

export interface AuthSession {
  token: string
  username: string
  scopes?: readonly string[]
}

interface AuthContextValue {
  session: AuthSession | null
  signIn: (session: AuthSession) => void
  signOut: () => void
  hasScope: (scope: string) => boolean
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  signIn: () => {},
  signOut: () => {},
  hasScope: () => false,
})

function normalizeScopes(input: readonly string[] | undefined): readonly string[] {
  if (!input || input.length === 0) return ['public_repo'] as const
  return input
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

  const signIn = useCallback((newSession: AuthSession) => {
    setSession({ ...newSession, scopes: normalizeScopes(newSession.scopes) })
  }, [])

  const signOut = useCallback(() => {
    setSession(null)
  }, [])

  const hasScope = useCallback(
    (scope: string) => (session?.scopes ?? []).includes(scope),
    [session],
  )

  const value = useMemo(
    () => ({ session, signIn, signOut, hasScope }),
    [session, signIn, signOut, hasScope],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
