/**
 * Governance tag mappings for tab-level display items.
 *
 * These map the item keys used in each tab's data model to the
 * governance tag, so tag pills can appear on individual rows
 * across Documentation, Security, and Contributors views.
 */

/** Documentation file-check names that are governance signals */
export const GOVERNANCE_DOC_FILES = new Set([
  'license',
  'contributing',
  'code_of_conduct',
  'security',
  'changelog',
  'governance',
])

/** Scorecard check names that are governance signals */
export const GOVERNANCE_SCORECARD_CHECKS = new Set([
  'Branch-Protection',
  'Code-Review',
  'Security-Policy',
  'License',
])

/** Direct security check names that are governance signals */
export const GOVERNANCE_DIRECT_CHECKS = new Set([
  'branch_protection',
  'security_policy',
])

/** Contributors-tab metric labels that are governance signals */
export const GOVERNANCE_CONTRIBUTORS_METRICS = new Set([
  'Maintainer count',
])

/** Returns true if the licensing pane is governance-tagged (always true) */
export const LICENSING_IS_GOVERNANCE = true

export function isGovernanceItem(key: string, domain: 'doc_file' | 'scorecard' | 'direct_check' | 'contributors_metric'): boolean {
  switch (domain) {
    case 'doc_file': return GOVERNANCE_DOC_FILES.has(key)
    case 'scorecard': return GOVERNANCE_SCORECARD_CHECKS.has(key)
    case 'direct_check': return GOVERNANCE_DIRECT_CHECKS.has(key)
    case 'contributors_metric': return GOVERNANCE_CONTRIBUTORS_METRICS.has(key)
  }
}
