import { describe, expect, it } from 'vitest'
import { getMergeRateGuidance } from './merge-rate-guidance'

describe('activity/merge-rate-guidance', () => {
  it('classifies strong merge throughput at 70% and above', () => {
    const guidance = getMergeRateGuidance(7, 10)

    expect(guidance.percentile).toBeGreaterThanOrEqual(0)
    expect(guidance.percentileLabel).toMatch(/Top \d+%|Bottom \d+%/)
    expect(guidance.tableDisplayValue).toMatch(/70\.0%/)
    expect(guidance.tableDisplayValue).toMatch(/Top \d+%|Bottom \d+%/)
  })

  it('classifies mixed merge throughput from 40% to 69.9%', () => {
    const guidance = getMergeRateGuidance(2, 4)

    expect(guidance.percentile).toBeGreaterThanOrEqual(0)
    expect(guidance.percentileLabel).toMatch(/Top \d+%|Bottom \d+%/)
    expect(guidance.summary).toBeDefined()
  })

  it('classifies weak merge throughput below 40%', () => {
    const guidance = getMergeRateGuidance(1, 5)

    expect(guidance.percentile).toBeGreaterThanOrEqual(0)
    expect(guidance.percentileLabel).toMatch(/Top \d+%|Bottom \d+%/)
    expect(guidance.recommendation).toMatch(/reduce pr backlog/i)
  })

  it('returns unavailable when opened PR count is missing', () => {
    const guidance = getMergeRateGuidance('unavailable', 'unavailable')

    expect(guidance.percentile).toBe(0)
    expect(guidance.tableDisplayValue).toBe('—')
  })
})
