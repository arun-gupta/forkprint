import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { AnalysisResult } from '@/lib/analyzer/analysis-result'
import { buildResult as _buildResult, INCLUSIVE_NAMING_CLEAN } from '@/lib/testing/fixtures'
import { DocumentationView } from './DocumentationView'

function buildResult(overrides: Partial<AnalysisResult> = {}): AnalysisResult {
  return _buildResult({
    repo: 'facebook/react',
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
      adoptersFile: false,
      roadmapFile: false,
      maintainersFile: false,
      cocContent: null,
    },
    licensingResult: {
      license: { spdxId: 'MIT', name: 'MIT License', osiApproved: true, permissivenessTier: 'Permissive' },
      additionalLicenses: [],
      contributorAgreement: { signedOffByRatio: null, dcoOrClaBot: false, enforced: false },
    },
    inclusiveNamingResult: INCLUSIVE_NAMING_CLEAN,
    ...overrides,
  })
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
          additionalLicenses: [],
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
          additionalLicenses: [],
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
          additionalLicenses: [],
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
          additionalLicenses: [],
          contributorAgreement: { signedOffByRatio: 0.95, dcoOrClaBot: true, enforced: true },
        },
      })]} />)

      const licensingPane = screen.getByRole('region', { name: /licensing/i })
      expect(within(licensingPane).getByText(/enforcement detected/i)).toBeInTheDocument()
    })

    it('renders DCO not applicable when no commits and no bot', () => {
      render(<DocumentationView results={[buildResult()]} />)

      const licensingPane = screen.getByRole('region', { name: /licensing/i })
      expect(within(licensingPane).getByText(/not applicable/i)).toBeInTheDocument()
    })

    it('renders DCO not detected when commits exist but no enforcement', () => {
      render(<DocumentationView results={[buildResult({
        licensingResult: {
          license: { spdxId: 'MIT', name: 'MIT License', osiApproved: true, permissivenessTier: 'Permissive' },
          additionalLicenses: [],
          contributorAgreement: { signedOffByRatio: 0.1, dcoOrClaBot: false, enforced: false },
        },
      })]} />)

      const licensingPane = screen.getByRole('region', { name: /licensing/i })
      expect(within(licensingPane).getByText(/not detected/i)).toBeInTheDocument()
    })

    it('renders dual-licensed repo with additional licenses', () => {
      render(<DocumentationView results={[buildResult({
        licensingResult: {
          license: { spdxId: 'Apache-2.0', name: 'Apache License 2.0', osiApproved: true, permissivenessTier: 'Permissive' },
          additionalLicenses: [
            { spdxId: 'MIT', name: 'MIT License', osiApproved: true, permissivenessTier: 'Permissive' },
          ],
          contributorAgreement: { signedOffByRatio: null, dcoOrClaBot: false, enforced: false },
        },
      })]} />)

      const licensingPane = screen.getByRole('region', { name: /licensing/i })
      expect(within(licensingPane).getByText('Apache License 2.0')).toBeInTheDocument()
      expect(within(licensingPane).getByText('MIT License')).toBeInTheDocument()
      expect(within(licensingPane).getByText(/dual-licensed/i)).toBeInTheDocument()
    })

    it('does not show dual-licensed label for single license', () => {
      render(<DocumentationView results={[buildResult()]} />)

      const licensingPane = screen.getByRole('region', { name: /licensing/i })
      expect(within(licensingPane).queryByText(/dual-licensed/i)).not.toBeInTheDocument()
    })
  })
})
