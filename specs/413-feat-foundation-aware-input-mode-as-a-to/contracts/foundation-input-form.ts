import type { FoundationTarget } from '@/lib/cncf-sandbox/types'
import type { OrgInventoryResponse } from '@/lib/analyzer/org-inventory'
import type { AnalyzeResponse } from '@/lib/analyzer/analysis-result'

type FoundationResult =
  | { kind: 'repos'; results: AnalyzeResponse }
  | { kind: 'org'; inventory: OrgInventoryResponse }
  | { kind: 'projects-board'; url: string }
  | null

/**
 * Contract: FoundationInputForm
 *
 * Renders inside RepoInputForm when mode === 'foundation'.
 * Foundation picker + smart input field + tooltip.
 */
export interface FoundationInputFormProps {
  /** Currently selected foundation target */
  foundationTarget: FoundationTarget
  onFoundationTargetChange: (target: FoundationTarget) => void
  /** Raw input value (repos or org slug) */
  inputValue: string
  onInputChange: (value: string) => void
  /** Inline validation error, null if none */
  error: string | null
}

/**
 * Contract: FoundationResultsView
 *
 * Renders the Foundation mode result area.
 * Branches on result kind — per-repo readiness or org candidacy panel.
 */
export interface FoundationResultsViewProps {
  result: FoundationResult       // null = empty / not yet scanned
  loading: boolean
  error: string | null
  /** Called when user clicks "View full report" for a repo — navigates to Foundation URL */
  onViewFullReport?: (repo: string) => void
}

/**
 * Contract: FoundationNudge
 *
 * Callout shown in Org and Repositories result areas after a scan completes,
 * pointing users to Foundation mode with input pre-populated.
 */
export interface FoundationNudgeProps {
  /** Pre-populate Foundation mode with this value when nudge is clicked */
  prefillValue: string
  /** Label shown in the nudge (e.g. "Check CNCF Sandbox readiness for cncf") */
  label: string
  onActivate: (prefillValue: string) => void
}
