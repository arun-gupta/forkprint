'use client'

import { useAuth } from './AuthContext'

interface UserBadgeProps {
  onSignOut?: () => void
}

export function UserBadge({ onSignOut }: UserBadgeProps) {
  const { session, signOut } = useAuth()

  function handleSignOut() {
    signOut()
    onSignOut?.()
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-slate-700">
        Signed in as <span className="font-medium text-slate-900">{session?.username}</span>
      </span>
      <button
        type="button"
        onClick={handleSignOut}
        className="text-xs text-slate-500 underline-offset-2 hover:text-slate-700 hover:underline"
      >
        Sign out
      </button>
    </div>
  )
}
