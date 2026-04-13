import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { AnalysisResult } from '@/lib/analyzer/analysis-result'
import { RecommendationsView } from './RecommendationsView'

function buildResult(overrides: Partial<AnalysisResult> = {}): AnalysisResult {
  return {
    repo: 'facebook/react',
    name: 'react',
    description: 'A UI library',
    createdAt: '2013-05-24T16:15:54Z',
    primaryLanguage: 'TypeScript',
    stars: 1000,
    forks: 25,
    watchers: 10,
    commits30d: 7,
    commits90d: 18,
    releases12mo: 6,
    prsOpened90d: 4,
    prsMerged90d: 3,
    issuesOpen: 5,
    issuesClosed90d: 6,
    uniqueCommitAuthors90d: 'unavailable',
    totalContributors: 'unavailable',
    maintainerCount: 'unavailable',
    commitCountsByAuthor: 'unavailable',
    commitCountsByExperimentalOrg: 'unavailable',
    experimentalAttributedAuthors90d: 'unavailable',
    experimentalUnattributedAuthors90d: 'unavailable',
    staleIssueRatio: 0.2,
    medianTimeToMergeHours: 24,
    medianTimeToCloseHours: 36,
    issueFirstResponseTimestamps: 'unavailable',
    issueCloseTimestamps: 'unavailable',
    prMergeTimestamps: 'unavailable',
    documentationResult: 'unavailable',
    licensingResult: 'unavailable',
    defaultBranchName: 'main',
    topics: [],
    inclusiveNamingResult: {
      defaultBranchName: 'main',
      branchCheck: { checkType: 'branch', term: 'main', passed: true, tier: null, severity: null, replacements: [], context: null },
      metadataChecks: [],
    },
    securityResult: 'unavailable',
    missingFields: [],
    ...overrides,
  }
}

describe('RecommendationsView security recommendations', () => {
  it('renders grouped security recommendations with category headings', () => {
    const result = buildResult({
      securityResult: {
        scorecard: {
          overallScore: 3.0,
          checks: [
            { name: 'Dangerous-Workflow', score: 2, reason: 'dangerous patterns' },
            { name: 'CI-Tests', score: 5, reason: 'some tests' },
            { name: 'Fuzzing', score: 3, reason: 'no fuzzing' },
          ],
          scorecardVersion: 'v5.0.0',
        },
        directChecks: [
          { name: 'security_policy', detected: true, details: null },
          { name: 'dependabot', detected: true, details: null },
          { name: 'ci_cd', detected: true, details: null },
          { name: 'branch_protection', detected: true, details: null },
        ],
        branchProtectionEnabled: true,
      },
    })
    render(<RecommendationsView results={[result]} />)

    expect(screen.getByText('Critical Issues')).toBeInTheDocument()
    expect(screen.getByText('Quick Wins')).toBeInTheDocument()
    expect(screen.getByText('Best Practices')).toBeInTheDocument()
  })

  it('shows source labels on security recommendations', () => {
    const result = buildResult({
      securityResult: {
        scorecard: {
          overallScore: 3.0,
          checks: [
            { name: 'Token-Permissions', score: 3, reason: 'weak' },
          ],
          scorecardVersion: 'v5.0.0',
        },
        directChecks: [
          { name: 'security_policy', detected: false, details: null },
          { name: 'dependabot', detected: true, details: null },
          { name: 'ci_cd', detected: true, details: null },
          { name: 'branch_protection', detected: true, details: null },
        ],
        branchProtectionEnabled: true,
      },
    })
    render(<RecommendationsView results={[result]} />)

    expect(screen.getByText('OpenSSF Scorecard')).toBeInTheDocument()
    expect(screen.getByText('Direct check')).toBeInTheDocument()
  })

  it('renders remediation hints when present', () => {
    const result = buildResult({
      securityResult: {
        scorecard: {
          overallScore: 3.0,
          checks: [
            { name: 'Token-Permissions', score: 3, reason: 'weak permissions' },
          ],
          scorecardVersion: 'v5.0.0',
        },
        directChecks: [
          { name: 'security_policy', detected: true, details: null },
          { name: 'dependabot', detected: true, details: null },
          { name: 'ci_cd', detected: true, details: null },
          { name: 'branch_protection', detected: true, details: null },
        ],
        branchProtectionEnabled: true,
      },
    })
    render(<RecommendationsView results={[result]} />)

    expect(screen.getByText(/permissions: read-all/)).toBeInTheDocument()
  })

  it('renders docs links for Scorecard recommendations', () => {
    const result = buildResult({
      securityResult: {
        scorecard: {
          overallScore: 3.0,
          checks: [
            { name: 'Token-Permissions', score: 3, reason: 'weak' },
          ],
          scorecardVersion: 'v5.0.0',
        },
        directChecks: [
          { name: 'security_policy', detected: true, details: null },
          { name: 'dependabot', detected: true, details: null },
          { name: 'ci_cd', detected: true, details: null },
          { name: 'branch_protection', detected: true, details: null },
        ],
        branchProtectionEnabled: true,
      },
    })
    render(<RecommendationsView results={[result]} />)

    const link = screen.getByRole('link', { name: /scorecard docs/i })
    expect(link).toHaveAttribute('href', expect.stringContaining('checks.md'))
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('handles recommendations with null hints gracefully', () => {
    const result = buildResult({
      securityResult: {
        scorecard: {
          overallScore: 3.0,
          checks: [
            { name: 'Maintained', score: 3, reason: 'low activity' },
          ],
          scorecardVersion: 'v5.0.0',
        },
        directChecks: [
          { name: 'security_policy', detected: true, details: null },
          { name: 'dependabot', detected: true, details: null },
          { name: 'ci_cd', detected: true, details: null },
          { name: 'branch_protection', detected: true, details: null },
        ],
        branchProtectionEnabled: true,
      },
    })
    render(<RecommendationsView results={[result]} />)

    expect(screen.getByText('Maintain regular development activity')).toBeInTheDocument()
  })
})
