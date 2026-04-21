import { describe, expect, it } from 'vitest'
import {
  ONBOARDING_DOC_FILES,
  ONBOARDING_README_SECTIONS,
  ONBOARDING_CONTRIBUTORS_METRICS,
  isOnboardingItem,
} from './onboarding'

describe('ONBOARDING_DOC_FILES', () => {
  it('includes issue_templates', () => expect(ONBOARDING_DOC_FILES.has('issue_templates')).toBe(true))
  it('includes pull_request_template', () => expect(ONBOARDING_DOC_FILES.has('pull_request_template')).toBe(true))
  it('includes contributing', () => expect(ONBOARDING_DOC_FILES.has('contributing')).toBe(true))
  it('includes code_of_conduct', () => expect(ONBOARDING_DOC_FILES.has('code_of_conduct')).toBe(true))
  it('does NOT include readme (cross-cut only via readme sections)', () => expect(ONBOARDING_DOC_FILES.has('readme')).toBe(false))
  it('does NOT include license', () => expect(ONBOARDING_DOC_FILES.has('license')).toBe(false))
})

describe('ONBOARDING_README_SECTIONS', () => {
  it('includes installation', () => expect(ONBOARDING_README_SECTIONS.has('installation')).toBe(true))
  it('includes contributing', () => expect(ONBOARDING_README_SECTIONS.has('contributing')).toBe(true))
  it('does NOT include description', () => expect(ONBOARDING_README_SECTIONS.has('description')).toBe(false))
  it('does NOT include usage', () => expect(ONBOARDING_README_SECTIONS.has('usage')).toBe(false))
  it('does NOT include license', () => expect(ONBOARDING_README_SECTIONS.has('license')).toBe(false))
})

describe('ONBOARDING_CONTRIBUTORS_METRICS', () => {
  it('includes Good first issues', () => expect(ONBOARDING_CONTRIBUTORS_METRICS.has('Good first issues')).toBe(true))
  it('includes Dev environment setup', () => expect(ONBOARDING_CONTRIBUTORS_METRICS.has('Dev environment setup')).toBe(true))
  it('includes New contributor PR acceptance', () => expect(ONBOARDING_CONTRIBUTORS_METRICS.has('New contributor PR acceptance')).toBe(true))
  it('does NOT include Maintainer count', () => expect(ONBOARDING_CONTRIBUTORS_METRICS.has('Maintainer count')).toBe(false))
})

describe('isOnboardingItem', () => {
  it('returns true for issue_templates in doc_file domain', () => {
    expect(isOnboardingItem('issue_templates', 'doc_file')).toBe(true)
  })

  it('returns true for pull_request_template in doc_file domain', () => {
    expect(isOnboardingItem('pull_request_template', 'doc_file')).toBe(true)
  })

  it('returns false for readme in doc_file domain', () => {
    expect(isOnboardingItem('readme', 'doc_file')).toBe(false)
  })

  it('returns true for installation in readme_section domain', () => {
    expect(isOnboardingItem('installation', 'readme_section')).toBe(true)
  })

  it('returns true for contributing in readme_section domain', () => {
    expect(isOnboardingItem('contributing', 'readme_section')).toBe(true)
  })

  it('returns false for description in readme_section domain', () => {
    expect(isOnboardingItem('description', 'readme_section')).toBe(false)
  })

  it('returns true for Good first issues in contributors_metric domain', () => {
    expect(isOnboardingItem('Good first issues', 'contributors_metric')).toBe(true)
  })

  it('returns false for Maintainer count in contributors_metric domain', () => {
    expect(isOnboardingItem('Maintainer count', 'contributors_metric')).toBe(false)
  })

  it('returns false for unknown key in any domain', () => {
    expect(isOnboardingItem('nonexistent', 'doc_file')).toBe(false)
    expect(isOnboardingItem('nonexistent', 'readme_section')).toBe(false)
    expect(isOnboardingItem('nonexistent', 'contributors_metric')).toBe(false)
  })
})
