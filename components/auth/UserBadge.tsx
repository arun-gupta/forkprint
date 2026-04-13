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
    <div className="flex items-center gap-2">
      <img
        src={`https://github.com/${session?.username}.png`}
        alt=""
        className="h-7 w-7 rounded-full border border-sky-600"
        aria-hidden="true"
      />
      <span className="text-xs font-medium text-white">{session?.username}</span>
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
