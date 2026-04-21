import { describe, expect, it } from 'vitest'
import { computeOnboardingCompleteness } from './completeness'
import type { AnalysisResult } from '@/lib/analyzer/analysis-result'

const BASE: Partial<AnalysisResult> = {
  documentationResult: 'unavailable',
  goodFirstIssueCount: 'unavailable',
  devEnvironmentSetup: 'unavailable',
  gitpodPresent: 'unavailable',
  newContributorPRAcceptanceRate: 'unavailable',
}

describe('computeOnboardingCompleteness', () => {
  it('returns ratio null when all 9 signals are unknown', () => {
    const result = computeOnboardingCompleteness(BASE as AnalysisResult)
    expect(result.ratio).toBeNull()
    expect(result.present).toHaveLength(0)
    expect(result.missing).toHaveLength(0)
    expect(result.unknown).toHaveLength(9)
  })

  it('counts good_first_issues as present when count >= 1', () => {
    const r = computeOnboardingCompleteness({ ...BASE, goodFirstIssueCount: 3 } as AnalysisResult)
    expect(r.present).toContain('good_first_issues')
    expect(r.missing).not.toContain('good_first_issues')
  })

  it('counts good_first_issues as missing when count is 0', () => {
    const r = computeOnboardingCompleteness({ ...BASE, goodFirstIssueCount: 0 } as AnalysisResult)
    expect(r.missing).toContain('good_first_issues')
    expect(r.present).not.toContain('good_first_issues')
  })

  it('counts dev_environment_setup as present when true', () => {
    const r = computeOnboardingCompleteness({ ...BASE, devEnvironmentSetup: true } as AnalysisResult)
    expect(r.present).toContain('dev_environment_setup')
  })

  it('counts dev_environment_setup as missing when false', () => {
    const r = computeOnboardingCompleteness({ ...BASE, devEnvironmentSetup: false } as AnalysisResult)
    expect(r.missing).toContain('dev_environment_setup')
  })

  it('counts new_contributor_acceptance as present when rate >= floor (0.5)', () => {
    const r = computeOnboardingCompleteness({ ...BASE, newContributorPRAcceptanceRate: 0.5 } as AnalysisResult)
    expect(r.present).toContain('new_contributor_acceptance')
  })

  it('counts new_contributor_acceptance as missing when rate < floor', () => {
    const r = computeOnboardingCompleteness({ ...BASE, newContributorPRAcceptanceRate: 0.3 } as AnalysisResult)
    expect(r.missing).toContain('new_contributor_acceptance')
  })

  it('counts doc file signals from documentationResult fileChecks', () => {
    const r = computeOnboardingCompleteness({
      ...BASE,
      documentationResult: {
        fileChecks: [
          { name: 'issue_templates', found: true },
          { name: 'pull_request_template', found: false },
          { name: 'contributing', found: true },
          { name: 'code_of_conduct', found: false },
        ],
        readmeSections: [],
        readmeWordCount: 0,
      },
    } as unknown as AnalysisResult)
    expect(r.present).toContain('issue_templates')
    expect(r.missing).toContain('pull_request_template')
    expect(r.present).toContain('contributing')
    expect(r.missing).toContain('code_of_conduct')
  })

  it('counts readme section signals from documentationResult readmeSections', () => {
    const r = computeOnboardingCompleteness({
      ...BASE,
      documentationResult: {
        fileChecks: [],
        readmeSections: [
          { name: 'installation', detected: true },
          { name: 'contributing', detected: false },
        ],
        readmeWordCount: 0,
      },
    } as unknown as AnalysisResult)
    expect(r.present).toContain('readme_installation')
    expect(r.missing).toContain('readme_contributing')
  })

  it('computes ratio as present / (present + missing)', () => {
    const r = computeOnboardingCompleteness({
      ...BASE,
      goodFirstIssueCount: 5,
      devEnvironmentSetup: true,
      newContributorPRAcceptanceRate: 0.8,
      documentationResult: {
        fileChecks: [
          { name: 'issue_templates', found: true },
          { name: 'pull_request_template', found: true },
          { name: 'contributing', found: true },
          { name: 'code_of_conduct', found: true },
        ],
        readmeSections: [
          { name: 'installation', detected: true },
          { name: 'contributing', detected: true },
        ],
        readmeWordCount: 0,
      },
    } as unknown as AnalysisResult)
    expect(r.present).toHaveLength(9)
    expect(r.missing).toHaveLength(0)
    expect(r.ratio).toBe(1)
  })

  it('excludes unknown signals from ratio denominator', () => {
    // 3 contributor signals unknown, 4 doc file signals all present, readme sections unknown
    const r = computeOnboardingCompleteness({
      ...BASE,
      documentationResult: {
        fileChecks: [
          { name: 'issue_templates', found: true },
          { name: 'pull_request_template', found: true },
          { name: 'contributing', found: true },
          { name: 'code_of_conduct', found: true },
        ],
        readmeSections: [],
        readmeWordCount: 0,
      },
    } as unknown as AnalysisResult)
    expect(r.present).toHaveLength(4)
    expect(r.ratio).toBe(1) // 4 present / (4 present + 0 missing)
  })

  it('total signal count is always 9 (present + missing + unknown)', () => {
    const r = computeOnboardingCompleteness({
      ...BASE,
      goodFirstIssueCount: 2,
      devEnvironmentSetup: false,
    } as AnalysisResult)
    expect(r.present.length + r.missing.length + r.unknown.length).toBe(9)
  })
})
