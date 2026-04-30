'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth, type AuthSession } from './AuthContext'
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
    const scopesParam = params.get('scopes')

    if (token && username) {
      const scopes = scopesParam
        ? scopesParam
            .split(/[\s,]+/)
            .map((s) => s.trim())
            .filter(Boolean)
        : []
      signIn({ token, username, scopes })
      // Restore any query params saved before the OAuth redirect (e.g. ?repos=...)
      const savedSearch = sessionStorage.getItem('oauth_return_search') ?? ''
      sessionStorage.removeItem('oauth_return_search')
      if (savedSearch) {
        // Hard reload so useState initializers in RepoInputClient run with the
        // restored params — client-side router.replace doesn't re-run them.
        window.location.replace(`/${savedSearch}`)
      } else {
        router.replace('/', { scroll: false })
      }
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
          <Image
            src="/repo-pulse-banner.png"
            alt="RepoPulse"
            width={576}
            height={384}
            className="mx-auto h-16 w-auto rounded-xl shadow-lg sm:h-24"
          />
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

        <SignInButton />

        <a
          href="/demo"
          data-testid="demo-link"
          className="text-sm font-medium text-sky-700 underline-offset-2 hover:text-sky-800 hover:underline dark:text-sky-300 dark:hover:text-sky-200"
        >
          See an example without signing in →
        </a>

        <PATForm onSuccess={signIn} />

        <a href="/baseline" target="_blank" rel="noopener noreferrer" className="text-xs text-slate-400 transition hover:text-slate-600 dark:text-slate-500">View scoring methodology</a>
      </div>
    )
  }

  return <>{children}</>

}

function PATForm({ onSuccess }: { onSuccess: (session: AuthSession) => void }) {
  const [open, setOpen] = useState(false)
  const [pat, setPat] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function handleToggle() {
    setOpen((v) => !v)
    if (!open) setTimeout(() => inputRef.current?.focus(), 50)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = pat.trim()
    if (!trimmed) return
    setStatus('loading')
    setErrorMsg('')
    try {
      const res = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${trimmed}`,
          Accept: 'application/vnd.github+json',
        },
      })
      if (!res.ok) {
        setStatus('error')
        setErrorMsg(res.status === 401 ? 'Invalid token — check it and try again.' : `GitHub returned ${res.status}.`)
        return
      }
      const body = (await res.json()) as { login?: string }
      const username = body.login ?? 'unknown'
      const scopesHeader = res.headers.get('x-oauth-scopes') ?? ''
      const scopes = scopesHeader.split(',').map((s) => s.trim()).filter(Boolean)
      onSuccess({ token: trimmed, username, scopes, isPAT: true })
    } catch {
      setStatus('error')
      setErrorMsg('Network error — check your connection and try again.')
    }
  }

  return (
    <div className="w-full max-w-md text-center">
      <span className="group relative inline-block">
        <button
          type="button"
          onClick={handleToggle}
          className="text-xs text-slate-500 underline-offset-2 hover:text-slate-700 hover:underline dark:text-slate-400 dark:hover:text-slate-200"
          data-testid="pat-toggle"
        >
          {open ? 'Hide' : 'Use a Personal Access Token instead'}
        </button>
        {!open && (
          <span
            role="tooltip"
            className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-72 -translate-x-1/2 rounded-md border border-slate-200 bg-white px-3 py-2 text-left text-xs text-slate-600 opacity-0 shadow-md transition-opacity group-hover:opacity-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
          >
            Some GitHub organizations restrict which OAuth apps can access their data. A Personal Access Token bypasses those restrictions and can be granted <code className="font-mono text-[0.7rem]">read:org</code> scope for full member and admin counts.
          </span>
        )}
      </span>

      {open && (
        <form
          onSubmit={handleSubmit}
          className="mt-3 space-y-2 rounded-lg border border-slate-200 bg-white p-4 text-left dark:border-slate-700 dark:bg-slate-900"
          data-testid="pat-form"
        >
          <p className="text-xs text-slate-600 dark:text-slate-300">
            A PAT bypasses org-level OAuth app restrictions — useful when the org hasn&apos;t
            approved this app. Recommended scope:
          </p>
          <ul className="ml-3 space-y-0.5 text-xs text-slate-600 dark:text-slate-300">
            <li><code className="font-mono text-[11px]">read:org</code> — full member list, concealed admins</li>
          </ul>
          <a
            href="https://github.com/settings/tokens/new?scopes=read%3Aorg&description=RepoPulse"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-xs font-medium text-sky-700 hover:underline dark:text-sky-400"
          >
            Create a token on GitHub with these scopes →
          </a>
          <input
            ref={inputRef}
            type="password"
            value={pat}
            onChange={(e) => { setPat(e.target.value); setStatus('idle') }}
            placeholder="ghp_… or github_pat_…"
            autoComplete="off"
            spellCheck={false}
            className="w-full rounded border border-slate-300 bg-slate-50 px-3 py-1.5 font-mono text-xs text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500"
            data-testid="pat-input"
          />
          {status === 'error' && (
            <p className="text-xs text-rose-600 dark:text-rose-400" data-testid="pat-error">{errorMsg}</p>
          )}
          <button
            type="submit"
            disabled={!pat.trim() || status === 'loading'}
            className="w-full rounded bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-white"
            data-testid="pat-submit"
          >
            {status === 'loading' ? 'Verifying…' : 'Sign in with PAT'}
          </button>
        </form>
      )}
    </div>
  )
}

