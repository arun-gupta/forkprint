'use client'

import { useEffect, useRef, useState } from 'react'

export function CopyLinkButton() {
  const [state, setState] = useState<'idle' | 'copied'>('idle')
  const resetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (resetTimeoutRef.current !== null) {
        clearTimeout(resetTimeoutRef.current)
        resetTimeoutRef.current = null
      }
    }
  }, [])

  async function handleCopy() {
    try {
      const url = new URL(window.location.href)
      url.hash = ''
      await navigator.clipboard.writeText(url.toString())
      setState('copied')

      if (resetTimeoutRef.current !== null) {
        clearTimeout(resetTimeoutRef.current)
      }
      resetTimeoutRef.current = setTimeout(() => {
        setState('idle')
        resetTimeoutRef.current = null
      }, 1500)
    } catch {
      // clipboard unavailable — silently ignore
    }
  }

  return (
    <button
      type="button"
      onClick={() => { void handleCopy() }}
      aria-label={state === 'copied' ? 'Copied!' : 'Copy link'}
      title={state === 'copied' ? 'Copied!' : 'Copy link'}
      className="inline-flex items-center justify-center rounded p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-slate-300"
    >
      {state === 'copied' ? (
        <svg aria-hidden="true" viewBox="0 0 16 16" className="h-4 w-4 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M3 8l3.5 3.5L13 4.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg aria-hidden="true" viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M6.5 9.5a3.535 3.535 0 0 0 5 0l2-2a3.535 3.535 0 0 0-5-5L7 4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M9.5 6.5a3.535 3.535 0 0 0-5 0l-2 2a3.535 3.535 0 0 0 5 5L9 12" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  )
}
