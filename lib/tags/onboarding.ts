/**
 * Onboarding tag mappings for tab-level display items.
 *
 * The onboarding lens cross-cuts Documentation and Contributors tabs,
 * surfacing signals that describe how welcoming a repo is to newcomers.
 * Two Documentation-tab signals (issue_templates, pull_request_template)
 * are already scored in FILE_WEIGHTS — only their tag membership is new.
 * Three Contributors-tab signals feed into the Community score.
 *
 * See specs/117-add-accessibility-onboarding-scoring-to/data-model.md.
 */

export type OnboardingDomain = 'doc_file' | 'readme_section' | 'contributors_metric'

/** Documentation file-check names that are onboarding signals. */
export const ONBOARDING_DOC_FILES = new Set<string>([
  'issue_templates',
  'pull_request_template',
  'contributing',
  'code_of_conduct',
])

/** README section names that are onboarding signals. */
export const ONBOARDING_README_SECTIONS = new Set<string>([
  'installation',
  'contributing',
])

/** Contributors tab metric labels that are onboarding signals. */
export const ONBOARDING_CONTRIBUTORS_METRICS = new Set<string>([
  'Good first issues',
  'Dev environment setup',
  'New contributor PR acceptance',
])

export function isOnboardingItem(key: string, domain: OnboardingDomain): boolean {
  switch (domain) {
    case 'doc_file': return ONBOARDING_DOC_FILES.has(key)
    case 'readme_section': return ONBOARDING_README_SECTIONS.has(key)
    case 'contributors_metric': return ONBOARDING_CONTRIBUTORS_METRICS.has(key)
  }
}
