import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DocumentationView } from './DocumentationView'
import type { AnalysisResult } from '@/lib/analyzer/analysis-result'

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
    documentationResult: {
      fileChecks: [
        { name: 'readme', found: true, path: 'README.md' },
        { name: 'license', found: true, path: 'LICENSE' },
        { name: 'contributing', found: true, path: 'CONTRIBUTING.md' },
        { name: 'code_of_conduct', found: true, path: 'CODE_OF_CONDUCT.md' },
        { name: 'security', found: true, path: 'SECURITY.md' },
        { name: 'changelog', found: true, path: 'CHANGELOG.md' },
      ],
      readmeSections: [
        { name: 'description', detected: true },
        { name: 'installation', detected: true },
        { name: 'usage', detected: true },
        { name: 'contributing', detected: true },
        { name: 'license', detected: true },
      ],
      readmeContent: '# React',
    },
    licensingResult: {
      license: { spdxId: 'MIT', name: 'MIT License', osiApproved: true, permissivenessTier: 'Permissive' },
      contributorAgreement: { signedOffByRatio: null, dcoOrClaBot: false, enforced: false },
    },
    missingFields: [],
    ...overrides,
  }
}

describe('DocumentationView', () => {
  describe('Licensing pane', () => {
    it('renders the licensing pane with license details', () => {
      render(<DocumentationView results={[buildResult()]} />)

      const licensingPane = screen.getByRole('region', { name: /licensing/i })
      expect(licensingPane).toBeInTheDocument()
      expect(within(licensingPane).getByText('MIT License')).toBeInTheDocument()
      expect(within(licensingPane).getByText('(MIT)')).toBeInTheDocument()
      expect(within(licensingPane).getByText(/osi approved/i)).toBeInTheDocument()
      expect(within(licensingPane).getByText('Permissive')).toBeInTheDocument()
    })

    it('renders copyleft tier correctly', () => {
      render(<DocumentationView results={[buildResult({
        licensingResult: {
          license: { spdxId: 'GPL-3.0-only', name: 'GNU General Public License v3.0 only', osiApproved: true, permissivenessTier: 'Copyleft' },
          contributorAgreement: { signedOffByRatio: null, dcoOrClaBot: false, enforced: false },
        },
      })]} />)

      const licensingPane = screen.getByRole('region', { name: /licensing/i })
      expect(within(licensingPane).getByText('Copyleft')).toBeInTheDocument()
    })

    it('renders weak copyleft tier correctly', () => {
      render(<DocumentationView results={[buildResult({
        licensingResult: {
          license: { spdxId: 'MPL-2.0', name: 'Mozilla Public License 2.0', osiApproved: true, permissivenessTier: 'Weak Copyleft' },
          contributorAgreement: { signedOffByRatio: null, dcoOrClaBot: false, enforced: false },
        },
      })]} />)

      const licensingPane = screen.getByRole('region', { name: /licensing/i })
      expect(within(licensingPane).getByText('Weak Copyleft')).toBeInTheDocument()
    })

    it('renders no license state', () => {
      render(<DocumentationView results={[buildResult({
        licensingResult: {
          license: { spdxId: null, name: null, osiApproved: false, permissivenessTier: null },
          contributorAgreement: { signedOffByRatio: null, dcoOrClaBot: false, enforced: false },
        },
      })]} />)

      const licensingPane = screen.getByRole('region', { name: /licensing/i })
      expect(within(licensingPane).getByText(/no license detected/i)).toBeInTheDocument()
    })

    it('renders unavailable licensing data', () => {
      render(<DocumentationView results={[buildResult({ licensingResult: 'unavailable' })]} />)

      const licensingPane = screen.getByRole('region', { name: /licensing/i })
      expect(within(licensingPane).getByText(/unavailable/i)).toBeInTheDocument()
    })

    it('renders DCO enforcement detected', () => {
      render(<DocumentationView results={[buildResult({
        licensingResult: {
          license: { spdxId: 'Apache-2.0', name: 'Apache License 2.0', osiApproved: true, permissivenessTier: 'Permissive' },
          contributorAgreement: { signedOffByRatio: 0.95, dcoOrClaBot: true, enforced: true },
        },
      })]} />)

      const licensingPane = screen.getByRole('region', { name: /licensing/i })
      expect(within(licensingPane).getByText(/enforcement detected/i)).toBeInTheDocument()
    })

    it('renders no DCO enforcement', () => {
      render(<DocumentationView results={[buildResult()]} />)

      const licensingPane = screen.getByRole('region', { name: /licensing/i })
      expect(within(licensingPane).getByText(/not detected/i)).toBeInTheDocument()
    })
  })
})
