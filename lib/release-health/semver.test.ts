import { describe, expect, it } from 'vitest'
import { detectVersioningScheme, isCalVer, isSemver } from './semver'

describe('isSemver', () => {
  it('matches standard semver tags', () => {
    expect(isSemver('v1.2.3')).toBe(true)
    expect(isSemver('1.2.3')).toBe(true)
    expect(isSemver('v1.0.0-rc.1')).toBe(true)
    expect(isSemver('0.0.0')).toBe(true)
    expect(isSemver('1.2.3+build.7')).toBe(true)
    expect(isSemver('1.0.0-alpha+001')).toBe(true)
  })

  it('rejects non-semver tags', () => {
    expect(isSemver('1.2')).toBe(false)
    expect(isSemver('2026.04.17')).toBe(false)
    expect(isSemver('release-2024')).toBe(false)
    expect(isSemver('nightly')).toBe(false)
    expect(isSemver('')).toBe(false)
  })
})

describe('isCalVer', () => {
  it('matches calver shapes', () => {
    expect(isCalVer('2026.04.17')).toBe(true)
    expect(isCalVer('2026-04-17')).toBe(true)
    expect(isCalVer('24.04')).toBe(true)
    expect(isCalVer('24.04.2')).toBe(true)
    expect(isCalVer('v2024.10')).toBe(true)
  })

  it('rejects non-calver', () => {
    expect(isCalVer('1.2.3')).toBe(false)
    expect(isCalVer('v0.5.1')).toBe(false)
    expect(isCalVer('')).toBe(false)
  })
})

describe('detectVersioningScheme', () => {
  it('returns unavailable for empty input', () => {
    expect(detectVersioningScheme([])).toBe('unavailable')
  })

  it('returns semver when more than half the tags are semver', () => {
    expect(detectVersioningScheme(['v1.0.0', 'v1.1.0', 'v1.2.0'])).toBe('semver')
    expect(detectVersioningScheme(['v1.0.0', 'v1.1.0', 'v1.2.0', 'nightly', 'foo'])).toBe('semver')
  })

  it('returns calver when more than half the tags are calver', () => {
    expect(detectVersioningScheme(['2026.04.17', '2026.04.18'])).toBe('calver')
    expect(detectVersioningScheme(['2024.01', '2024.02', '2024.03', 'v1.0.0'])).toBe('calver')
  })

  it('returns unrecognized when no scheme dominates', () => {
    expect(detectVersioningScheme(['foo', 'bar', 'baz'])).toBe('unrecognized')
    // 50/50 split does not qualify as dominant under a strict ">" threshold.
    expect(detectVersioningScheme(['v1.0.0', 'v1.1.0', 'bar', 'baz'])).toBe('unrecognized')
  })

  it('treats pre-release semver tags as semver (per SPEC)', () => {
    expect(detectVersioningScheme(['v1.0.0-rc.1', 'v1.0.0-rc.2', 'v1.0.0-rc.3'])).toBe('semver')
  })
})
