'use client'

import type { AnalyzeResponse } from '@/lib/analyzer/analysis-result'
import { buildJsonExport, triggerDownload } from '@/lib/export/json-export'
import { buildMarkdownExport } from '@/lib/export/markdown-export'

interface ExportControlsProps {
  analysisResponse: AnalyzeResponse | null
  analyzedRepos: string[]
}

export function ExportControls({ analysisResponse, analyzedRepos }: ExportControlsProps) {
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

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={handleDownloadJson}
        disabled={disabled}
        className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
      >
        Download JSON
      </button>

      <button
        type="button"
        onClick={handleDownloadMarkdown}
        disabled={disabled}
        className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
      >
        Download Markdown
      </button>
    </div>
  )
}
