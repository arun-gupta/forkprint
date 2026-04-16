'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from './AuthContext'
import { SignInButton } from './SignInButton'

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { session, signIn } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const authError = searchParams.get('auth_error')

  useEffect(() => {
    // Remove stale PAT key left by the pre-OAuth token-storage implementation
    localStorage.removeItem('forkprint_github_token')

    // Read token and username from URL fragment after OAuth callback
    if (typeof window === 'undefined') return
    const hash = window.location.hash
    if (!hash.startsWith('#')) return

    const params = new URLSearchParams(hash.slice(1))
    const token = params.get('token')
    const username = params.get('username')

    if (token && username) {
      signIn({ token, username })
      // Restore any query params saved before the OAuth redirect (e.g. ?repos=...)
      const savedSearch = sessionStorage.getItem('oauth_return_search') ?? ''
      sessionStorage.removeItem('oauth_return_search')
      router.replace(`/${savedSearch}`, { scroll: false })
    }
  }, [router, signIn])

  if (authError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6">
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Sign-in failed: {authError.replace(/_/g, ' ')}. Please try again.
        </p>
        <SignInButton />
      </div>
    )
  }

  if (!session) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-50 px-4 py-6 sm:gap-5">
        <div className="text-center">
          <img src="/repo-pulse-banner.png" alt="RepoPulse" className="mx-auto h-16 rounded-xl shadow-lg sm:h-24" />
          <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:mt-3 sm:text-3xl">RepoPulse</h1>
          <p className="mt-1 text-sm text-slate-600 sm:text-base">Know the real health of any open source project — in seconds</p>
        </div>

        <div className="max-w-lg space-y-3">
          <p className="text-center text-sm text-slate-600">
            A single <span className="font-semibold text-slate-800">OSS Health Score</span> from
            five dimensions — percentile-ranked against 2,400+ real GitHub repos.
          </p>

          <div className="flex flex-wrap justify-center gap-1.5">
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500">👥 Contributors</span>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500">⚡ Activity</span>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500">💬 Responsiveness</span>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500">📄 Documentation</span>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500">🔒 Security</span>
          </div>

          <p className="text-center text-xs font-medium text-slate-600">
            ✨ Plus tailored recommendations to improve each dimension
          </p>

          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-slate-500">
            <span>Compare up to 4 repos</span>
            <span className="text-slate-300">|</span>
            <span>Browse by org</span>
            <span className="text-slate-300">|</span>
            <span>Export JSON / Markdown</span>
          </div>
        </div>

        <SignInButton />

        <div className="max-w-md space-y-2 text-center">
          <p className="text-xs italic text-slate-400">
            Built for community-oriented projects. Solo-maintainer repos are auto-detected and
            scored on Activity, Security, and Documentation instead.
          </p>
          <a href="/baseline" target="_blank" rel="noopener noreferrer" className="text-xs text-slate-400 hover:text-slate-600 transition">View scoring methodology</a>
        </div>
      </div>
    )
  }

  return <>{children}</>

}
