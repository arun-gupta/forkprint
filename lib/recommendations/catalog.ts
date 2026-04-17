/**
 * Unified recommendation catalog — the single source of truth for all
 * recommendation reference IDs. Every entry has a stable, human-readable
 * ID (e.g. SEC-1, DOC-3) that is the same across all repos, so users
 * can reference specific findings in conversations, reports, and issues.
 *
 * Bucket prefixes:
 *   SEC — Security     ACT — Activity       RSP — Responsiveness
 *   CTR — Contributors   DOC — Documentation
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
  { id: 'SEC-4', bucket: 'Security', key: 'Binary-Artifacts', title: 'Remove binary artifacts from the repository', tags: ['supply-chain'] },
  { id: 'SEC-5', bucket: 'Security', key: 'Code-Review', title: 'Require code review before merging pull requests', tags: ['governance'] },
  { id: 'SEC-6', bucket: 'Security', key: 'Dependency-Update-Tool', title: 'Enable automated dependency updates', tags: ['supply-chain', 'quick-win'] },
  { id: 'SEC-7', bucket: 'Security', key: 'Signed-Releases', title: 'Sign release artifacts to attest provenance', tags: ['supply-chain'] },
  { id: 'SEC-8', bucket: 'Security', key: 'Token-Permissions', title: 'Restrict GitHub Actions token permissions', tags: ['supply-chain'] },
  { id: 'SEC-9', bucket: 'Security', key: 'Vulnerabilities', title: 'Fix known vulnerabilities in dependencies' },
  { id: 'SEC-10', bucket: 'Security', key: 'Maintained', title: 'Maintain regular development activity' },
  // Medium
  { id: 'SEC-11', bucket: 'Security', key: 'Fuzzing', title: 'Adopt fuzz testing to find edge-case bugs' },
  { id: 'SEC-12', bucket: 'Security', key: 'Pinned-Dependencies', title: 'Pin dependencies to specific versions by hash', tags: ['supply-chain'] },
  { id: 'SEC-13', bucket: 'Security', key: 'SAST', title: 'Enable static application security testing (SAST)' },
  { id: 'SEC-14', bucket: 'Security', key: 'Security-Policy', title: 'Add a security vulnerability disclosure policy', tags: ['governance', 'quick-win', 'compliance'] },
  { id: 'SEC-15', bucket: 'Security', key: 'Packaging', title: 'Publish packages through official registries', tags: ['supply-chain'] },
  // Low
  { id: 'SEC-16', bucket: 'Security', key: 'CI-Tests', title: 'Run automated tests on pull requests', tags: ['quick-win'] },
  { id: 'SEC-17', bucket: 'Security', key: 'License', title: 'Add a recognized open-source license', tags: ['governance', 'compliance'] },
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
  { id: 'ACT-2', bucket: 'Activity', key: 'issue_flow', title: 'Triage and close stale issues', tags: ['contrib-ex'] },
  { id: 'ACT-3', bucket: 'Activity', key: 'completion_speed', title: 'Reduce time to merge PRs and close issues' },
  { id: 'ACT-4', bucket: 'Activity', key: 'sustained_activity', title: 'Increase commit frequency for sustained momentum' },
  { id: 'ACT-5', bucket: 'Activity', key: 'feature:discussions_enabled', title: 'Enable GitHub Discussions for contributor conversation', tags: ['community', 'contrib-ex'] },
  // Release Health recommendations (P2-F09 / #69). IDs stay below the
  // fallback-counter range (101+) used by reference-id.ts for dynamic recs.
  { id: 'ACT-6', bucket: 'Activity', key: 'release_never_released', title: 'Cut a first release so adopters have a clear starting point', tags: ['release-health'] },
  { id: 'ACT-7', bucket: 'Activity', key: 'release_stale', title: 'Cut a maintenance release or archive the repository', tags: ['release-health'] },
  { id: 'ACT-8', bucket: 'Activity', key: 'release_cooling', title: 'Cut a release to reflect recent commits', tags: ['release-health'] },
]

// ── Responsiveness ────────────────────────────────────────────────────

const RSP: CatalogEntry[] = [
  { id: 'RSP-1', bucket: 'Responsiveness', key: 'response_time', title: 'Reduce issue and PR first-response times', tags: ['contrib-ex'] },
  { id: 'RSP-2', bucket: 'Responsiveness', key: 'resolution', title: 'Speed up issue resolution and PR merge times' },
  { id: 'RSP-3', bucket: 'Responsiveness', key: 'backlog_health', title: 'Address stale issues and PRs' },
]

// ── Contributors ──────────────────────────────────────────────────────

const CTR: CatalogEntry[] = [
  { id: 'CTR-1', bucket: 'Contributors', key: 'contributor_diversity', title: 'Onboard more contributors to reduce single-maintainer risk' },
  { id: 'CTR-2', bucket: 'Contributors', key: 'no_maintainers', title: 'Add a CODEOWNERS or MAINTAINERS.md file', tags: ['governance'] },
  { id: 'CTR-3', bucket: 'Contributors', key: 'file:funding', title: 'Add a FUNDING.yml to disclose funding channels', tags: ['community', 'governance'] },
  { id: 'CTR-4', bucket: 'Contributors', key: 'maintainer_depth', title: 'Grow maintainer depth by documenting additional owners', tags: ['governance'] },
  { id: 'CTR-5', bucket: 'Contributors', key: 'repeat_contributor_ratio', title: 'Invest in contributor retention to grow repeat-contributor share', tags: ['contrib-ex'] },
  { id: 'CTR-6', bucket: 'Contributors', key: 'new_contributor_inflow', title: 'Surface good-first-issues and onboarding to attract new contributors', tags: ['contrib-ex'] },
  { id: 'CTR-7', bucket: 'Contributors', key: 'contribution_breadth', title: 'Encourage contributions across commits, pull requests, and issues', tags: ['contrib-ex'] },
]

// ── Documentation ─────────────────────────────────────────────────────

const DOC: CatalogEntry[] = [
  // File presence
  { id: 'DOC-1', bucket: 'Documentation', key: 'file:readme', title: 'Add a README', tags: ['quick-win', 'contrib-ex'] },
  { id: 'DOC-2', bucket: 'Documentation', key: 'file:license', title: 'Add a LICENSE file', tags: ['governance', 'quick-win', 'compliance'] },
  { id: 'DOC-3', bucket: 'Documentation', key: 'file:contributing', title: 'Add CONTRIBUTING.md', tags: ['governance', 'quick-win', 'contrib-ex'] },
  { id: 'DOC-4', bucket: 'Documentation', key: 'file:code_of_conduct', title: 'Add CODE_OF_CONDUCT.md', tags: ['governance', 'quick-win', 'contrib-ex'] },
  { id: 'DOC-5', bucket: 'Documentation', key: 'file:security', title: 'Add SECURITY.md', tags: ['governance', 'quick-win'] },
  { id: 'DOC-6', bucket: 'Documentation', key: 'file:changelog', title: 'Add CHANGELOG.md', tags: ['governance', 'quick-win'] },
  // README sections
  { id: 'DOC-7', bucket: 'Documentation', key: 'section:description', title: 'Add a project description to your README', tags: ['contrib-ex'] },
  { id: 'DOC-8', bucket: 'Documentation', key: 'section:installation', title: 'Add installation instructions to your README', tags: ['contrib-ex'] },
  { id: 'DOC-9', bucket: 'Documentation', key: 'section:usage', title: 'Add usage examples to your README', tags: ['contrib-ex'] },
  { id: 'DOC-10', bucket: 'Documentation', key: 'section:contributing', title: 'Add a contributing section to your README', tags: ['contrib-ex'] },
  { id: 'DOC-11', bucket: 'Documentation', key: 'section:license', title: 'Add a license section to your README', tags: ['contrib-ex'] },
  // Licensing
  { id: 'DOC-12', bucket: 'Documentation', key: 'licensing:license', title: 'Add an open source license', tags: ['governance', 'compliance'] },
  { id: 'DOC-13', bucket: 'Documentation', key: 'licensing:osi_license', title: 'Use an OSI-approved license', tags: ['governance', 'compliance'] },
  { id: 'DOC-14', bucket: 'Documentation', key: 'licensing:dco_cla', title: 'Enforce a DCO or CLA for contributions', tags: ['governance', 'compliance'] },
  // Community templates
  { id: 'DOC-15', bucket: 'Documentation', key: 'file:issue_templates', title: 'Add an issue template in .github/ISSUE_TEMPLATE/', tags: ['community', 'contrib-ex'] },
  { id: 'DOC-16', bucket: 'Documentation', key: 'file:pull_request_template', title: 'Add a PULL_REQUEST_TEMPLATE.md', tags: ['community', 'contrib-ex'] },
  { id: 'DOC-17', bucket: 'Documentation', key: 'file:governance', title: 'Add GOVERNANCE.md', tags: ['governance', 'community', 'quick-win'] },
  // Release Health recommendations (P2-F09 / #69). IDs stay below the
  // fallback-counter range (101+) used by reference-id.ts for dynamic recs.
  { id: 'DOC-18', bucket: 'Documentation', key: 'release_adopt_semver', title: 'Adopt semantic versioning for release tags', tags: ['release-health'] },
  { id: 'DOC-19', bucket: 'Documentation', key: 'release_adopt_scheme', title: 'Adopt a consistent versioning scheme', tags: ['release-health'] },
  { id: 'DOC-20', bucket: 'Documentation', key: 'release_improve_notes', title: 'Expand release notes to describe what changed', tags: ['release-health', 'quick-win'] },
  { id: 'DOC-21', bucket: 'Documentation', key: 'release_promote_tags', title: 'Promote git tags to GitHub Releases', tags: ['release-health', 'quick-win'] },
]

// ── Combined catalog ──────────────────────────────────────────────────

export const RECOMMENDATION_CATALOG: CatalogEntry[] = [
  ...SEC, ...ACT, ...RSP, ...CTR, ...DOC,
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
