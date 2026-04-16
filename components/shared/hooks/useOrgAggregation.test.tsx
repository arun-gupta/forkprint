import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { AnalysisResult } from '@/lib/analyzer/analysis-result'
import type { DispatchResult } from '@/lib/org-aggregation/queue'
import { useOrgAggregation } from './useOrgAggregation'

function stub(repo: string, commits: Record<string, number> = { alice: 10 }): AnalysisResult {
  return {
    repo,
    commitCountsByAuthor: commits,
    contributorMetricsByWindow: {
      90: { commitCountsByAuthor: commits },
    },
  } as unknown as AnalysisResult
}

describe('useOrgAggregation — start flow (US1)', () => {
  it('dispatches per-repo analyses and exposes the final view-model', async () => {
    const dispatch = vi.fn(async (repo: string) => ({
      kind: 'ok',
      result: stub(repo),
    }) as DispatchResult)

    const { result } = renderHook(() =>
      useOrgAggregation({
        dispatch,
        fetchPinned: async () => [],
        starsForRepo: () => 'unavailable',
      }),
    )

    await act(async () => {
      await result.current.start({ org: 'test', repos: ['o/a', 'o/b'] })
    })

    expect(dispatch).toHaveBeenCalledTimes(2)
    await waitFor(() => {
      expect(result.current.view?.status.status).toBe('complete')
      expect(result.current.view?.status.succeeded).toBe(2)
    })
    const panel = result.current.view?.panels['contributor-diversity']
    expect(panel?.status).toBe('final')
  })

  it('per-repo status list updates live as repos complete (FR-016a)', async () => {
    const deferred: Array<(r: DispatchResult) => void> = []
    const dispatch = vi.fn(
      (_repo: string) =>
        new Promise<DispatchResult>((resolve) => deferred.push(resolve)),
    )

    const { result } = renderHook(() =>
      useOrgAggregation({
        dispatch,
        fetchPinned: async () => [],
        starsForRepo: () => 'unavailable',
      }),
    )

    // Kick off the run without awaiting: queue.run() only resolves on `complete`,
    // so awaiting it here would block the test from observing intermediate state.
    // perRepoStatusList is sorted alphabetically by repo name; for ['o/a', 'o/b']
    // that matches input/dispatch order, so [0] = o/a (first dispatched) and
    // [1] = o/b (still queued under concurrency: 1).
    let startPromise!: Promise<void>
    await act(async () => {
      startPromise = result.current.start({
        org: 'test',
        repos: ['o/a', 'o/b'],
        concurrency: 1,
      })
      await waitFor(() => expect(deferred).toHaveLength(1))
    })

    await waitFor(() => {
      expect(result.current.view?.perRepoStatusList[0]?.status).toBe('in-progress')
      expect(result.current.view?.perRepoStatusList[1]?.status).toBe('queued')
    })

    await act(async () => {
      deferred[0]!({ kind: 'ok', result: stub('o/a') })
      await waitFor(() => expect(deferred).toHaveLength(2))
    })

    await waitFor(() => {
      expect(result.current.view?.perRepoStatusList[0]?.status).toBe('done')
      expect(result.current.view?.perRepoStatusList[1]?.status).toBe('in-progress')
    })

    await act(async () => {
      deferred[1]!({ kind: 'ok', result: stub('o/b') })
      await startPromise
    })

    await waitFor(() => {
      expect(result.current.view?.status.succeeded).toBe(2)
    })
  })

  it('a failed repo does not abort the run and surfaces errorReason', async () => {
    const dispatch = vi.fn(async (repo: string) => {
      if (repo === 'o/a') {
        return {
          kind: 'error',
          error: { reason: 'boom', kind: 'other' },
        } as DispatchResult
      }
      return { kind: 'ok', result: stub(repo) } as DispatchResult
    })

    const { result } = renderHook(() =>
      useOrgAggregation({
        dispatch,
        fetchPinned: async () => [],
        starsForRepo: () => 'unavailable',
      }),
    )

    await act(async () => {
      await result.current.start({ org: 'test', repos: ['o/a', 'o/b'] })
    })

    await waitFor(() => {
      expect(result.current.view?.status.succeeded).toBe(1)
      expect(result.current.view?.status.failed).toBe(1)
    })
    const failedEntry = result.current.view?.perRepoStatusList.find((e) => e.repo === 'o/a')
    expect(failedEntry?.errorReason).toBe('boom')
  })
})
