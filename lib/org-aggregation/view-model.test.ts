import { describe, expect, it } from 'vitest'
import type { AnalysisResult } from '@/lib/analyzer/analysis-result'
import { buildOrgSummaryViewModel, computeRunStatusHeader } from './view-model'
import type { OrgAggregationRun, RepoRunState } from './types'

function makeRun(overrides: Partial<OrgAggregationRun> = {}): OrgAggregationRun {
  return {
    org: 'test-org',
    repos: ['o/a', 'o/b', 'o/c'],
    concurrency: 3,
    effectiveConcurrency: 3,
    updateCadence: { kind: 'per-completion' },
    startedAt: new Date('2026-04-15T12:00:00Z'),
    status: 'in-progress',
    perRepo: new Map<string, RepoRunState>(),
    pauseHistory: [],
    notificationOptIn: false,
    flagshipRepos: [],
    ...overrides,
  }
}

function setRepoState(run: OrgAggregationRun, state: RepoRunState) {
  run.perRepo.set(state.repo, state)
}

function analysisStub(repo: string, commitCountsByAuthor: Record<string, number> | 'unavailable' = { alice: 10 }): AnalysisResult {
  return { repo, commitCountsByAuthor } as unknown as AnalysisResult
}

describe('computeRunStatusHeader', () => {
  it('counts repos across all four status categories (FR-017a)', () => {
    const run = makeRun()
    setRepoState(run, { repo: 'o/a', status: 'done', result: analysisStub('o/a') })
    setRepoState(run, { repo: 'o/b', status: 'in-progress' })
    setRepoState(run, { repo: 'o/c', status: 'queued' })

    const now = new Date('2026-04-15T12:00:30Z').getTime()
    const h = computeRunStatusHeader(run, now)
    expect(h.total).toBe(3)
    expect(h.succeeded).toBe(1)
    expect(h.failed).toBe(0)
    expect(h.inProgress).toBe(1)
    expect(h.queued).toBe(1)
    // invariant: total = succeeded + failed + inProgress + queued
    expect(h.total).toBe(h.succeeded + h.failed + h.inProgress + h.queued)
  })

  it('computes elapsedMs from startedAt', () => {
    const run = makeRun({ startedAt: new Date('2026-04-15T12:00:00Z') })
    const now = new Date('2026-04-15T12:00:10Z').getTime()
    const h = computeRunStatusHeader(run, now)
    expect(h.elapsedMs).toBe(10_000)
  })

  it('reports pause details when a pause exists', () => {
    const resumesAt = new Date('2026-04-15T13:00:00Z')
    const run = makeRun({
      status: 'paused',
      pauseHistory: [
        {
          kind: 'primary',
          detectedAt: new Date(),
          resumesAt,
          reposReDispatched: ['o/a'],
          appliedConcurrencyAfterResume: 3,
        },
      ],
    })
    const h = computeRunStatusHeader(run, Date.now())
    expect(h.pause?.kind).toBe('primary')
    expect(h.pause?.resumesAt).toEqual(resumesAt)
    expect(h.pause?.pausesSoFar).toBe(1)
  })
})

describe('buildOrgSummaryViewModel — MVP slice', () => {
  it('returns a per-repo status list sorted alphabetically with badges (FR-005a)', () => {
    const run = makeRun({ repos: ['o/zebra', 'o/apple', 'o/mango'] })
    setRepoState(run, { repo: 'o/zebra', status: 'done', result: analysisStub('o/zebra') })
    setRepoState(run, { repo: 'o/apple', status: 'in-progress' })
    setRepoState(run, { repo: 'o/mango', status: 'queued' })

    const vm = buildOrgSummaryViewModel(run, Date.now())
    expect(vm.perRepoStatusList.map((e) => e.repo)).toEqual(['o/apple', 'o/mango', 'o/zebra'])
    expect(vm.perRepoStatusList[0]).toMatchObject({ badge: 'in-progress' })
    expect(vm.perRepoStatusList[1]).toMatchObject({ badge: 'queued' })
    expect(vm.perRepoStatusList[2]).toMatchObject({ badge: 'done' })
  })

  it('populates the contributor-diversity panel from completed repos only', () => {
    const run = makeRun({ repos: ['o/a', 'o/b'] })
    setRepoState(run, {
      repo: 'o/a',
      status: 'done',
      result: analysisStub('o/a', { alice: 50, bob: 50 }),
    })
    setRepoState(run, { repo: 'o/b', status: 'in-progress' })

    const vm = buildOrgSummaryViewModel(run, Date.now())
    const panel = vm.panels['contributor-diversity']
    expect(panel?.status).toBe('final')
    expect(panel?.contributingReposCount).toBe(1)
  })

  it('marks isFlagship for repos in run.flagshipRepos', () => {
    const run = makeRun({
      repos: ['o/a', 'o/b'],
      flagshipRepos: [{ repo: 'o/a', source: 'pinned', rank: 0 }],
    })
    setRepoState(run, { repo: 'o/a', status: 'done', result: analysisStub('o/a') })
    setRepoState(run, { repo: 'o/b', status: 'done', result: analysisStub('o/b') })

    const vm = buildOrgSummaryViewModel(run, Date.now())
    const [apple, bravo] = vm.perRepoStatusList
    expect(apple?.isFlagship).toBe(true)
    expect(bravo?.isFlagship).toBe(false)
  })
})
