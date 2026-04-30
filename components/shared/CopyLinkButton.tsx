'use client'

import { useState } from 'react'

export function CopyLinkButton() {
  const [state, setState] = useState<'idle' | 'copied'>('idle')

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setState('copied')
      setTimeout(() => setState('idle'), 1500)
    } catch {
      // clipboard unavailable — silently ignore
    }
  }

  return (
    <button
      type="button"
      onClick={() => { void handleCopy() }}
      className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
    >
      {state === 'copied' ? (
        <>
          <svg aria-hidden="true" viewBox="0 0 16 16" className="h-3.5 w-3.5 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M3 8l3.5 3.5L13 4.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Copied!
        </>
      ) : (
        <>
          <svg aria-hidden="true" viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="5.5" y="5.5" width="8" height="8" rx="1" />
            <path d="M10.5 5.5V3.5a1 1 0 0 0-1-1h-6a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2" strokeLinecap="round" />
          </svg>
          Copy link
        </>
      )}
    </button>
  )
}
