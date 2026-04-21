'use client'

import { useAuth } from './AuthContext'

export function ElevatedScopeBanner() {
  const { session, elevatedScopes, bannerDismissed, dismissBanner, signOut } = useAuth()

  if (!session || elevatedScopes.length === 0 || bannerDismissed) return null

  const scopeList = elevatedScopes.join(', ')
  const isPAT = session.isPAT === true

  return (
    <div
      role="status"
      aria-label="Elevated GitHub permissions active"
      data-testid="elevated-scope-banner"
      className="w-full border-b border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-200"
    >
      <div className="mx-auto flex max-w-5xl items-start justify-between gap-3 px-4 py-2 text-xs sm:text-sm">
        <p className="min-w-0 flex-1">
          {isPAT ? (
            <>
              <span className="font-semibold">Personal Access Token active</span>
              {' — bypasses org OAuth app restrictions; can see concealed org admins and non-public org membership. Active scopes: '}
            </>
          ) : (
            <>
              <span className="font-semibold">Elevated GitHub permissions active</span>
              {' — this session can see concealed org admins and non-public org membership. Active scopes: '}
            </>
          )}
          <code
            data-testid="elevated-scope-banner-scopes"
            className="rounded bg-amber-100 px-1 py-0.5 font-mono text-[0.72rem] text-amber-900 dark:bg-amber-900/40 dark:text-amber-100"
          >
            {scopeList}
          </code>
          {'.'}
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={signOut}
            className="rounded border border-amber-400 bg-white/60 px-2 py-1 text-xs font-medium text-amber-900 transition hover:bg-white dark:border-amber-600 dark:bg-amber-900/40 dark:text-amber-100 dark:hover:bg-amber-900/70"
          >
            {isPAT ? 'Sign out' : 'Sign out to revert'}
          </button>
          <button
            type="button"
            onClick={dismissBanner}
            aria-label="Dismiss elevated permissions banner"
            className="inline-flex h-6 w-6 items-center justify-center rounded text-amber-800 transition hover:bg-amber-100 dark:text-amber-200 dark:hover:bg-amber-900/60"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
