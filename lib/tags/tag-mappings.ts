/**
 * Cross-cutting tag mappings for tab-level display items.
 *
 * These map the item keys used in each tab's data model to tags,
 * so tag pills can appear on individual rows across all views.
 *
 * The governance tag has its own file (governance.ts) for backwards
 * compatibility. All new tags are defined here.
 */

// ── supply-chain ─────────────────────────────────────────────────────

/** Scorecard check names that are supply-chain signals */
export const SUPPLY_CHAIN_SCORECARD_CHECKS = new Set([
  'Binary-Artifacts',
  'Dependency-Update-Tool',
  'Signed-Releases',
  'Token-Permissions',
  'Pinned-Dependencies',
  'Packaging',
])

/** Direct security check names that are supply-chain signals */
export const SUPPLY_CHAIN_DIRECT_CHECKS = new Set([
  'dependabot',
])

// ── quick-win ────────────────────────────────────────────────────────

/** Documentation file-check names that are quick-win signals */
export const QUICK_WIN_DOC_FILES = new Set([
  'readme',
  'license',
  'contributing',
  'code_of_conduct',
  'security',
  'changelog',
])

/** Scorecard check names that are quick-win signals */
export const QUICK_WIN_SCORECARD_CHECKS = new Set([
  'Security-Policy',
  'CI-Tests',
  'Dependency-Update-Tool',
])

/** Direct security check names that are quick-win signals */
export const QUICK_WIN_DIRECT_CHECKS = new Set([
  'security_policy',
  'dependabot',
  'ci_cd',
])

// ── compliance ───────────────────────────────────────────────────────

/** Documentation file-check names that are compliance signals */
export const COMPLIANCE_DOC_FILES = new Set([
  'license',
])

/** Scorecard check names that are compliance signals */
export const COMPLIANCE_SCORECARD_CHECKS = new Set([
  'Security-Policy',
  'License',
])

/** Direct security check names that are compliance signals */
export const COMPLIANCE_DIRECT_CHECKS = new Set([
  'security_policy',
])

/** Whether the licensing pane is compliance-tagged */
export const LICENSING_IS_COMPLIANCE = true

// ── contrib-ex ───────────────────────────────────────────────────────

/** Documentation file-check names that are contributor-experience signals */
export const CONTRIB_EX_DOC_FILES = new Set([
  'readme',
  'contributing',
  'code_of_conduct',
])

/** README section names that are contributor-experience signals */
export const CONTRIB_EX_README_SECTIONS = new Set([
  'description',
  'installation',
  'usage',
  'contributing',
  'license',
])

/** Responsiveness pane titles that are contributor-experience signals */
export const CONTRIB_EX_RESPONSIVENESS_PANES = new Set([
  'Issue & PR response time',
])

/** Activity card titles that are contributor-experience signals */
export const CONTRIB_EX_ACTIVITY_CARDS = new Set([
  'Issues',
])

// ── Helpers ──────────────────────────────────────────────────────────

/**
 * Returns all tags for a documentation file-check name.
 */
export function getDocFileTags(name: string): string[] {
  const tags: string[] = []
  if (QUICK_WIN_DOC_FILES.has(name)) tags.push('quick-win')
  if (COMPLIANCE_DOC_FILES.has(name)) tags.push('compliance')
  if (CONTRIB_EX_DOC_FILES.has(name)) tags.push('contrib-ex')
  return tags
}

/**
 * Returns all tags for a README section name.
 */
export function getReadmeSectionTags(name: string): string[] {
  if (CONTRIB_EX_README_SECTIONS.has(name)) return ['contrib-ex']
  return []
}

/**
 * Returns all tags for a Scorecard check name.
 */
export function getScorecardCheckTags(name: string): string[] {
  const tags: string[] = []
  if (SUPPLY_CHAIN_SCORECARD_CHECKS.has(name)) tags.push('supply-chain')
  if (QUICK_WIN_SCORECARD_CHECKS.has(name)) tags.push('quick-win')
  if (COMPLIANCE_SCORECARD_CHECKS.has(name)) tags.push('compliance')
  return tags
}

/**
 * Returns all tags for a direct security check name.
 */
export function getDirectCheckTags(name: string): string[] {
  const tags: string[] = []
  if (SUPPLY_CHAIN_DIRECT_CHECKS.has(name)) tags.push('supply-chain')
  if (QUICK_WIN_DIRECT_CHECKS.has(name)) tags.push('quick-win')
  if (COMPLIANCE_DIRECT_CHECKS.has(name)) tags.push('compliance')
  return tags
}
