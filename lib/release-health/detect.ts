import type { ReleaseHealthResult, Unavailable } from '@/lib/analyzer/analysis-result'
import { RELEASE_NOTES_SUBSTANTIVE_FLOOR } from '@/lib/scoring/config-loader'
import { detectVersioningScheme, isSemver } from './semver'

export interface RawRelease {
  tagName: string
  name: string | null
  body: string | null
  isPrerelease: boolean
  createdAt: string
  publishedAt: string | null
}

export interface DetectReleaseHealthInput {
  releases: RawRelease[]
  totalReleasesAllTime: number
  totalTags: number | Unavailable
  now: Date
}

const MS_PER_DAY = 24 * 60 * 60 * 1000

export function detectReleaseHealth(input: DetectReleaseHealthInput): ReleaseHealthResult | Unavailable {
  const { releases, totalReleasesAllTime, totalTags, now } = input

  if (releases.length === 0 && totalTags === 'unavailable') {
    return 'unavailable'
  }

  const totalReleasesAnalyzed = releases.length

  const latest = releases[0]
  const latestIso = latest?.publishedAt ?? latest?.createdAt ?? null
  const daysSinceLastRelease: number | Unavailable = latestIso
    ? Math.max(0, Math.floor((now.getTime() - new Date(latestIso).getTime()) / MS_PER_DAY))
    : 'unavailable'

  const releaseFrequency: number | Unavailable = computeReleaseFrequency(releases, totalReleasesAllTime, now)

  const semverComplianceRatio: number | Unavailable = releases.length === 0
    ? 'unavailable'
    : releases.filter((r) => isSemver(r.tagName)).length / releases.length

  const releaseNotesQualityRatio: number | Unavailable = releases.length === 0
    ? 'unavailable'
    : releases.filter((r) => isSubstantive(r.body)).length / releases.length

  const preReleaseRatio: number | Unavailable = releases.length === 0
    ? 'unavailable'
    : releases.filter((r) => r.isPrerelease).length / releases.length

  const tagToReleaseRatio: number | Unavailable = totalTags === 'unavailable'
    ? 'unavailable'
    : totalReleasesAllTime === 0 || totalTags === 0
      // Nothing to compare against — a repo with no releases (or no tags)
      // has no promotion signal to measure, per Constitution §II (no
      // estimation). Emitting 0 here would falsely classify as "present".
      ? 'unavailable'
      : Math.max(0, totalTags - totalReleasesAllTime) / totalTags

  const versioningScheme = releases.length === 0
    ? 'unavailable'
    : detectVersioningScheme(releases.map((r) => r.tagName))

  return {
    totalReleasesAnalyzed,
    totalTags,
    releaseFrequency,
    daysSinceLastRelease,
    semverComplianceRatio,
    releaseNotesQualityRatio,
    tagToReleaseRatio,
    preReleaseRatio,
    versioningScheme,
  }
}

function computeReleaseFrequency(
  releases: RawRelease[],
  totalReleasesAllTime: number,
  now: Date,
): number | Unavailable {
  if (totalReleasesAllTime < 2) return 'unavailable'
  if (releases.length === 0) return 'unavailable'
  const nowMs = now.getTime()
  const cutoffMs = nowMs - 365 * MS_PER_DAY
  const within12mo = releases.filter((r) => {
    const iso = r.publishedAt ?? r.createdAt
    const ms = iso ? new Date(iso).getTime() : NaN
    return Number.isFinite(ms) && ms >= cutoffMs
  })
  return within12mo.length
}

function isSubstantive(body: string | null): boolean {
  if (body === null) return false
  return body.trim().length >= RELEASE_NOTES_SUBSTANTIVE_FLOOR
}
