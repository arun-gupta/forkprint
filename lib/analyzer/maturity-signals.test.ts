import { describe, it, expect } from 'vitest'
import { classifyGrowthTrajectory, extractMaturitySignals } from './analyze'
import { MATURITY_CONFIG } from '@/lib/scoring/config-loader'

const NOW = new Date('2026-04-20T00:00:00Z')

function daysAgo(days: number): string {
  return new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000).toISOString()
}

describe('extractMaturitySignals', () => {
  it('derives numeric ageInDays and normalized rates for an old, active repo', () => {
    const out = extractMaturitySignals({
      createdAt: daysAgo(1825), // 5 years
      stars: 10_000,
      totalContributors: 200,
      lifetimeCommits: 6000,
      recent365Commits: 1200,
      now: NOW,
    })
    expect(out.ageInDays).toBeGreaterThan(1800)
    expect(out.ageInDays).toBeLessThan(1900)
    expect(typeof out.starsPerYear).toBe('number')
    expect(typeof out.contributorsPerYear).toBe('number')
    expect(typeof out.commitsPerMonthLifetime).toBe('number')
    expect(out.commitsPerMonthRecent12mo).toBe(100)
    expect(out.lifetimeCommits).toBe(6000)
  })

  it('flags normalized rates as "too-new" when age is below the threshold', () => {
    const out = extractMaturitySignals({
      createdAt: daysAgo(30), // 30 days
      stars: 5,
      totalContributors: 2,
      lifetimeCommits: 15,
      recent365Commits: 15,
      now: NOW,
    })
    expect(out.starsPerYear).toBe('too-new')
    expect(out.contributorsPerYear).toBe('too-new')
    expect(out.commitsPerMonthLifetime).toBe('too-new')
    // growthTrajectory is age-gated at 2 years, so it's 'unavailable' here
    expect(out.growthTrajectory).toBe('unavailable')
  })

  it('propagates "unavailable" when createdAt is missing', () => {
    const out = extractMaturitySignals({
      createdAt: 'unavailable',
      stars: 100,
      totalContributors: 10,
      lifetimeCommits: 50,
      recent365Commits: 20,
      now: NOW,
    })
    expect(out.ageInDays).toBe('unavailable')
    expect(out.starsPerYear).toBe('unavailable')
    expect(out.contributorsPerYear).toBe('unavailable')
    expect(out.commitsPerMonthLifetime).toBe('unavailable')
    expect(out.growthTrajectory).toBe('unavailable')
  })

  it('propagates "unavailable" only for the commits field when lifetimeCommits is missing', () => {
    const out = extractMaturitySignals({
      createdAt: daysAgo(365),
      stars: 100,
      totalContributors: 10,
      lifetimeCommits: 'unavailable',
      recent365Commits: 50,
      now: NOW,
    })
    expect(out.commitsPerMonthLifetime).toBe('unavailable')
    expect(typeof out.starsPerYear).toBe('number')
    expect(typeof out.contributorsPerYear).toBe('number')
    // lifetime commits missing → trajectory unavailable
    expect(out.growthTrajectory).toBe('unavailable')
  })

  it('returns "unavailable" (not a wild ratio) when createdAt equals now', () => {
    const out = extractMaturitySignals({
      createdAt: NOW.toISOString(),
      stars: 10,
      totalContributors: 1,
      lifetimeCommits: 5,
      recent365Commits: 5,
      now: NOW,
    })
    // ageInDays is 0, which is below normalization threshold
    expect(out.ageInDays).toBe(0)
    expect(out.starsPerYear).toBe('too-new')
    expect(out.commitsPerMonthLifetime).toBe('too-new')
  })

  it('uses 365.25 / 30.4375 calendar constants (approximate check)', () => {
    const out = extractMaturitySignals({
      createdAt: daysAgo(3652.5), // exactly 10 years
      stars: 10_000,
      totalContributors: 100,
      lifetimeCommits: 12_000,
      recent365Commits: 120,
      now: NOW,
    })
    // 10,000 stars / 10 years = 1000 / yr
    expect(out.starsPerYear).toBeCloseTo(1000, 0)
    // 12,000 commits / 120 months = 100 /mo
    expect(out.commitsPerMonthLifetime).toBeCloseTo(100, 0)
  })
})

describe('classifyGrowthTrajectory', () => {
  const minAge = MATURITY_CONFIG.minimumTrajectoryAgeDays

  it('returns "unavailable" when age is below the minimum', () => {
    expect(classifyGrowthTrajectory(50, 50, minAge - 1)).toBe('unavailable')
  })

  it('returns "unavailable" when inputs are missing', () => {
    expect(classifyGrowthTrajectory('unavailable', 50, minAge + 1)).toBe('unavailable')
    expect(classifyGrowthTrajectory(50, 'unavailable', minAge + 1)).toBe('unavailable')
    expect(classifyGrowthTrajectory(50, 50, 'unavailable')).toBe('unavailable')
  })

  it('classifies accelerating when recent / lifetime ≥ accelerating ratio', () => {
    expect(classifyGrowthTrajectory(130, 100, minAge + 1)).toBe('accelerating')
    expect(classifyGrowthTrajectory(125, 100, minAge + 1)).toBe('accelerating')
  })

  it('classifies declining when recent / lifetime ≤ declining ratio', () => {
    expect(classifyGrowthTrajectory(50, 100, minAge + 1)).toBe('declining')
    expect(classifyGrowthTrajectory(75, 100, minAge + 1)).toBe('declining')
  })

  it('classifies stable in the middle band', () => {
    expect(classifyGrowthTrajectory(100, 100, minAge + 1)).toBe('stable')
    expect(classifyGrowthTrajectory(90, 100, minAge + 1)).toBe('stable')
    expect(classifyGrowthTrajectory(110, 100, minAge + 1)).toBe('stable')
  })

  it('guards against zero lifetime rate (division by zero)', () => {
    expect(classifyGrowthTrajectory(10, 0, minAge + 1)).toBe('unavailable')
  })
})
