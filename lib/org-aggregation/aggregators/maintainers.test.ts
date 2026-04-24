import { describe, expect, it } from 'vitest'
import type { AnalysisResult } from '@/lib/analyzer/analysis-result'
import { maintainersAggregator } from './maintainers'
import { buildResult } from '@/lib/testing/fixtures'

function partialResult(repo: string, override: Partial<AnalysisResult> = {}): AnalysisResult {
  return buildResult({ repo, name: repo, ...override })
}

const CONTEXT = { totalReposInRun: 3, flagshipRepos: [], inactiveRepoWindowMonths: 12 }

describe('maintainersAggregator — FR-009', () => {
  it('typical: deduped project-wide union with per-repo breakdown', () => {
    const results = [
      partialResult('o/alpha', {
        maintainerTokens: [
          { token: 'alice', kind: 'user' },
          { token: 'bob', kind: 'user' },
        ],
      }),
      partialResult('o/bravo', {
        maintainerTokens: [
          { token: 'alice', kind: 'user' }, // dup across repos
          { token: 'carol', kind: 'user' },
        ],
      }),
      partialResult('o/charlie', {
        maintainerTokens: [{ token: 'kubernetes/sig-node', kind: 'team' }],
      }),
    ]
    const panel = maintainersAggregator(results, CONTEXT)
    expect(panel.status).toBe('final')
    expect(panel.contributingReposCount).toBe(3)
    expect(panel.value).not.toBeNull()

    const pw = panel.value!.projectWide
    const byToken = Object.fromEntries(pw.map((e) => [e.token, e]))
    expect(Object.keys(byToken).sort()).toEqual(['alice', 'bob', 'carol', 'kubernetes/sig-node'])
    // Deduped by token: alice appears in two repos.
    expect(byToken.alice.reposListed.sort()).toEqual(['o/alpha', 'o/bravo'])
    expect(byToken.alice.kind).toBe('user')
    expect(byToken['kubernetes/sig-node'].kind).toBe('team')
    expect(byToken['kubernetes/sig-node'].reposListed).toEqual(['o/charlie'])

    // Per-repo list preserves each repo's tokens (deduped within a repo).
    expect(panel.value!.perRepo).toHaveLength(3)
    const alpha = panel.value!.perRepo.find((r) => r.repo === 'o/alpha')
    expect(alpha?.tokens.map((t) => t.token).sort()).toEqual(['alice', 'bob'])
  })

  it('all-unavailable: every repo lacks maintainerTokens → panel is unavailable', () => {
    const results = [
      partialResult('o/alpha', { maintainerTokens: 'unavailable' }),
      partialResult('o/bravo', { maintainerTokens: 'unavailable' }),
    ]
    const panel = maintainersAggregator(results, { ...CONTEXT, totalReposInRun: 2 })
    expect(panel.status).toBe('unavailable')
    expect(panel.value).toBeNull()
    expect(panel.contributingReposCount).toBe(0)
  })

  it('mixed: unavailable repos are excluded but available ones still contribute', () => {
    const results = [
      partialResult('o/alpha', {
        maintainerTokens: [{ token: 'alice', kind: 'user' }],
      }),
      partialResult('o/bravo', { maintainerTokens: 'unavailable' }),
      partialResult('o/charlie', {
        maintainerTokens: [{ token: 'bob', kind: 'user' }],
      }),
    ]
    const panel = maintainersAggregator(results, CONTEXT)
    expect(panel.status).toBe('final')
    expect(panel.contributingReposCount).toBe(2)
    expect(panel.value!.projectWide.map((e) => e.token).sort()).toEqual(['alice', 'bob'])
    // Per-repo list only contains the repos that contributed tokens.
    expect(panel.value!.perRepo.map((r) => r.repo).sort()).toEqual(['o/alpha', 'o/charlie'])
  })

  it('empty: results array is empty → in-progress with null value', () => {
    const panel = maintainersAggregator([], { ...CONTEXT, totalReposInRun: 3 })
    expect(panel.status).toBe('in-progress')
    expect(panel.value).toBeNull()
    expect(panel.contributingReposCount).toBe(0)
  })

  it('team handles are stored verbatim and not expanded to member logins (FR-009)', () => {
    const results = [
      partialResult('o/alpha', {
        maintainerTokens: [
          { token: 'kubernetes/sig-node', kind: 'team' },
          { token: 'alice', kind: 'user' },
        ],
      }),
    ]
    const panel = maintainersAggregator(results, { ...CONTEXT, totalReposInRun: 1 })
    const teamEntry = panel.value!.projectWide.find((e) => e.token === 'kubernetes/sig-node')
    expect(teamEntry).toBeDefined()
    expect(teamEntry?.kind).toBe('team')
    // The aggregator MUST NOT explode `kubernetes/sig-node` into `kubernetes` and `sig-node`.
    expect(panel.value!.projectWide.map((e) => e.token)).not.toContain('sig-node')
    expect(panel.value!.projectWide.map((e) => e.token)).not.toContain('kubernetes')
  })

  it('deduplicates the same token appearing twice within a single repo', () => {
    const results = [
      partialResult('o/alpha', {
        maintainerTokens: [
          { token: 'alice', kind: 'user' },
          { token: 'alice', kind: 'user' },
        ],
      }),
    ]
    const panel = maintainersAggregator(results, { ...CONTEXT, totalReposInRun: 1 })
    expect(panel.value!.projectWide.find((e) => e.token === 'alice')?.reposListed).toEqual(['o/alpha'])
    const perRepoAlpha = panel.value!.perRepo.find((r) => r.repo === 'o/alpha')
    expect(perRepoAlpha?.tokens.filter((t) => t.token === 'alice')).toHaveLength(1)
  })
})
