import type { AnalysisResult } from '@/lib/analyzer/analysis-result'
import { applySecondaryBackoff } from '@/lib/config/org-aggregation'
import type { RateLimitClassification } from './rate-limit'
import type {
  QueueEvent,
  RateLimitPause,
  RepoError,
  RepoRunState,
  RepoStatus,
} from './types'

/**
 * A single dispatcher result.
 *
 * - `ok`: analysis succeeded; queue marks the repo `done` and caches the result.
 * - `error`: a non-rate-limit failure; queue marks the repo `failed`.
 * - `rate-limited`: per FR-032c, queue re-queues the repo and pauses dispatch
 *   until `classification.resumesAt`. The failure is NOT counted against the
 *   failed total.
 */
export type DispatchResult =
  | { kind: 'ok'; result: AnalysisResult }
  | { kind: 'error'; error: RepoError }
  | { kind: 'rate-limited'; classification: RateLimitClassification }

export type QueueDispatcher = (repo: string) => Promise<DispatchResult>

export interface QueueOptions {
  repos: string[]
  concurrency: number
  dispatch: QueueDispatcher
  onEvent?: (event: QueueEvent) => void
}

/**
 * Promise-based concurrency-limited queue for org-aggregation runs.
 *
 * Per research R1, this is an in-house implementation rather than a dependency:
 * the pause/resume semantics and re-queue-without-fail behavior (FR-032c)
 * don't map cleanly to p-limit / p-queue.
 *
 * Framework-agnostic: no React / Next.js imports.
 */
export class OrgAggregationQueue {
  private readonly opts: QueueOptions
  private readonly state: Map<string, RepoRunState>
  private readonly pauseHistory: RateLimitPause[] = []

  private effectiveConcurrency: number
  private cancelled = false
  private activeCount = 0
  private pausedUntil: Date | null = null
  private runResolve: (() => void) | null = null

  constructor(opts: QueueOptions) {
    this.opts = opts
    this.effectiveConcurrency = opts.concurrency
    this.state = new Map(
      opts.repos.map((repo) => [repo, { repo, status: 'queued' as RepoStatus }]),
    )
    for (const repo of opts.repos) {
      this.emit({ type: 'queued', repo })
    }
  }

  getPauseHistory(): readonly RateLimitPause[] {
    return this.pauseHistory
  }

  getEffectiveConcurrency(): number {
    return this.effectiveConcurrency
  }

  run(): Promise<void> {
    return new Promise<void>((resolve) => {
      this.runResolve = resolve
      this.tryDispatch()
      this.checkCompletion()
    })
  }

  cancel(): void {
    if (this.cancelled) return
    this.cancelled = true
    this.emit({ type: 'cancelled', cancelledAt: new Date() })
    // Resolve the run; in-flight tasks will settle and their outcomes are ignored.
    this.finish()
  }

  async retry(repo: string): Promise<void> {
    const s = this.state.get(repo)
    if (!s || s.status !== 'failed') return
    s.status = 'queued'
    s.error = undefined
    s.startedAt = undefined
    s.finishedAt = undefined
    this.emit({ type: 'queued', repo })

    // Run a single isolated dispatch pass for this repo.
    await new Promise<void>((resolve) => {
      this.runResolve = resolve
      this.tryDispatch()
      this.checkCompletion()
    })
  }

  // --------------------------------------------------------------

  private tryDispatch(): void {
    if (this.cancelled) return
    if (this.pausedUntil) return

    while (this.activeCount < this.effectiveConcurrency) {
      const next = this.pickNextQueuedRepo()
      if (!next) return
      this.dispatchOne(next)
    }
  }

  private pickNextQueuedRepo(): string | null {
    for (const [repo, s] of this.state) {
      if (s.status === 'queued') return repo
    }
    return null
  }

  private dispatchOne(repo: string): void {
    const s = this.state.get(repo)!
    s.status = 'in-progress'
    s.startedAt = new Date()
    this.activeCount++
    this.emit({ type: 'started', repo, startedAt: s.startedAt })

    this.opts
      .dispatch(repo)
      .then((result) => this.handleResult(repo, result))
      .catch((err) => {
        this.handleResult(repo, {
          kind: 'error',
          error: {
            reason: err instanceof Error ? err.message : String(err),
            kind: 'other',
          },
        })
      })
  }

  private handleResult(repo: string, result: DispatchResult): void {
    this.activeCount--
    const s = this.state.get(repo)!

    if (this.cancelled) {
      // Ignore results once cancelled.
      return
    }

    if (result.kind === 'rate-limited') {
      // Per FR-032c: re-queue the repo, don't count as failure.
      s.status = 'queued'
      s.startedAt = undefined
      this.triggerPause(result.classification, [repo])
      return
    }

    if (result.kind === 'ok') {
      s.status = 'done'
      s.result = result.result
      s.finishedAt = new Date()
      this.emit({ type: 'done', repo, result: result.result, finishedAt: s.finishedAt })
    } else {
      s.status = 'failed'
      s.error = result.error
      s.finishedAt = new Date()
      this.emit({ type: 'failed', repo, error: result.error, finishedAt: s.finishedAt })
    }

    // Continue dispatching more work if possible.
    this.tryDispatch()
    this.checkCompletion()
  }

  private triggerPause(
    classification: RateLimitClassification,
    reposToReDispatch: string[],
  ): void {
    if (classification.kind === 'none') return
    const priorEffective = this.effectiveConcurrency
    const newEffective =
      classification.kind === 'secondary'
        ? applySecondaryBackoff(priorEffective)
        : priorEffective

    const pause: RateLimitPause = {
      kind: classification.kind,
      detectedAt: new Date(),
      resumesAt: classification.resumesAt,
      reposReDispatched: [...reposToReDispatch],
      appliedConcurrencyAfterResume: newEffective,
    }
    this.pauseHistory.push(pause)
    this.pausedUntil = classification.resumesAt
    this.emit({ type: 'paused', pause })

    const delay = Math.max(0, classification.resumesAt.getTime() - Date.now())
    setTimeout(() => {
      if (this.cancelled) return
      this.pausedUntil = null
      this.effectiveConcurrency = newEffective
      this.emit({
        type: 'resumed',
        resumedAt: new Date(),
        effectiveConcurrency: newEffective,
      })
      this.tryDispatch()
      this.checkCompletion()
    }, delay)
  }

  private checkCompletion(): void {
    if (this.cancelled) return
    if (this.pausedUntil) return
    if (this.activeCount > 0) return
    for (const [, s] of this.state) {
      if (s.status === 'queued' || s.status === 'in-progress') return
    }
    // All repos terminal and no in-flight work — complete.
    this.emit({ type: 'complete', completedAt: new Date() })
    this.finish()
  }

  private finish(): void {
    const r = this.runResolve
    this.runResolve = null
    if (r) r()
  }

  private emit(event: QueueEvent): void {
    this.opts.onEvent?.(event)
  }
}
