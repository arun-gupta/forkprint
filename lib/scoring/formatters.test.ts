import { describe, expect, it } from 'vitest'
import { formatCount, formatHours, formatPercentage } from './formatters'
import { formatHours as activityFormatHours, formatPercentage as activityFormatPercentage } from '@/lib/activity/score-config'
import { formatCount as responsivenessFormatCount, formatHours as responsivenessFormatHours, formatPercentage as responsivenessFormatPercentage } from '@/lib/responsiveness/score-config'
import { formatPercentage as contributorsFormatPercentage } from '@/lib/contributors/score-config'

describe('formatters cross-module parity', () => {
  const percentageValues = [0, 0.155, 0.5, 0.999, 1] as const
  const hourValues = [0, 1.5, 23.9, 24, 48.3, 100] as const
  const countValues = [0, 1, 42, 999, 10000] as const

  describe('formatPercentage', () => {
    it.each(percentageValues)('all three modules produce identical output for %s', (v) => {
      const expected = formatPercentage(v)
      expect(activityFormatPercentage(v)).toBe(expected)
      expect(responsivenessFormatPercentage(v)).toBe(expected)
      expect(contributorsFormatPercentage(v)).toBe(expected)
    })

    it('returns em-dash for unavailable from all modules', () => {
      expect(formatPercentage('unavailable')).toBe('—')
      expect(activityFormatPercentage('unavailable')).toBe('—')
      expect(responsivenessFormatPercentage('unavailable')).toBe('—')
      expect(contributorsFormatPercentage('unavailable')).toBe('—')
    })
  })

  describe('formatHours', () => {
    it.each(hourValues)('activity and responsiveness produce identical output for %sh', (v) => {
      expect(activityFormatHours(v)).toBe(formatHours(v))
      expect(responsivenessFormatHours(v)).toBe(formatHours(v))
    })

    it('returns em-dash for unavailable from all modules', () => {
      expect(formatHours('unavailable')).toBe('—')
      expect(activityFormatHours('unavailable')).toBe('—')
      expect(responsivenessFormatHours('unavailable')).toBe('—')
    })
  })

  describe('formatCount', () => {
    it.each(countValues)('responsiveness module produces identical output for %d', (v) => {
      expect(responsivenessFormatCount(v)).toBe(formatCount(v))
    })

    it('returns em-dash for unavailable', () => {
      expect(formatCount('unavailable')).toBe('—')
      expect(responsivenessFormatCount('unavailable')).toBe('—')
    })
  })
})
