import { describe, expect, it } from 'vitest'
import type { OrgSummaryViewModel } from '@/lib/org-aggregation/types'
import { buildOrgSummaryMarkdownExport } from './org-summary-markdown-export'

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
      { repo: 'o/a', status: 'done', badge: 'done', isFlagship: true },
      { repo: 'o/b', status: 'done', badge: 'done', isFlagship: false },
      { repo: 'o/c', status: 'failed', badge: 'failed', errorReason: 'not found', isFlagship: false },
    ],
  }
}

describe('buildOrgSummaryMarkdownExport', () => {
  it('produces a markdown blob with correct filename', () => {
    const { blob, filename } = buildOrgSummaryMarkdownExport('test-org', baseView())
    expect(blob.type).toBe('text/markdown')
    expect(filename).toMatch(/^repopulse-org-test-org-\d{4}-\d{2}-\d{2}-\d{6}\.md$/)
  })

  it('includes header, run status, panels, missing data, per-repo status', async () => {
    const { blob } = buildOrgSummaryMarkdownExport('test-org', baseView())
    const text = await blob.text()
    expect(text).toContain('# RepoPulse Org Summary — test-org')
    expect(text).toContain('## Run Status')
    expect(text).toContain('| Total repos | 3 |')
    expect(text).toContain('## Flagship Repos')
    expect(text).toContain('o/a *(pinned)*')
    expect(text).toContain('### Contributor Diversity')
    expect(text).toContain('## Missing Data')
    expect(text).toContain('| o/c | commitCountsByAuthor | analysis failed |')
    expect(text).toContain('## Per-Repo Status')
    expect(text).toContain('| o/c | failed |  | not found |')
  })
})
