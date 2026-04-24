import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getMergeRateGuidance } from './merge-rate-guidance'

// Spy on interpolatePercentile so we can pin the percentile to exact boundary values
vi.mock('@/lib/scoring/config-loader', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/scoring/config-loader')>()
  return {
    ...actual,
    interpolatePercentile: vi.fn(actual.interpolatePercentile),
  }
})

describe('activity/merge-rate-guidance', () => {
  it('classifies strong merge throughput at 70% and above', () => {
    const guidance = getMergeRateGuidance(7, 10)

    expect(guidance.percentile).toBeGreaterThanOrEqual(0)
    expect(guidance.percentileLabel).toMatch(/\d+\w{2} percentile/)
    expect(guidance.tableDisplayValue).toMatch(/70\.0%/)
    expect(guidance.tableDisplayValue).toMatch(/\d+\w{2} percentile/)
  })

  it('classifies mixed merge throughput from 40% to 69.9%', () => {
    const guidance = getMergeRateGuidance(2, 4)

    expect(guidance.percentile).toBeGreaterThanOrEqual(0)
    expect(guidance.percentileLabel).toMatch(/\d+\w{2} percentile/)
    expect(guidance.summary).toBeDefined()
  })

  it('classifies weak merge throughput below 40%', () => {
    const guidance = getMergeRateGuidance(1, 5)

    expect(guidance.percentile).toBeGreaterThanOrEqual(0)
    expect(guidance.percentileLabel).toMatch(/\d+\w{2} percentile/)
    expect(guidance.recommendation).toMatch(/reduce pr backlog/i)
  })

  it('returns unavailable when opened PR count is missing', () => {
    const guidance = getMergeRateGuidance('unavailable', 'unavailable')

    expect(guidance.percentile).toBe(0)
    expect(guidance.tableDisplayValue).toBe('—')
  })
})

// CON-03: boundary tests asserting summary/recommendation change at the
// 75th-percentile crossing (the threshold defined in percentileToTone()).
describe('activity/merge-rate-guidance — CON-03 tone boundary', () => {
  let interpolateMock: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    const configLoader = await import('@/lib/scoring/config-loader')
    interpolateMock = configLoader.interpolatePercentile as ReturnType<typeof vi.fn>
    interpolateMock.mockReset()
  })

  it('returns the "healthy" summary at exactly the 75th-percentile boundary', () => {
    interpolateMock.mockReturnValue(75)
    const guidance = getMergeRateGuidance(3, 4)
    expect(guidance.summary).toBe('Healthy merge throughput relative to incoming PR volume.')
    expect(guidance.recommendation).toMatch(/keep reviewer capacity/i)
  })

  it('returns the "warning" summary just below the 75th-percentile boundary (74)', () => {
    interpolateMock.mockReturnValue(74)
    const guidance = getMergeRateGuidance(3, 4)
    expect(guidance.summary).toMatch(/meaningful share of opened PRs are not being merged/i)
    expect(guidance.recommendation).toMatch(/triage stalled PRs/i)
  })

  it('returns the "warning" summary at exactly the 40th-percentile boundary', () => {
    interpolateMock.mockReturnValue(40)
    const guidance = getMergeRateGuidance(3, 4)
    expect(guidance.summary).toMatch(/meaningful share of opened PRs are not being merged/i)
  })

  it('returns the "low throughput" summary just below the 40th-percentile boundary (39)', () => {
    interpolateMock.mockReturnValue(39)
    const guidance = getMergeRateGuidance(3, 4)
    expect(guidance.summary).toBe('Many opened PRs are not reaching merge in the selected window.')
    expect(guidance.recommendation).toMatch(/reduce PR backlog/i)
  })
})
