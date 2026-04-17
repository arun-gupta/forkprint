'use client'

import { useAuth } from './AuthContext'

interface UserBadgeProps {
  onSignOut?: () => void
}

export function UserBadge({ onSignOut }: UserBadgeProps) {
  const { session, signOut, elevatedScopes } = useAuth()

  function handleSignOut() {
    signOut()
    onSignOut?.()
  }

  return (
    <div className="flex items-center gap-2">
      <img
        src={`https://github.com/${session?.username}.png`}
        alt=""
        className="h-7 w-7 rounded-full border border-sky-600"
        aria-hidden="true"
      />
      <span className="text-xs font-medium text-white">{session?.username}</span>
      {elevatedScopes.length > 0 ? (
        <span
          role="status"
          data-testid="elevated-scope-chip"
          aria-label={`Session has elevated GitHub permissions: ${elevatedScopes.join(', ')}`}
          title={`Elevated GitHub permissions active — active scopes: ${elevatedScopes.join(', ')}`}
          className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-amber-300 bg-amber-100 text-[0.7rem] font-semibold text-amber-900 dark:border-amber-600 dark:bg-amber-900/50 dark:text-amber-100"
        >
          <span aria-hidden="true">⚠</span>
        </span>
      ) : null}
      <button
        type="button"
        onClick={handleSignOut}
        className="ml-1 text-xs text-sky-300 underline-offset-2 hover:text-white hover:underline"
      >
        Sign out
      </button>
    </div>
  )
}
