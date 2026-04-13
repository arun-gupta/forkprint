/**
 * Unified recommendation catalog — the single source of truth for all
 * recommendation reference IDs. Every entry has a stable, human-readable
 * ID (e.g. SEC-1, DOC-3) that is the same across all repos, so users
 * can reference specific findings in conversations, reports, and issues.
 *
 * Bucket prefixes:
 *   SEC — Security     ACT — Activity       RSP — Responsiveness
 *   SUS — Sustainability   DOC — Documentation
 */

export interface CatalogEntry {
  /** Stable reference ID shown to users (e.g. "SEC-1", "DOC-3") */
  id: string
  /** Bucket the recommendation belongs to */
  bucket: string
  /** Unique lookup key — matches the `item` or `key` field on generated recommendations */
  key: string
  /** Short human-readable title */
  title: string
  /** Cross-cutting tags for filtering (e.g. "governance") */
  tags?: string[]
}

// ── Security ──────────────────────────────────────────────────────────

const SEC: CatalogEntry[] = [
  // Critical
  { id: 'SEC-1', bucket: 'Security', key: 'Dangerous-Workflow', title: 'Fix dangerous GitHub Actions workflow patterns' },
  { id: 'SEC-2', bucket: 'Security', key: 'Webhooks', title: 'Secure webhook configurations with token authentication' },
  // High
  { id: 'SEC-3', bucket: 'Security', key: 'Branch-Protection', title: 'Enforce branch protection on the default branch', tags: ['governance'] },
  { id: 'SEC-4', bucket: 'Security', key: 'Binary-Artifacts', title: 'Remove binary artifacts from the repository' },
  { id: 'SEC-5', bucket: 'Security', key: 'Code-Review', title: 'Require code review before merging pull requests', tags: ['governance'] },
  { id: 'SEC-6', bucket: 'Security', key: 'Dependency-Update-Tool', title: 'Enable automated dependency updates' },
  { id: 'SEC-7', bucket: 'Security', key: 'Signed-Releases', title: 'Sign release artifacts to attest provenance' },
  { id: 'SEC-8', bucket: 'Security', key: 'Token-Permissions', title: 'Restrict GitHub Actions token permissions' },
  { id: 'SEC-9', bucket: 'Security', key: 'Vulnerabilities', title: 'Fix known vulnerabilities in dependencies' },
  { id: 'SEC-10', bucket: 'Security', key: 'Maintained', title: 'Maintain regular development activity' },
  // Medium
  { id: 'SEC-11', bucket: 'Security', key: 'Fuzzing', title: 'Adopt fuzz testing to find edge-case bugs' },
  { id: 'SEC-12', bucket: 'Security', key: 'Pinned-Dependencies', title: 'Pin dependencies to specific versions by hash' },
  { id: 'SEC-13', bucket: 'Security', key: 'SAST', title: 'Enable static application security testing (SAST)' },
  { id: 'SEC-14', bucket: 'Security', key: 'Security-Policy', title: 'Add a security vulnerability disclosure policy' },
  { id: 'SEC-15', bucket: 'Security', key: 'Packaging', title: 'Publish packages through official registries' },
  // Low
  { id: 'SEC-16', bucket: 'Security', key: 'CI-Tests', title: 'Run automated tests on pull requests' },
  { id: 'SEC-17', bucket: 'Security', key: 'License', title: 'Add a recognized open-source license' },
]

/**
 * Maps direct-check keys to their Scorecard equivalents so both resolve
 * to the same catalog ID (e.g. "branch_protection" → SEC-3).
 */
const DIRECT_CHECK_ALIASES: Record<string, string> = {
  branch_protection: 'Branch-Protection',
  dependabot: 'Dependency-Update-Tool',
  security_policy: 'Security-Policy',
  ci_cd: 'CI-Tests',
}

// ── Activity ──────────────────────────────────────────────────────────

const ACT: CatalogEntry[] = [
  { id: 'ACT-1', bucket: 'Activity', key: 'pr_flow', title: 'Reduce PR backlog and speed up review throughput' },
  { id: 'ACT-2', bucket: 'Activity', key: 'issue_flow', title: 'Triage and close stale issues' },
  { id: 'ACT-3', bucket: 'Activity', key: 'completion_speed', title: 'Reduce time to merge PRs and close issues' },
  { id: 'ACT-4', bucket: 'Activity', key: 'sustained_activity', title: 'Increase commit frequency for sustained momentum' },
]

// ── Responsiveness ────────────────────────────────────────────────────

const RSP: CatalogEntry[] = [
  { id: 'RSP-1', bucket: 'Responsiveness', key: 'response_time', title: 'Reduce issue and PR first-response times' },
  { id: 'RSP-2', bucket: 'Responsiveness', key: 'resolution', title: 'Speed up issue resolution and PR merge times' },
  { id: 'RSP-3', bucket: 'Responsiveness', key: 'backlog_health', title: 'Address stale issues and PRs' },
]

// ── Sustainability ────────────────────────────────────────────────────

const SUS: CatalogEntry[] = [
  { id: 'SUS-1', bucket: 'Sustainability', key: 'contributor_diversity', title: 'Onboard more contributors to reduce single-maintainer risk' },
  { id: 'SUS-2', bucket: 'Sustainability', key: 'no_maintainers', title: 'Add a CODEOWNERS or MAINTAINERS.md file', tags: ['governance'] },
]

// ── Documentation ─────────────────────────────────────────────────────

const DOC: CatalogEntry[] = [
  // File presence
  { id: 'DOC-1', bucket: 'Documentation', key: 'file:readme', title: 'Add a README' },
  { id: 'DOC-2', bucket: 'Documentation', key: 'file:license', title: 'Add a LICENSE file' },
  { id: 'DOC-3', bucket: 'Documentation', key: 'file:contributing', title: 'Add CONTRIBUTING.md' },
  { id: 'DOC-4', bucket: 'Documentation', key: 'file:code_of_conduct', title: 'Add CODE_OF_CONDUCT.md' },
  { id: 'DOC-5', bucket: 'Documentation', key: 'file:security', title: 'Add SECURITY.md' },
  { id: 'DOC-6', bucket: 'Documentation', key: 'file:changelog', title: 'Add CHANGELOG.md', tags: ['governance'] },
  // README sections
  { id: 'DOC-7', bucket: 'Documentation', key: 'section:description', title: 'Add a project description to your README' },
  { id: 'DOC-8', bucket: 'Documentation', key: 'section:installation', title: 'Add installation instructions to your README' },
  { id: 'DOC-9', bucket: 'Documentation', key: 'section:usage', title: 'Add usage examples to your README' },
  { id: 'DOC-10', bucket: 'Documentation', key: 'section:contributing', title: 'Add a contributing section to your README' },
  { id: 'DOC-11', bucket: 'Documentation', key: 'section:license', title: 'Add a license section to your README' },
  // Licensing
  { id: 'DOC-12', bucket: 'Documentation', key: 'licensing:license', title: 'Add an open source license' },
  { id: 'DOC-13', bucket: 'Documentation', key: 'licensing:osi_license', title: 'Use an OSI-approved license' },
  { id: 'DOC-14', bucket: 'Documentation', key: 'licensing:dco_cla', title: 'Enforce a DCO or CLA for contributions' },
]

// ── Combined catalog ──────────────────────────────────────────────────

export const RECOMMENDATION_CATALOG: CatalogEntry[] = [
  ...SEC, ...ACT, ...RSP, ...SUS, ...DOC,
]

/** Fast lookup: key → CatalogEntry */
const keyIndex = new Map<string, CatalogEntry>()
for (const entry of RECOMMENDATION_CATALOG) {
  keyIndex.set(entry.key, entry)
}
// Register direct-check aliases so e.g. "branch_protection" → SEC-3
for (const [alias, canonical] of Object.entries(DIRECT_CHECK_ALIASES)) {
  const entry = keyIndex.get(canonical)
  if (entry) keyIndex.set(alias, entry)
}

/**
 * Look up the stable reference ID for a recommendation key.
 * Returns undefined for dynamic recommendations not in the catalog
 * (e.g. inclusive naming findings).
 */
export function getCatalogId(key: string): string | undefined {
  return keyIndex.get(key)?.id
}

/**
 * Look up the full catalog entry for a recommendation key.
 */
export function getCatalogEntryByKey(key: string): CatalogEntry | undefined {
  return keyIndex.get(key)
}

/**
 * Return all catalog entries that carry a given tag (e.g. "governance").
 */
export function getCatalogEntriesByTag(tag: string): CatalogEntry[] {
  return RECOMMENDATION_CATALOG.filter((e) => e.tags?.includes(tag))
}
