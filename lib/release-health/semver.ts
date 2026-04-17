import type { VersioningScheme } from '@/lib/analyzer/analysis-result'
import { CALVER_REGEX, SEMVER_REGEX } from '@/lib/scoring/config-loader'

export function isSemver(tagName: string): boolean {
  return SEMVER_REGEX.test(tagName)
}

export function isCalVer(tagName: string): boolean {
  return CALVER_REGEX.test(tagName)
}

export function detectVersioningScheme(tagNames: string[]): VersioningScheme | 'unavailable' {
  if (tagNames.length === 0) return 'unavailable'
  let semverCount = 0
  let calverCount = 0
  for (const tag of tagNames) {
    if (isSemver(tag)) semverCount++
    else if (isCalVer(tag)) calverCount++
  }
  const threshold = tagNames.length / 2
  if (semverCount > threshold) return 'semver'
  if (calverCount > threshold) return 'calver'
  return 'unrecognized'
}
