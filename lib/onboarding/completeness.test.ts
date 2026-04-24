import { describe, expect, it } from 'vitest'
import { computeOnboardingCompleteness } from './completeness'
import { buildResult } from '@/lib/testing/fixtures'

describe('computeOnboardingCompleteness', () => {
  it('returns ratio null when all 9 signals are unknown', () => {
    const result = computeOnboardingCompleteness(buildResult({
      documentationResult: 'unavailable',
      goodFirstIssueCount: 'unavailable',
      devEnvironmentSetup: 'unavailable',
      gitpodPresent: 'unavailable',
      newContributorPRAcceptanceRate: 'unavailable',
    }))
    expect(result.ratio).toBeNull()
    expect(result.present).toHaveLength(0)
    expect(result.missing).toHaveLength(0)
    expect(result.unknown).toHaveLength(9)
  })

  it('counts good_first_issues as present when count >= 1', () => {
    const r = computeOnboardingCompleteness(buildResult({
      documentationResult: 'unavailable',
      goodFirstIssueCount: 3,
      devEnvironmentSetup: 'unavailable',
      gitpodPresent: 'unavailable',
      newContributorPRAcceptanceRate: 'unavailable',
    }))
    expect(r.present).toContain('good_first_issues')
    expect(r.missing).not.toContain('good_first_issues')
  })

  it('counts good_first_issues as missing when count is 0', () => {
    const r = computeOnboardingCompleteness(buildResult({
      documentationResult: 'unavailable',
      goodFirstIssueCount: 0,
      devEnvironmentSetup: 'unavailable',
      gitpodPresent: 'unavailable',
      newContributorPRAcceptanceRate: 'unavailable',
    }))
    expect(r.missing).toContain('good_first_issues')
    expect(r.present).not.toContain('good_first_issues')
  })

  it('counts dev_environment_setup as present when true', () => {
    const r = computeOnboardingCompleteness(buildResult({
      documentationResult: 'unavailable',
      goodFirstIssueCount: 'unavailable',
      devEnvironmentSetup: true,
      gitpodPresent: 'unavailable',
      newContributorPRAcceptanceRate: 'unavailable',
    }))
    expect(r.present).toContain('dev_environment_setup')
  })

  it('counts dev_environment_setup as missing when false', () => {
    const r = computeOnboardingCompleteness(buildResult({
      documentationResult: 'unavailable',
      goodFirstIssueCount: 'unavailable',
      devEnvironmentSetup: false,
      gitpodPresent: 'unavailable',
      newContributorPRAcceptanceRate: 'unavailable',
    }))
    expect(r.missing).toContain('dev_environment_setup')
  })

  it('counts new_contributor_acceptance as present when rate >= floor (0.5)', () => {
    const r = computeOnboardingCompleteness(buildResult({
      documentationResult: 'unavailable',
      goodFirstIssueCount: 'unavailable',
      devEnvironmentSetup: 'unavailable',
      gitpodPresent: 'unavailable',
      newContributorPRAcceptanceRate: 0.5,
    }))
    expect(r.present).toContain('new_contributor_acceptance')
  })

  it('counts new_contributor_acceptance as missing when rate < floor', () => {
    const r = computeOnboardingCompleteness(buildResult({
      documentationResult: 'unavailable',
      goodFirstIssueCount: 'unavailable',
      devEnvironmentSetup: 'unavailable',
      gitpodPresent: 'unavailable',
      newContributorPRAcceptanceRate: 0.3,
    }))
    expect(r.missing).toContain('new_contributor_acceptance')
  })

  it('counts doc file signals from documentationResult fileChecks', () => {
    const r = computeOnboardingCompleteness(buildResult({
      goodFirstIssueCount: 'unavailable',
      devEnvironmentSetup: 'unavailable',
      gitpodPresent: 'unavailable',
      newContributorPRAcceptanceRate: 'unavailable',
      documentationResult: {
        fileChecks: [
          { name: 'issue_templates', found: true, path: null },
          { name: 'pull_request_template', found: false, path: null },
          { name: 'contributing', found: true, path: null },
          { name: 'code_of_conduct', found: false, path: null },
        ],
        readmeSections: [],
        readmeContent: null,
      },
    }))
    expect(r.present).toContain('issue_templates')
    expect(r.missing).toContain('pull_request_template')
    expect(r.present).toContain('contributing')
    expect(r.missing).toContain('code_of_conduct')
  })

  it('counts readme section signals from documentationResult readmeSections', () => {
    const r = computeOnboardingCompleteness(buildResult({
      goodFirstIssueCount: 'unavailable',
      devEnvironmentSetup: 'unavailable',
      gitpodPresent: 'unavailable',
      newContributorPRAcceptanceRate: 'unavailable',
      documentationResult: {
        fileChecks: [],
        readmeSections: [
          { name: 'installation', detected: true },
          { name: 'contributing', detected: false },
        ],
        readmeContent: null,
      },
    }))
    expect(r.present).toContain('readme_installation')
    expect(r.missing).toContain('readme_contributing')
  })

  it('computes ratio as present / (present + missing)', () => {
    const r = computeOnboardingCompleteness(buildResult({
      goodFirstIssueCount: 5,
      devEnvironmentSetup: true,
      gitpodPresent: 'unavailable',
      newContributorPRAcceptanceRate: 0.8,
      documentationResult: {
        fileChecks: [
          { name: 'issue_templates', found: true, path: null },
          { name: 'pull_request_template', found: true, path: null },
          { name: 'contributing', found: true, path: null },
          { name: 'code_of_conduct', found: true, path: null },
        ],
        readmeSections: [
          { name: 'installation', detected: true },
          { name: 'contributing', detected: true },
        ],
        readmeContent: null,
      },
    }))
    expect(r.present).toHaveLength(9)
    expect(r.missing).toHaveLength(0)
    expect(r.ratio).toBe(1)
  })

  it('excludes unknown signals from ratio denominator', () => {
    // 3 contributor signals unknown, 4 doc file signals all present, readme sections unknown
    const r = computeOnboardingCompleteness(buildResult({
      goodFirstIssueCount: 'unavailable',
      devEnvironmentSetup: 'unavailable',
      gitpodPresent: 'unavailable',
      newContributorPRAcceptanceRate: 'unavailable',
      documentationResult: {
        fileChecks: [
          { name: 'issue_templates', found: true, path: null },
          { name: 'pull_request_template', found: true, path: null },
          { name: 'contributing', found: true, path: null },
          { name: 'code_of_conduct', found: true, path: null },
        ],
        readmeSections: [],
        readmeContent: null,
      },
    }))
    expect(r.present).toHaveLength(4)
    expect(r.ratio).toBe(1) // 4 present / (4 present + 0 missing)
  })

  it('total signal count is always 9 (present + missing + unknown)', () => {
    const r = computeOnboardingCompleteness(buildResult({
      documentationResult: 'unavailable',
      goodFirstIssueCount: 2,
      devEnvironmentSetup: false,
      gitpodPresent: 'unavailable',
      newContributorPRAcceptanceRate: 'unavailable',
    }))
    expect(r.present.length + r.missing.length + r.unknown.length).toBe(9)
  })
})
