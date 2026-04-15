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
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-4 py-8 sm:gap-8">
        <div className="text-center">
          <img src="/repo-pulse-banner.png" alt="RepoPulse" className="mx-auto h-24 rounded-xl shadow-lg sm:h-40" />
          <h1 className="mt-4 text-2xl font-bold text-slate-900 sm:mt-6 sm:text-3xl">RepoPulse</h1>
          <p className="mt-1 text-base text-slate-600 sm:mt-2 sm:text-lg">Know the real health of any open source project — in seconds</p>
        </div>

        <div className="max-w-lg space-y-4">
          <p className="text-center text-sm text-slate-600">
            RepoPulse computes a single <span className="font-semibold text-slate-800">OSS Health Score</span> from
            five dimensions — scored as percentiles against 1,600+ real GitHub repositories in the same star bracket.
          </p>

          <div className="flex flex-wrap justify-center gap-1.5 sm:grid sm:grid-cols-2 sm:gap-2">
            <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700 sm:rounded-lg sm:px-3 sm:py-2">
              <p className="font-semibold uppercase tracking-wide text-slate-500">👥 Contributors</p>
              <p className="mt-0.5 hidden text-slate-600 sm:block">Contributor concentration, repeat and new contributor mix</p>
            </div>
            <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700 sm:rounded-lg sm:px-3 sm:py-2">
              <p className="font-semibold uppercase tracking-wide text-slate-500">⚡ Activity</p>
              <p className="mt-0.5 hidden text-slate-600 sm:block">PR throughput, issue flow, commit cadence, release frequency</p>
            </div>
            <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700 sm:rounded-lg sm:px-3 sm:py-2">
              <p className="font-semibold uppercase tracking-wide text-slate-500">💬 Responsiveness</p>
              <p className="mt-0.5 hidden text-slate-600 sm:block">Response times, resolution speed, backlog health</p>
            </div>
            <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700 sm:rounded-lg sm:px-3 sm:py-2">
              <p className="font-semibold uppercase tracking-wide text-slate-500">📄 Documentation</p>
              <p className="mt-0.5 hidden text-slate-600 sm:block">Key project files, README quality, licensing compliance, inclusive naming</p>
            </div>
            <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700 sm:col-span-2 sm:rounded-lg sm:px-3 sm:py-2">
              <p className="font-semibold uppercase tracking-wide text-slate-500">🔒 Security</p>
              <p className="mt-0.5 hidden text-slate-600 sm:block">OpenSSF Scorecard, dependency automation, branch protection</p>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-slate-500">
            <span>Compare up to 4 repos side-by-side</span>
            <span className="text-slate-300">|</span>
            <span>Browse repos by GitHub org</span>
            <span className="text-slate-300">|</span>
            <span>Export as JSON or Markdown</span>
          </div>

          <p className="text-center text-xs italic text-slate-500">
            Built for community-oriented projects — multi-contributor and foundation-track.
            Solo-maintainer projects will see sparse scores on Contributors and Responsiveness; a
            dedicated solo-project profile is{' '}
            <a
              href="https://github.com/arun-gupta/repo-pulse/issues/214"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-slate-700"
            >
              planned (#214)
            </a>
            .
          </p>
        </div>

        <SignInButton />
        <a href="/baseline" target="_blank" rel="noopener noreferrer" className="text-xs text-slate-400 hover:text-slate-600 transition">View scoring methodology</a>
      </div>
    )
  }

  return <>{children}</>

}
