import type { AnalyzeResponse } from '@/lib/analyzer/analysis-result'

/**
 * Props for the ExportControls component.
 * All three export actions operate on the same analysisResponse snapshot.
 */
export interface ExportControlsProps {
  /**
   * The full analysis response to export.
   * When null, all export controls are disabled.
   */
  analysisResponse: AnalyzeResponse | null

  /**
   * The list of repo slugs that were analyzed (e.g. ["facebook/react"]).
   * Used to build the shareable URL query parameter.
   */
  analyzedRepos: string[]
}

/**
 * Return value of the JSON export utility function.
 */
export interface JsonExportResult {
  /** The Blob to trigger a browser download for */
  blob: Blob
  /** Suggested filename: repopulse-YYYY-MM-DD-HHmmss.json */
  filename: string
}

/**
 * Return value of the Markdown export utility function.
 */
export interface MarkdownExportResult {
  /** The Blob to trigger a browser download for */
  blob: Blob
  /** Suggested filename: repopulse-YYYY-MM-DD-HHmmss.md */
  filename: string
}

/**
 * Result of a clipboard copy attempt.
 */
export type ClipboardResult =
  | { ok: true }
  | { ok: false; fallbackUrl: string }
