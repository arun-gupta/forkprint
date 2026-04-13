import { describe, expect, it } from 'vitest'
import { buildMarkdownReport, buildMarkdownExport } from './markdown-export'
import type { AnalyzeResponse } from '@/lib/analyzer/analysis-result'

const RESULT_BASE = {
  name: 'react',
  description: 'A JavaScript library',
  createdAt: '2013-05-24T16:15:54Z',
  primaryLanguage: 'JavaScript',
  stars: 230000,
  forks: 47000,
  watchers: 6700,
  commits30d: 20,
  commits90d: 60,
  releases12mo: 10,
  prsOpened90d: 40,
  prsMerged90d: 35,
  issuesOpen: 800,
  issuesClosed90d: 120,
  uniqueCommitAuthors90d: 18,
  totalContributors: 1700,
  maintainerCount: 'unavailable' as const,
  commitCountsByAuthor: { alice: 30, bob: 20, carol: 10 },
  commitCountsByExperimentalOrg: {},
  experimentalAttributedAuthors90d: 3,
  experimentalUnattributedAuthors90d: 15,
  issueFirstResponseTimestamps: [],
  issueCloseTimestamps: [],
  prMergeTimestamps: [],
  documentationResult: 'unavailable',
    defaultBranchName: 'main',
    topics: [],
    inclusiveNamingResult: {
      defaultBranchName: 'main',
      branchCheck: { checkType: 'branch', term: 'main', passed: true, tier: null, severity: null, replacements: [], context: null },
      metadataChecks: [],
    },
    missingFields: [],
}

const MINIMAL_RESPONSE: AnalyzeResponse = {
  results: [{ repo: 'facebook/react', ...RESULT_BASE }],
  failures: [],
  rateLimit: null,
}

describe('buildMarkdownReport', () => {
  it('includes a top-level heading', () => {
    const md = buildMarkdownReport(MINIMAL_RESPONSE)
    expect(md).toContain('# RepoPulse Health Report')
  })

  it('includes a generated timestamp', () => {
    const md = buildMarkdownReport(MINIMAL_RESPONSE)
    expect(md).toMatch(/\*\*Generated:\*\* \d{4}-\d{2}-\d{2}T/)
  })

  it('has one ## section per analyzed repo', () => {
    const md = buildMarkdownReport(MINIMAL_RESPONSE)
    expect(md).toContain('## facebook/react')
  })

  it('includes Overview, Contributors, Activity, and Responsiveness sections in tab order', () => {
    const md = buildMarkdownReport(MINIMAL_RESPONSE)
    expect(md).toContain('### Overview')
    expect(md).toContain('### Contributors')
    expect(md).toContain('### Activity')
    expect(md).toContain('### Responsiveness')
    const overviewPos = md.indexOf('### Overview')
    const contributorsPos = md.indexOf('### Contributors')
    const activityPos = md.indexOf('### Activity')
    const responsivenessPos = md.indexOf('### Responsiveness')
    expect(overviewPos).toBeLessThan(contributorsPos)
    expect(contributorsPos).toBeLessThan(activityPos)
    expect(activityPos).toBeLessThan(responsivenessPos)
  })

  it('includes detailed activity metrics', () => {
    const md = buildMarkdownReport(MINIMAL_RESPONSE)
    expect(md).toContain('Commits (30 days)')
    expect(md).toContain('Commits (90 days)')
    expect(md).toContain('PR merge rate')
    expect(md).toContain('Issue closure rate')
    expect(md).toContain('Median time to merge')
    expect(md).toContain('Releases (12 months)')
  })

  it('includes detailed sustainability metrics', () => {
    const md = buildMarkdownReport(MINIMAL_RESPONSE)
    expect(md).toContain('Total contributors')
    expect(md).toContain('Unique commit authors')
    expect(md).toContain('Repeat contributors (90 days)')
    expect(md).toContain('New contributors (90 days)')
    expect(md).toContain('Top 20% contributor share')
    expect(md).toContain('Types of contributions')
  })

  it('includes experimental contributor metrics when org attribution is available', () => {
    const response: AnalyzeResponse = {
      ...MINIMAL_RESPONSE,
      results: [
        {
          repo: 'facebook/react',
          ...RESULT_BASE,
          contributorMetricsByWindow: {
            30: { uniqueCommitAuthors: 3, commitCountsByAuthor: { alice: 30, bob: 20 }, repeatContributors: 2, newContributors: 1, commitCountsByExperimentalOrg: { meta: 30, openai: 20 }, experimentalAttributedAuthors: 2, experimentalUnattributedAuthors: 1 },
            60: { uniqueCommitAuthors: 3, commitCountsByAuthor: { alice: 30, bob: 20 }, repeatContributors: 2, newContributors: 1, commitCountsByExperimentalOrg: { meta: 30, openai: 20 }, experimentalAttributedAuthors: 2, experimentalUnattributedAuthors: 1 },
            90: { uniqueCommitAuthors: 3, commitCountsByAuthor: { alice: 30, bob: 20 }, repeatContributors: 2, newContributors: 1, commitCountsByExperimentalOrg: { meta: 30, openai: 20 }, experimentalAttributedAuthors: 2, experimentalUnattributedAuthors: 1 },
            180: { uniqueCommitAuthors: 3, commitCountsByAuthor: { alice: 30, bob: 20 }, repeatContributors: 2, newContributors: 1, commitCountsByExperimentalOrg: { meta: 30, openai: 20 }, experimentalAttributedAuthors: 2, experimentalUnattributedAuthors: 1 },
            365: { uniqueCommitAuthors: 3, commitCountsByAuthor: { alice: 30, bob: 20 }, repeatContributors: 2, newContributors: 1, commitCountsByExperimentalOrg: { meta: 30, openai: 20 }, experimentalAttributedAuthors: 2, experimentalUnattributedAuthors: 1 },
          },
        },
      ],
    }
    const md = buildMarkdownReport(response)
    expect(md).toContain('Elephant Factor')
    expect(md).toContain('Single-vendor dependency ratio')
    expect(md).toContain('Experimental (heuristic org attribution)')
  })

  it('includes all responsiveness panes', () => {
    const md = buildMarkdownReport(MINIMAL_RESPONSE)
    expect(md).toContain('Issue & PR response time')
    expect(md).toContain('Resolution metrics')
    expect(md).toContain('Maintainer activity signals')
    expect(md).toContain('Volume & backlog health')
    expect(md).toContain('Engagement quality signals')
  })

  it('includes a Health Ratios section with category sub-headings', () => {
    const md = buildMarkdownReport(MINIMAL_RESPONSE)
    expect(md).toContain('### Health Ratios')
    expect(md).toContain('#### Overview')
    expect(md).toContain('#### Activity')
  })

  it('includes detailed repo metadata', () => {
    const md = buildMarkdownReport(MINIMAL_RESPONSE)
    expect(md).toContain('Forks')
    expect(md).toContain('Watchers')
  })

  it('renders "unavailable" values as —', () => {
    const response: AnalyzeResponse = {
      ...MINIMAL_RESPONSE,
      results: [{ repo: 'foo/bar', ...RESULT_BASE, stars: 'unavailable', primaryLanguage: 'unavailable' }],
    }
    const md = buildMarkdownReport(response)
    expect(md).toContain('—')
    expect(md).not.toContain(': unavailable')
    expect(md).not.toContain('N/A')
  })

  it('produces one section per repo when multiple repos analyzed', () => {
    const response: AnalyzeResponse = {
      ...MINIMAL_RESPONSE,
      results: [
        { repo: 'facebook/react', ...RESULT_BASE },
        { repo: 'vercel/next.js', ...RESULT_BASE, name: 'next.js' },
      ],
    }
    const md = buildMarkdownReport(response)
    expect(md).toContain('## facebook/react')
    expect(md).toContain('## vercel/next.js')
  })

  it('omits a Comparison section for a single repo', () => {
    const md = buildMarkdownReport(MINIMAL_RESPONSE)
    expect(md).not.toContain('## Comparison')
  })

  it('includes a Comparison section when 2+ repos are analyzed', () => {
    const response: AnalyzeResponse = {
      ...MINIMAL_RESPONSE,
      results: [
        { repo: 'facebook/react', ...RESULT_BASE },
        { repo: 'vercel/next.js', ...RESULT_BASE, name: 'next.js' },
      ],
    }
    const md = buildMarkdownReport(response)
    expect(md).toContain('## Comparison')
  })

  it('comparison section includes per-attribute table rows with median', () => {
    const response: AnalyzeResponse = {
      ...MINIMAL_RESPONSE,
      results: [
        { repo: 'facebook/react', ...RESULT_BASE },
        { repo: 'vercel/next.js', ...RESULT_BASE, name: 'next.js', stars: 120000 },
      ],
    }
    const md = buildMarkdownReport(response)
    expect(md).toContain('Median')
    expect(md).toContain('facebook/react (anchor)')
    expect(md).toContain('vercel/next.js')
    expect(md).toContain('Stars')
    // non-anchor cells include delta display with % when values differ
    expect(md).toContain('vs anchor')
    expect(md).toContain('%')
  })

  it('includes a failed repositories section when failures exist', () => {
    const response: AnalyzeResponse = {
      ...MINIMAL_RESPONSE,
      failures: [{ repo: 'bad/repo', reason: 'Not found', code: 'NOT_FOUND' }],
    }
    const md = buildMarkdownReport(response)
    expect(md).toContain('## Failed Repositories')
    expect(md).toContain('bad/repo')
  })
})

describe('buildMarkdownExport', () => {
  it('returns a Blob with MIME type text/markdown', () => {
    const result = buildMarkdownExport(MINIMAL_RESPONSE)
    expect(result.blob.type).toBe('text/markdown')
  })

  it('filename matches repopulse-YYYY-MM-DD-HHmmss.md pattern', () => {
    const result = buildMarkdownExport(MINIMAL_RESPONSE)
    expect(result.filename).toMatch(/^repopulse-\d{4}-\d{2}-\d{2}-\d{6}\.md$/)
  })
})
