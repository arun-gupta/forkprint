import { describe, expect, it } from 'vitest'
import type { AnalysisResult } from '@/lib/analyzer/analysis-result'
import { COMPARISON_SECTIONS } from './sections'

function makeResult(overrides: Partial<AnalysisResult> = {}): AnalysisResult {
  return {
    repo: 'owner/repo',
    name: 'repo',
    description: 'desc',
    createdAt: '2024-01-01T00:00:00Z',
    primaryLanguage: 'TypeScript',
    stars: 100, forks: 10, watchers: 5,
    commits30d: 5, commits90d: 15,
    releases12mo: 2, prsOpened90d: 3, prsMerged90d: 2,
    issuesOpen: 4, issuesClosed90d: 3,
    uniqueCommitAuthors90d: 4, totalContributors: 10,
    maintainerCount: 2,
    commitCountsByAuthor: { 'login:alice': 5 },
    commitCountsByExperimentalOrg: 'unavailable',
    experimentalAttributedAuthors90d: 'unavailable',
    experimentalUnattributedAuthors90d: 'unavailable',
    issueFirstResponseTimestamps: 'unavailable',
    issueCloseTimestamps: 'unavailable',
    prMergeTimestamps: 'unavailable',
    documentationResult: 'unavailable',
    licensingResult: 'unavailable',
    defaultBranchName: 'main',
    topics: [],
    inclusiveNamingResult: 'unavailable',
    securityResult: 'unavailable',
    missingFields: [],
    ...overrides,
  } as AnalysisResult
}

const contributorsSection = COMPARISON_SECTIONS.find((s) => s.id === 'contributors')!

describe('Comparison contributors section — onboarding rows (T022)', () => {
  it('includes good-first-issues-count attribute', () => {
    const attr = contributorsSection.attributes.find((a) => a.id === 'good-first-issues-count')
    expect(attr).toBeDefined()
  })

  it('good-first-issues-count getValue returns the count', () => {
    const attr = contributorsSection.attributes.find((a) => a.id === 'good-first-issues-count')!
    const result = makeResult({ goodFirstIssueCount: 7 })
    expect(attr.getValue(result)).toBe(7)
  })

  it('good-first-issues-count getValue returns unavailable when field missing', () => {
    const attr = contributorsSection.attributes.find((a) => a.id === 'good-first-issues-count')!
    const result = makeResult({ goodFirstIssueCount: 'unavailable' })
    expect(attr.getValue(result)).toBe('unavailable')
  })

  it('good-first-issues-count formatValue formats 0 as "0"', () => {
    const attr = contributorsSection.attributes.find((a) => a.id === 'good-first-issues-count')!
    expect(attr.formatValue?.(0, makeResult())).toBe('0')
  })

  it('good-first-issues-count formatValue formats unavailable as "—"', () => {
    const attr = contributorsSection.attributes.find((a) => a.id === 'good-first-issues-count')!
    expect(attr.formatValue?.('unavailable', makeResult())).toBe('—')
  })

  it('includes dev-environment-setup attribute', () => {
    const attr = contributorsSection.attributes.find((a) => a.id === 'dev-environment-setup')
    expect(attr).toBeDefined()
  })

  it('dev-environment-setup getValue returns 1 when true', () => {
    const attr = contributorsSection.attributes.find((a) => a.id === 'dev-environment-setup')!
    const result = makeResult({ devEnvironmentSetup: true })
    expect(attr.getValue(result)).toBe(1)
  })

  it('dev-environment-setup getValue returns 0 when false', () => {
    const attr = contributorsSection.attributes.find((a) => a.id === 'dev-environment-setup')!
    const result = makeResult({ devEnvironmentSetup: false })
    expect(attr.getValue(result)).toBe(0)
  })

  it('dev-environment-setup getValue returns unavailable when unavailable', () => {
    const attr = contributorsSection.attributes.find((a) => a.id === 'dev-environment-setup')!
    const result = makeResult({ devEnvironmentSetup: 'unavailable' })
    expect(attr.getValue(result)).toBe('unavailable')
  })

  it('includes new-contributor-pr-acceptance attribute', () => {
    const attr = contributorsSection.attributes.find((a) => a.id === 'new-contributor-pr-acceptance')
    expect(attr).toBeDefined()
  })

  it('new-contributor-pr-acceptance formatValue formats 0 as "0.0%"', () => {
    const attr = contributorsSection.attributes.find((a) => a.id === 'new-contributor-pr-acceptance')!
    expect(attr.formatValue?.(0, makeResult())).toBe('0.0%')
  })

  it('new-contributor-pr-acceptance formatValue formats 1 as "100.0%"', () => {
    const attr = contributorsSection.attributes.find((a) => a.id === 'new-contributor-pr-acceptance')!
    expect(attr.formatValue?.(1, makeResult())).toBe('100.0%')
  })

  it('new-contributor-pr-acceptance formatValue formats unavailable as "—"', () => {
    const attr = contributorsSection.attributes.find((a) => a.id === 'new-contributor-pr-acceptance')!
    expect(attr.formatValue?.('unavailable', makeResult())).toBe('—')
  })
})
