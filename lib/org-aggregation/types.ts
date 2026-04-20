/**
 * Framework-agnostic types for the org-aggregation feature.
 *
 * Source of truth: specs/231-org-aggregation/contracts/org-aggregation-types.ts
 * This file re-exports the same shape for runtime use; keep in sync.
 *
 * MUST NOT import from react, next/*, or components/*.
 */

import type { AnalysisResult } from '@/lib/analyzer/analysis-result'

// --------------------------------------------------------------------
// Run-level types
// --------------------------------------------------------------------

export type RunStatus =
  | 'pre-run'
  | 'in-progress'
  | 'paused'
  | 'cancelled'
  | 'complete'

export type UpdateCadence =
  | { kind: 'per-completion' }
  | { kind: 'every-n-completions'; n: number }
  | { kind: 'every-n-percent'; percentStep: number }
  | { kind: 'on-completion-only' }

export interface OrgAggregationRun {
  org: string
  repos: string[]
  concurrency: number
  effectiveConcurrency: number
  updateCadence: UpdateCadence
  startedAt: Date
  status: RunStatus
  perRepo: Map<string, RepoRunState>
  pauseHistory: RateLimitPause[]
  notificationOptIn: boolean
  flagshipRepos: FlagshipMarker[]
}

// --------------------------------------------------------------------
// Per-repo types
// --------------------------------------------------------------------

export type RepoStatus = 'queued' | 'in-progress' | 'done' | 'failed'

export type RepoErrorKind =
  | 'rate-limit-primary'
  | 'rate-limit-secondary'
  | 'scope'
  | 'not-found'
  | 'transient'
  | 'other'

export interface RepoError {
  reason: string
  kind: RepoErrorKind
}

export interface RepoRunState {
  repo: string
  status: RepoStatus
  result?: AnalysisResult
  error?: RepoError
  startedAt?: Date
  finishedAt?: Date
}

// --------------------------------------------------------------------
// Rate-limit pause
// --------------------------------------------------------------------

export interface RateLimitPause {
  kind: 'primary' | 'secondary'
  detectedAt: Date
  resumesAt: Date
  reposReDispatched: string[]
  appliedConcurrencyAfterResume: number
}

// --------------------------------------------------------------------
// Flagship
// --------------------------------------------------------------------

export interface FlagshipMarker {
  repo: string
  source: 'pinned' | 'fallback-most-stars' | 'none'
  rank?: number
}

// --------------------------------------------------------------------
// Derived views
// --------------------------------------------------------------------

export interface RunStatusHeader {
  total: number
  succeeded: number
  failed: number
  inProgress: number
  queued: number
  elapsedMs: number
  etaMs: number | null
  concurrency: { chosen: number; effective: number }
  pause:
    | { kind: 'primary' | 'secondary'; resumesAt: Date; pausesSoFar: number }
    | null
  status: RunStatus
}

export interface PerRepoStatusEntry {
  repo: string
  status: RepoStatus
  badge: RepoStatus
  errorReason?: string
  isFlagship: boolean
  durationMs?: number
}

// --------------------------------------------------------------------
// Aggregate panels
// --------------------------------------------------------------------

export type PanelId =
  | 'contributor-diversity'
  | 'maintainers'
  | 'org-affiliations'
  | 'release-cadence'
  | 'security-rollup'
  | 'governance'
  | 'adopters'
  | 'project-footprint'
  | 'activity-rollup'
  | 'responsiveness-rollup'
  | 'license-consistency'
  | 'inclusive-naming-rollup'
  | 'documentation-coverage'
  | 'languages'
  | 'stale-work'
  | 'bus-factor'
  | 'repo-age'
  | 'inactive-repos'
  | 'org-recommendations'

export interface AggregatePanel<T> {
  panelId: PanelId
  contributingReposCount: number
  totalReposInRun: number
  status: 'in-progress' | 'final' | 'unavailable'
  value: T | null
  // Wall-clock time of the most recent repo completion that contributed
  // to this panel. Set by the view-model builder, not the aggregator
  // (aggregators have no timestamp data). Optional so fixtures may omit.
  lastUpdatedAt?: Date | null
}

// --------------------------------------------------------------------
// Missing-data (FR-033)
// --------------------------------------------------------------------

export type SignalKey =
  | 'commitCountsByAuthor'
  | 'maintainerCount'
  | 'commitCountsByExperimentalOrg'
  | 'releases12mo'
  | 'scorecard'
  | 'governanceMd'
  | 'adoptersMd'
  | 'stars'
  | 'forks'
  | 'watchers'
  | 'totalContributors'
  | 'commits12mo'
  | 'prsMerged12mo'
  | 'issuesClosed12mo'
  | 'issueFirstResponseMedian'
  | 'prMergeMedian'
  | 'license'
  | 'inclusiveNamingChecks'
  | 'documentationFiles'
  | 'primaryLanguage'
  | 'openIssues'
  | 'openPullRequests'
  | 'staleIssueRatio'
  | 'createdAt'
  | 'lastCommitAt'

export interface MissingDataEntry {
  repo: string
  signalKey: SignalKey
  reason: string
}

// --------------------------------------------------------------------
// Top-level Org Summary view-model
// --------------------------------------------------------------------

export type AggregatePanelMap = Partial<Record<PanelId, AggregatePanel<unknown>>>

export interface OrgSummaryViewModel {
  status: RunStatusHeader
  flagshipRepos: FlagshipMarker[]
  panels: AggregatePanelMap
  missingData: MissingDataEntry[]
  perRepoStatusList: PerRepoStatusEntry[]
}

// --------------------------------------------------------------------
// Queue events (consumed by useOrgAggregation hook)
// --------------------------------------------------------------------

export type QueueEvent =
  | { type: 'queued'; repo: string }
  | { type: 'started'; repo: string; startedAt: Date }
  | { type: 'done'; repo: string; result: AnalysisResult; finishedAt: Date }
  | { type: 'failed'; repo: string; error: RepoError; finishedAt: Date }
  | { type: 'paused'; pause: RateLimitPause }
  | { type: 'resumed'; resumedAt: Date; effectiveConcurrency: number }
  | { type: 'cancelled'; cancelledAt: Date }
  | { type: 'complete'; completedAt: Date }
