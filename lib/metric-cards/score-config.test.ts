import { describe, expect, it } from 'vitest'
import { getDefaultScoreBadges, scoreToneClass } from './score-config'

describe('score-config', () => {
  it('returns one default badge per CHAOSS category', () => {
    const badges = getDefaultScoreBadges()

    expect(badges).toHaveLength(3)
    expect(badges.map((badge) => badge.category)).toEqual([
      'Evolution',
      'Contribution Dynamics',
      'Responsiveness',
    ])
    expect(badges.every((badge) => badge.value === 'Not scored yet')).toBe(true)
  })

  it('maps tones to consistent classes', () => {
    expect(scoreToneClass('success')).toContain('emerald')
    expect(scoreToneClass('warning')).toContain('amber')
    expect(scoreToneClass('danger')).toContain('red')
    expect(scoreToneClass('neutral')).toContain('slate')
  })
})
