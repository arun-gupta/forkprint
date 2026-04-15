import { describe, expect, it, vi } from 'vitest'
import type { AnalysisResult } from '@/lib/analyzer/analysis-result'
import { OrgAggregationQueue } from './queue'
import type { DispatchResult, QueueDispatcher } from './queue'
import type { QueueEvent, RateLimitPause } from './types'

function analysisStub(repo: string): AnalysisResult {
  return { repo } as unknown as AnalysisResult
}

function makeDispatcher(
  handlers: Record<string, () => Promise<DispatchResult>>,
): QueueDispatcher {
  return async (repo: string) => {
    const h = handlers[repo]
    if (!h) throw new Error(`no handler for ${repo}`)
    return h()
  }
}

function record(events: QueueEvent[]): (e: QueueEvent) => void {
  return (e) => events.push(e)
}

describe('OrgAggregationQueue — bounded concurrency and basic flow', () => {
  it('never has more than `concurrency` in flight', async () => {
    const repos = ['o/a', 'o/b', 'o/c', 'o/d', 'o/e']
    const inFlight: Record<string, boolean> = {}
    let peak = 0
    const handlers: Record<string, () => Promise<DispatchResult>> = {}
    for (const r of repos) {
      handlers[r] = async () => {
        inFlight[r] = true
        peak = Math.max(peak, Object.values(inFlight).filter(Boolean).length)
        await new Promise((res) => setTimeout(res, 5))
        inFlight[r] = false
        return { kind: 'ok', result: analysisStub(r) }
      }
    }
    const q = new OrgAggregationQueue({
      repos,
      concurrency: 2,
      dispatch: makeDispatcher(handlers),
    })
    await q.run()
    expect(peak).toBeLessThanOrEqual(2)
  })

  it('emits queued/started/done/complete events in the expected order for a happy path', async () => {
    const repos = ['o/a', 'o/b']
    const handlers = {
      'o/a': async () => ({ kind: 'ok', result: analysisStub('o/a') } as DispatchResult),
      'o/b': async () => ({ kind: 'ok', result: analysisStub('o/b') } as DispatchResult),
    }
    const events: QueueEvent[] = []
    const q = new OrgAggregationQueue({
      repos,
      concurrency: 1,
      dispatch: makeDispatcher(handlers),
      onEvent: record(events),
    })
    await q.run()
    const types = events.map((e) => e.type)
    expect(types.filter((t) => t === 'queued')).toHaveLength(2)
    expect(types.filter((t) => t === 'started')).toHaveLength(2)
    expect(types.filter((t) => t === 'done')).toHaveLength(2)
    expect(types.at(-1)).toBe('complete')
  })
})

describe('OrgAggregationQueue — per-repo failure isolation (FR-005 / §X.5)', () => {
  it('a single failed repo does not abort the run', async () => {
    const handlers = {
      'o/a': async () =>
        ({
          kind: 'error',
          error: { reason: 'boom', kind: 'other' },
        } as DispatchResult),
      'o/b': async () => ({ kind: 'ok', result: analysisStub('o/b') } as DispatchResult),
    }
    const events: QueueEvent[] = []
    const q = new OrgAggregationQueue({
      repos: ['o/a', 'o/b'],
      concurrency: 1,
      dispatch: makeDispatcher(handlers),
      onEvent: record(events),
    })
    await q.run()
    expect(events.some((e) => e.type === 'failed')).toBe(true)
    expect(events.some((e) => e.type === 'done' && e.repo === 'o/b')).toBe(true)
    expect(events.at(-1)?.type).toBe('complete')
  })
})

describe('OrgAggregationQueue — cancel (FR-031)', () => {
  it('cancel during run stops dispatch and emits cancelled', async () => {
    const handlers = {
      'o/a': async () => {
        await new Promise((res) => setTimeout(res, 20))
        return { kind: 'ok', result: analysisStub('o/a') } as DispatchResult
      },
      'o/b': async () => ({ kind: 'ok', result: analysisStub('o/b') } as DispatchResult),
      'o/c': async () => ({ kind: 'ok', result: analysisStub('o/c') } as DispatchResult),
    }
    const events: QueueEvent[] = []
    const q = new OrgAggregationQueue({
      repos: ['o/a', 'o/b', 'o/c'],
      concurrency: 1,
      dispatch: makeDispatcher(handlers),
      onEvent: record(events),
    })
    const runPromise = q.run()
    // Cancel before anything has a chance to complete
    q.cancel()
    await runPromise
    expect(events.some((e) => e.type === 'cancelled')).toBe(true)
    // No 'complete' event when cancelled
    expect(events.some((e) => e.type === 'complete')).toBe(false)
  })
})

describe('OrgAggregationQueue — retry (FR-035)', () => {
  it('retry(repo) re-enters a failed repo into the queue', async () => {
    let callCount = 0
    const handlers = {
      'o/a': async () => {
        callCount++
        if (callCount === 1) {
          return {
            kind: 'error',
            error: { reason: 'first time', kind: 'transient' },
          } as DispatchResult
        }
        return { kind: 'ok', result: analysisStub('o/a') } as DispatchResult
      },
    }
    const events: QueueEvent[] = []
    const q = new OrgAggregationQueue({
      repos: ['o/a'],
      concurrency: 1,
      dispatch: makeDispatcher(handlers),
      onEvent: record(events),
    })
    await q.run()
    expect(events.some((e) => e.type === 'failed' && e.repo === 'o/a')).toBe(true)

    events.length = 0
    await q.retry('o/a')
    expect(events.some((e) => e.type === 'done' && e.repo === 'o/a')).toBe(true)
  })
})

describe('OrgAggregationQueue — rate-limit pause/resume (FR-032)', () => {
  it('rate-limited response re-queues the repo and pauses dispatch', async () => {
    vi.useFakeTimers()
    const now = new Date('2026-04-15T12:00:00Z')
    vi.setSystemTime(now)

    const resumesAt = new Date(now.getTime() + 100)
    let aCalls = 0
    const handlers = {
      'o/a': async () => {
        aCalls++
        if (aCalls === 1) {
          return {
            kind: 'rate-limited',
            classification: { kind: 'primary', resumesAt },
          } as DispatchResult
        }
        return { kind: 'ok', result: analysisStub('o/a') } as DispatchResult
      },
    }

    const events: QueueEvent[] = []
    const q = new OrgAggregationQueue({
      repos: ['o/a'],
      concurrency: 1,
      dispatch: makeDispatcher(handlers),
      onEvent: record(events),
    })

    const runPromise = q.run()
    await vi.advanceTimersByTimeAsync(1)
    expect(events.some((e) => e.type === 'paused')).toBe(true)
    expect(events.some((e) => e.type === 'failed')).toBe(false)

    await vi.advanceTimersByTimeAsync(200)
    await runPromise

    expect(events.some((e) => e.type === 'resumed')).toBe(true)
    expect(events.some((e) => e.type === 'done' && e.repo === 'o/a')).toBe(true)
    vi.useRealTimers()
  })

  it('secondary rate-limit halves effective concurrency on resume (FR-003e)', async () => {
    vi.useFakeTimers()
    const now = new Date('2026-04-15T12:00:00Z')
    vi.setSystemTime(now)

    const resumesAt = new Date(now.getTime() + 50)
    let aCalls = 0
    const handlers = {
      'o/a': async () => {
        aCalls++
        if (aCalls === 1) {
          return {
            kind: 'rate-limited',
            classification: { kind: 'secondary', resumesAt },
          } as DispatchResult
        }
        return { kind: 'ok', result: analysisStub('o/a') } as DispatchResult
      },
    }

    const events: QueueEvent[] = []
    const q = new OrgAggregationQueue({
      repos: ['o/a'],
      concurrency: 4,
      dispatch: makeDispatcher(handlers),
      onEvent: record(events),
    })

    const runPromise = q.run()
    await vi.advanceTimersByTimeAsync(100)
    await runPromise

    const resumed = events.find((e) => e.type === 'resumed')
    expect(resumed).toBeDefined()
    if (resumed?.type === 'resumed') {
      expect(resumed.effectiveConcurrency).toBe(2) // halved from 4
    }
    vi.useRealTimers()
  })

  it('tracks pauses in pauseHistory (FR-032g)', async () => {
    vi.useFakeTimers()
    const now = new Date('2026-04-15T12:00:00Z')
    vi.setSystemTime(now)

    let aCalls = 0
    const handlers = {
      'o/a': async () => {
        aCalls++
        if (aCalls <= 2) {
          return {
            kind: 'rate-limited',
            classification: {
              kind: 'primary',
              resumesAt: new Date(Date.now() + 10),
            },
          } as DispatchResult
        }
        return { kind: 'ok', result: analysisStub('o/a') } as DispatchResult
      },
    }

    const q = new OrgAggregationQueue({
      repos: ['o/a'],
      concurrency: 1,
      dispatch: makeDispatcher(handlers),
    })

    const runPromise = q.run()
    await vi.advanceTimersByTimeAsync(100)
    await runPromise

    expect(q.getPauseHistory()).toHaveLength(2)
    vi.useRealTimers()
  })
})
