import { describe, expect, it } from 'vitest'
import {
  RELEASE_HEALTH_ACTIVITY_ITEMS,
  RELEASE_HEALTH_METRICS,
  RELEASE_HEALTH_TAG,
  RELEASE_HEALTH_ROWS,
  isReleaseHealthItem,
} from './release-health'

describe('release-health tag registry', () => {
  it('exports a stable tag key', () => {
    expect(RELEASE_HEALTH_TAG).toBe('release-health')
  })

  it('tags the Release Cadence card on the Activity tab', () => {
    expect(RELEASE_HEALTH_ACTIVITY_ITEMS.has('release_cadence_card')).toBe(true)
    expect(isReleaseHealthItem('release_cadence_card', 'activity_item')).toBe(true)
  })

  it('tags all five scored metrics', () => {
    for (const key of [
      'release_frequency',
      'days_since_last_release',
      'semver_compliance',
      'release_notes_quality',
      'tag_to_release',
    ]) {
      expect(RELEASE_HEALTH_METRICS.has(key)).toBe(true)
      expect(isReleaseHealthItem(key, 'metric')).toBe(true)
    }
  })

  it('tags Activity and Documentation card rows', () => {
    expect(RELEASE_HEALTH_ROWS.has('release_cadence_card')).toBe(true)
    expect(RELEASE_HEALTH_ROWS.has('release_discipline_card')).toBe(true)
  })

  it('returns false for unrelated keys', () => {
    expect(isReleaseHealthItem('readme', 'metric')).toBe(false)
    expect(isReleaseHealthItem('discussions', 'activity_item')).toBe(false)
  })
})
