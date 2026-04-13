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
      <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-slate-50 px-4">
        <div className="text-center">
          <img src="/repo-pulse-banner.png" alt="RepoPulse" className="mx-auto h-40 rounded-xl shadow-lg" />
          <h1 className="mt-6 text-3xl font-bold text-slate-900">RepoPulse</h1>
          <p className="mt-2 text-lg text-slate-600">Measure the health of your open source projects</p>
        </div>
        <div className="max-w-md text-center text-sm text-slate-500 space-y-2">
          <p>Get percentile-based scores for <span className="font-medium text-slate-700">Activity</span>, <span className="font-medium text-slate-700">Responsiveness</span>, <span className="font-medium text-slate-700">Contributors</span>, <span className="font-medium text-slate-700">Security</span>, and <span className="font-medium text-slate-700">Documentation</span> — calibrated against 1,600+ real GitHub repositories.</p>
          <p>Analyze any public repo, compare side-by-side, and see exactly where it ranks.</p>
        </div>
        <SignInButton />
        <a href="/baseline" target="_blank" rel="noopener noreferrer" className="text-xs text-slate-400 hover:text-slate-600 transition">View scoring baseline</a>
      </div>
    )
  }

  return <>{children}</>

}
