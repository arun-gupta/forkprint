import type { AnalysisResult } from '@/lib/analyzer/analysis-result'
import { contributorDiversityAggregator } from './aggregators/contributor-diversity'
import { composeMissingData, type PanelMissingRecord } from './missing-data'
import type {
  AggregatePanelMap,
  OrgAggregationRun,
  OrgSummaryViewModel,
  PerRepoStatusEntry,
  RunStatusHeader,
} from './types'

/**
 * Compute the run-status header from a run snapshot.
 *
 * Invariant: total = succeeded + failed + inProgress + queued.
 */
export function computeRunStatusHeader(
  run: OrgAggregationRun,
  now: number,
): RunStatusHeader {
  let succeeded = 0
  let failed = 0
  let inProgress = 0
  let queued = 0

  for (const [, s] of run.perRepo) {
    switch (s.status) {
      case 'done':
        succeeded++
        break
      case 'failed':
        failed++
        break
      case 'in-progress':
        inProgress++
        break
      case 'queued':
        queued++
        break
    }
  }

  // Repos that have been declared in run.repos but haven't been tracked in
  // perRepo yet are treated as queued (consistent with the queue's initial
  // state on construction).
  const tracked = succeeded + failed + inProgress + queued
  queued += Math.max(0, run.repos.length - tracked)

  const total = run.repos.length
  const elapsedMs = Math.max(0, now - run.startedAt.getTime())

  // ETA: once at least 2 repos are terminal, project remaining × mean per-repo time.
  let etaMs: number | null = null
  const terminalCount = succeeded + failed
  if (terminalCount >= 2 && run.effectiveConcurrency > 0) {
    const meanPerRepoMs = elapsedMs / terminalCount
    const remaining = queued + inProgress
    etaMs = Math.round((meanPerRepoMs * remaining) / run.effectiveConcurrency)
  }

  const lastPause = run.pauseHistory.at(-1)
  const pause =
    run.status === 'paused' && lastPause
      ? {
          kind: lastPause.kind,
          resumesAt: lastPause.resumesAt,
          pausesSoFar: run.pauseHistory.length,
        }
      : null

  return {
    total,
    succeeded,
    failed,
    inProgress,
    queued,
    elapsedMs,
    etaMs,
    concurrency: {
      chosen: run.concurrency,
      effective: run.effectiveConcurrency,
    },
    pause,
    status: run.status,
  }
}

/**
 * Build the full Org Summary view-model. MVP slice populates only the
 * contributor-diversity panel; US2 expands to the remaining 17 panels.
 */
export function buildOrgSummaryViewModel(
  run: OrgAggregationRun,
  now: number,
): OrgSummaryViewModel {
  const status = computeRunStatusHeader(run, now)

  const completedResults: AnalysisResult[] = []
  for (const [, s] of run.perRepo) {
    if (s.status === 'done' && s.result) completedResults.push(s.result)
  }

  const context = {
    totalReposInRun: run.repos.length,
    flagshipRepos: run.flagshipRepos,
    inactiveRepoWindowMonths: 12,
  }

  const panels: AggregatePanelMap = {
    'contributor-diversity': contributorDiversityAggregator(completedResults, context),
  }

  const missingRecords: PanelMissingRecord[] = []
  for (const [, s] of run.perRepo) {
    if (s.status !== 'done' || !s.result) continue
    const result = s.result as AnalysisResult & { commitCountsByAuthor?: unknown }
    if (result.commitCountsByAuthor === 'unavailable') {
      missingRecords.push({
        repo: s.repo,
        signalKey: 'commitCountsByAuthor',
        reason: 'commit author breakdown not available via GraphQL',
      })
    }
  }

  const flagshipSet = new Set(run.flagshipRepos.map((f) => f.repo))
  const perRepoStatusList: PerRepoStatusEntry[] = run.repos
    .slice()
    .sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }))
    .map<PerRepoStatusEntry>((repo) => {
      const s = run.perRepo.get(repo) ?? { repo, status: 'queued' as const }
      const durationMs =
        s.startedAt && s.finishedAt
          ? s.finishedAt.getTime() - s.startedAt.getTime()
          : undefined
      return {
        repo,
        status: s.status,
        badge: s.status,
        errorReason: s.error?.reason,
        isFlagship: flagshipSet.has(repo),
        durationMs,
      }
    })

  return {
    status,
    flagshipRepos: run.flagshipRepos,
    panels,
    missingData: composeMissingData(missingRecords),
    perRepoStatusList,
  }
}
