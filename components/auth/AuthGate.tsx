'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from './AuthContext'
import { SignInButton, type ScopeTier } from './SignInButton'

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { session, signIn } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const authError = searchParams.get('auth_error')
  const [scopeTier, setScopeTier] = useState<ScopeTier>('baseline')

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
    const scopesParam = params.get('scopes')

    if (token && username) {
      const scopes = scopesParam
        ? scopesParam
            .split(/[\s,]+/)
            .map((s) => s.trim())
            .filter(Boolean)
        : ['public_repo']
      signIn({ token, username, scopes })
      // Restore any query params saved before the OAuth redirect (e.g. ?repos=...)
      const savedSearch = sessionStorage.getItem('oauth_return_search') ?? ''
      sessionStorage.removeItem('oauth_return_search')
      router.replace(`/${savedSearch}`, { scroll: false })
    }
  }, [router, signIn])

  if (authError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6">
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/20 dark:border-red-800/60 dark:text-red-200">
          Sign-in failed: {authError.replace(/_/g, ' ')}. Please try again.
        </p>
        <SignInButton />
      </div>
    )
  }

  if (!session) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-50 px-4 py-6 sm:gap-5 dark:bg-slate-800/60">
        <div className="text-center">
          <img src="/repo-pulse-banner.png" alt="RepoPulse" className="mx-auto h-16 rounded-xl shadow-lg sm:h-24" />
          <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:mt-3 sm:text-3xl dark:text-slate-100">RepoPulse</h1>
          <p className="mt-1 text-sm text-slate-600 sm:text-base dark:text-slate-300">Know the real health of any open source project — in seconds</p>
        </div>

        <div className="max-w-lg space-y-3">
          <p className="text-center text-sm text-slate-600 dark:text-slate-300">
            A single <span className="font-semibold text-slate-800 dark:text-slate-100">OSS Health Score</span> from
            five dimensions — percentile-ranked against 2,400+ real GitHub repos.
          </p>

          <div className="flex flex-wrap justify-center gap-1.5">
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-400">👥 Contributors</span>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-400">⚡ Activity</span>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-400">💬 Responsiveness</span>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-400">📄 Documentation</span>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-400">🔒 Security</span>
          </div>

          <p className="text-center text-xs font-medium text-slate-600 dark:text-slate-300">
            ✨ Plus tailored recommendations to improve each dimension
          </p>

          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
            <span>Compare up to 4 repos</span>
            <span className="text-slate-300 dark:text-slate-600">|</span>
            <span>Browse by org</span>
            <span className="text-slate-300 dark:text-slate-600">|</span>
            <span>Export JSON / Markdown</span>
          </div>
        </div>

        <SignInButton tier={scopeTier} />

        <fieldset
          className="max-w-md space-y-2 px-4 text-left text-xs text-slate-600 dark:text-slate-300"
          aria-label="GitHub permission scope"
        >
          <legend className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            GitHub permission
          </legend>
          <ScopeRadio
            value="baseline"
            checked={scopeTier === 'baseline'}
            onChange={setScopeTier}
            label={<><span className="font-semibold">Baseline</span> (<code>public_repo</code>)</>}
            guidance="Public data only. Recommended for read-only audits of third-party orgs."
          />
          <ScopeRadio
            value="read-org"
            checked={scopeTier === 'read-org'}
            onChange={setScopeTier}
            label={<><span className="font-semibold">Read org membership</span> (<code>read:org</code>)</>}
            guidance="See concealed admins of orgs you belong to. Choose this if you want the full Stale Admin panel for your own orgs."
          />
          <ScopeRadio
            value="admin-org"
            checked={scopeTier === 'admin-org'}
            onChange={setScopeTier}
            label={<><span className="font-semibold">Org admin (read)</span> (<code>admin:org</code>)</>}
            guidance="Includes everything above, plus owner-only org settings like 2FA enforcement. Broadest scope — choose only if you own the orgs you plan to audit."
          />
        </fieldset>

        <div className="max-w-md space-y-2 text-center">
          <p className="text-xs italic text-slate-400 dark:text-slate-500">
            Built for community-oriented projects. Solo-maintainer repos are auto-detected and
            scored on Activity, Security, and Documentation instead.
          </p>
          <a href="/baseline" target="_blank" rel="noopener noreferrer" className="text-xs text-slate-400 hover:text-slate-600 transition dark:text-slate-500">View scoring methodology</a>
        </div>
      </div>
    )
  }

  return <>{children}</>

}

function ScopeRadio({
  value,
  checked,
  onChange,
  label,
  guidance,
}: {
  value: ScopeTier
  checked: boolean
  onChange: (t: ScopeTier) => void
  label: React.ReactNode
  guidance: string
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2">
      <input
        type="radio"
        name="scope-tier"
        value={value}
        checked={checked}
        onChange={() => onChange(value)}
        className="mt-0.5 h-3.5 w-3.5 border-slate-300 dark:border-slate-600"
      />
      <span className="min-w-0">
        <span className="block">{label}</span>
        <span className="block text-[11px] text-slate-500 dark:text-slate-400">{guidance}</span>
      </span>
    </label>
  )
}
