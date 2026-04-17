import type { AnalysisResult, ReleaseHealthResult, Unavailable } from '@/lib/analyzer/analysis-result'
import type { HealthScoreRecommendation } from '@/lib/scoring/health-score'
import {
  COOLING_RELEASE_CUTOFF_DAYS,
  RECOMMENDATION_PERCENTILE_GATE,
  SEMVER_ADOPTION_THRESHOLD,
  STALE_RELEASE_CUTOFF_DAYS,
} from '@/lib/scoring/config-loader'

/**
 * Release Health recommendations (P2-F09 / #69).
 *
 * Generates up to one staleness-tier rec plus any number of Documentation
 * recs (adopt-semver or adopt-scheme, improve-notes, promote-tags). Pure
 * function — consumes the result and the host-bucket percentiles that drive
 * the `RECOMMENDATION_PERCENTILE_GATE`.
 */

export interface ReleaseHealthRecommendationContext {
  /** Percentile of the Activity bucket for this repo. Suppresses Activity-bucket recs when clear of the gate. */
  activityPercentile: number
  /** Percentile of the Documentation bucket for this repo. Suppresses Documentation-bucket recs when clear of the gate. */
  documentationPercentile: number
}

const NOTES_FLOOR = 0.5
const TAG_PROMOTION_CEILING = 0.5

export function generateReleaseHealthRecommendations(
  result: AnalysisResult,
  context: ReleaseHealthRecommendationContext,
): HealthScoreRecommendation[] {
  const rh = result.releaseHealthResult
  if (!rh || rh === 'unavailable') return []

  const recs: HealthScoreRecommendation[] = []
  const activityGated = context.activityPercentile < RECOMMENDATION_PERCENTILE_GATE
  const documentationGated = context.documentationPercentile < RECOMMENDATION_PERCENTILE_GATE

  if (activityGated) {
    const staleRec = pickStalenessTier(rh, result.commits90d)
    if (staleRec !== null) recs.push(staleRec)
  }

  if (documentationGated) {
    const schemeRec = pickSchemeRec(rh)
    if (schemeRec !== null) recs.push(schemeRec)

    if (typeof rh.releaseNotesQualityRatio === 'number' && rh.releaseNotesQualityRatio < NOTES_FLOOR) {
      recs.push({
        bucket: 'Documentation',
        key: 'release_improve_notes',
        percentile: context.documentationPercentile,
        message: 'Expand release notes to describe what changed in each release — adopters rely on them to gauge upgrade impact',
        tab: 'documentation',
      })
    }

    if (typeof rh.tagToReleaseRatio === 'number' && rh.tagToReleaseRatio > TAG_PROMOTION_CEILING) {
      recs.push({
        bucket: 'Documentation',
        key: 'release_promote_tags',
        percentile: context.documentationPercentile,
        message: 'Promote git tags to GitHub Releases so users have a clear list of shipped versions with associated changelog entries',
        tab: 'documentation',
      })
    }
  }

  return recs
}

function pickStalenessTier(
  rh: ReleaseHealthResult,
  commits90d: number | Unavailable,
): HealthScoreRecommendation | null {
  if (rh.totalReleasesAnalyzed === 0) {
    return {
      bucket: 'Activity',
      key: 'release_never_released',
      percentile: 0,
      message: 'Cut a first release (and tag it on GitHub) so adopters have a clear starting point and upgrade path',
      tab: 'activity',
    }
  }

  const days = rh.daysSinceLastRelease
  if (days === 'unavailable') return null

  if (days >= STALE_RELEASE_CUTOFF_DAYS) {
    return {
      bucket: 'Activity',
      key: 'release_stale',
      percentile: 0,
      message: `The most recent release was ${days} days ago — consider cutting a maintenance release or archiving the repository so downstream users know its status`,
      tab: 'activity',
    }
  }

  if (days >= COOLING_RELEASE_CUTOFF_DAYS && typeof commits90d === 'number' && commits90d > 0) {
    return {
      bucket: 'Activity',
      key: 'release_cooling',
      percentile: 0,
      message: `It has been ${days} days since the last release, even though commits are landing — consider cutting a release to reflect recent work`,
      tab: 'activity',
    }
  }

  return null
}

function pickSchemeRec(rh: ReleaseHealthResult): HealthScoreRecommendation | null {
  if (rh.versioningScheme === 'calver') return null
  if (rh.versioningScheme === 'unavailable') return null

  if (rh.versioningScheme === 'unrecognized') {
    return {
      bucket: 'Documentation',
      key: 'release_adopt_scheme',
      percentile: 0,
      message: 'Adopt a consistent versioning scheme (semver, CalVer, or a documented alternative) so adopters can reason about upgrades',
      tab: 'documentation',
    }
  }

  const ratio = rh.semverComplianceRatio
  if (typeof ratio === 'number' && ratio < SEMVER_ADOPTION_THRESHOLD) {
    return {
      bucket: 'Documentation',
      key: 'release_adopt_semver',
      percentile: 0,
      message: 'Adopt semantic versioning (MAJOR.MINOR.PATCH) for release tags so adopters can interpret upgrade risk automatically',
      tab: 'documentation',
    }
  }

  return null
}
