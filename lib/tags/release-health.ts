/**
 * Release Health tag mappings (P2-F09 / #69).
 *
 * Mirrors the structure of `lib/tags/community.ts` and `lib/tags/governance.ts`.
 * The release-health lens tags items across the Activity and Documentation
 * tabs. Scoring for these signals lives inside each host bucket's
 * `score-config.ts`, not here.
 *
 * See `specs/69-add-release-and-versioning-health-signal/data-model.md`.
 */

export const RELEASE_HEALTH_TAG = 'release-health'

/** Activity tab item keys that carry the release-health lens. */
export const RELEASE_HEALTH_ACTIVITY_ITEMS = new Set<string>([
  'release_cadence_card',
])

/** Row keys (across Activity and Documentation tabs) that carry the release-health pill. */
export const RELEASE_HEALTH_ROWS = new Set<string>([
  'release_cadence_card',
  'release_discipline_card',
  'release_discipline_semver',
  'release_discipline_notes',
  'release_discipline_tag_promotion',
])

/** Metric keys (five scored signals) carried by the lens. */
export const RELEASE_HEALTH_METRICS = new Set<string>([
  'release_frequency',
  'days_since_last_release',
  'semver_compliance',
  'release_notes_quality',
  'tag_to_release',
])

export type ReleaseHealthDomain = 'activity_item' | 'row' | 'metric'

export function isReleaseHealthItem(key: string, domain: ReleaseHealthDomain): boolean {
  switch (domain) {
    case 'activity_item': return RELEASE_HEALTH_ACTIVITY_ITEMS.has(key)
    case 'row': return RELEASE_HEALTH_ROWS.has(key)
    case 'metric': return RELEASE_HEALTH_METRICS.has(key)
  }
}
