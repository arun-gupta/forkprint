import { describe, expect, it } from 'vitest'
import type { OrgSummaryViewModel } from '@/lib/org-aggregation/types'
import { buildOrgSummaryJsonExport } from './org-summary-json-export'

function baseView(): OrgSummaryViewModel {
  return {
    status: {
      total: 3, succeeded: 2, failed: 1, inProgress: 0, queued: 0,
      elapsedMs: 30_000, etaMs: null, concurrency: { chosen: 3, effective: 3 },
      pause: null, status: 'complete',
    },
    flagshipRepos: [{ repo: 'o/a', source: 'pinned', rank: 0 }],
    panels: {
      'contributor-diversity': {
        panelId: 'contributor-diversity', contributingReposCount: 2, totalReposInRun: 3,
        status: 'final', value: { defaultWindow: 90 },
      },
    },
    missingData: [{ repo: 'o/c', signalKey: 'commitCountsByAuthor', reason: 'analysis failed' }],
    perRepoStatusList: [
      { repo: 'o/a', status: 'done', badge: 'done', isFlagship: true, durationMs: 12_000 },
      { repo: 'o/b', status: 'done', badge: 'done', isFlagship: false, durationMs: 15_000 },
      { repo: 'o/c', status: 'failed', badge: 'failed', errorReason: 'not found', isFlagship: false },
    ],
  }
}

describe('buildOrgSummaryJsonExport', () => {
  it('produces a valid JSON blob that round-trips through JSON.parse', async () => {
    const { blob, filename } = buildOrgSummaryJsonExport('test-org', baseView())
    expect(blob.type).toBe('application/json')
    expect(filename).toMatch(/^repopulse-org-test-org-\d{4}-\d{2}-\d{2}-\d{6}\.json$/)
    const json = await blob.text()
    const parsed = JSON.parse(json)
    expect(parsed.org).toBe('test-org')
    expect(parsed.runStatus.total).toBe(3)
    expect(parsed.runStatus.succeeded).toBe(2)
  })

  it('includes all panels', async () => {
    const { blob } = buildOrgSummaryJsonExport('test-org', baseView())
    const parsed = JSON.parse(await blob.text())
    expect(parsed.panels['contributor-diversity']).toBeDefined()
    expect(parsed.panels['contributor-diversity'].status).toBe('final')
  })

  it('includes missing data and per-repo status', async () => {
    const { blob } = buildOrgSummaryJsonExport('test-org', baseView())
    const parsed = JSON.parse(await blob.text())
    expect(parsed.missingData).toHaveLength(1)
    expect(parsed.perRepoStatusList).toHaveLength(3)
    expect(parsed.perRepoStatusList[2].errorReason).toBe('not found')
  })
})
