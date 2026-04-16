'use client'

import { useCallback, useState } from 'react'

interface Props {
  enabled: boolean
  onChange: (enabled: boolean) => void
}

type PermissionState = 'default' | 'granted' | 'denied' | 'unsupported'

function getPermissionState(): PermissionState {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'
  return Notification.permission as PermissionState
}

export function NotificationToggle({ enabled, onChange }: Props) {
  const [permState, setPermState] = useState<PermissionState>(getPermissionState)

  const handleToggle = useCallback(async () => {
    if (enabled) {
      onChange(false)
      return
    }

    const state = getPermissionState()
    if (state === 'unsupported') return
    if (state === 'denied') {
      setPermState('denied')
      return
    }

    if (state === 'default') {
      try {
        const result = await Notification.requestPermission()
        setPermState(result as PermissionState)
        if (result === 'granted') {
          onChange(true)
        }
      } catch {
        setPermState('denied')
      }
      return
    }

    onChange(true)
  }, [enabled, onChange])

  if (permState === 'unsupported') return null

  return (
    <label className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
      <input
        type="checkbox"
        checked={enabled}
        onChange={() => void handleToggle()}
        aria-label="Enable completion notification"
      />
      <span>
        Notify
        {permState === 'denied' ? (
          <span className="ml-1 text-amber-600 dark:text-amber-400" title="Notifications blocked — re-enable in browser settings">
            (blocked)
          </span>
        ) : null}
      </span>
    </label>
  )
}
