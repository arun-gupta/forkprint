'use client'

import { useState } from 'react'
import type { AnalyzeResponse } from '@/lib/analyzer/analysis-result'
import { buildJsonExport, triggerDownload } from '@/lib/export/json-export'
import { buildMarkdownExport } from '@/lib/export/markdown-export'
import { encodeRepos } from '@/lib/export/shareable-url'

interface ExportControlsProps {
  analysisResponse: AnalyzeResponse | null
  analyzedRepos: string[]
}

export function ExportControls({ analysisResponse, analyzedRepos }: ExportControlsProps) {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'fallback'>('idle')
  const [fallbackUrl, setFallbackUrl] = useState('')

  const disabled = !analysisResponse

  function handleDownloadJson() {
    if (!analysisResponse) return
    const result = buildJsonExport(analysisResponse)
    triggerDownload(result)
  }

  function handleDownloadMarkdown() {
    if (!analysisResponse) return
    const result = buildMarkdownExport(analysisResponse, analyzedRepos)
    triggerDownload(result)
  }

  async function handleCopyLink() {
    const url = encodeRepos(analyzedRepos)
    try {
      await navigator.clipboard.writeText(url)
      setCopyState('copied')
      setTimeout(() => setCopyState('idle'), 2000)
    } catch {
      setFallbackUrl(url)
      setCopyState('fallback')
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={handleDownloadJson}
        disabled={disabled}
        className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Download JSON
      </button>

      <button
        type="button"
        onClick={handleDownloadMarkdown}
        disabled={disabled}
        className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Download Markdown
      </button>

      <button
        type="button"
        onClick={() => { void handleCopyLink() }}
        className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
      >
        {copyState === 'copied' ? 'Copied!' : 'Copy link'}
      </button>

      {copyState === 'fallback' && fallbackUrl ? (
        <input
          type="text"
          readOnly
          value={fallbackUrl}
          aria-label="Shareable URL"
          className="flex-1 rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-700"
          onFocus={(e) => e.currentTarget.select()}
        />
      ) : null}
    </div>
  )
}
