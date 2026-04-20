import type { AnalysisResult } from '@/lib/analyzer/analysis-result'
import { buildEcosystemRows } from '@/lib/ecosystem-map/chart-data'
import { getScoreBadges, type ScoreBadgeDefinition } from './score-config'
import { getHealthScore, type HealthScoreDefinition } from '@/lib/scoring/health-score'
import { computeCommunityCompleteness } from '@/lib/community/completeness'
import { computeGovernanceCompleteness } from '@/lib/governance/completeness'
import { computeReleaseHealthCompleteness } from '@/lib/release-health/completeness'
import type { ScoreTone } from '@/specs/008-metric-cards/contracts/metric-card-props'

/**
 * A "lens readout" — a cross-cutting completeness summary that is rendered on
 * the scorecard as a small pill below the scored dimensions. Lenses do NOT
 * feed the composite OSS Health Score (guarded by health-score.test.ts).
 *
 * This is the extensibility seam for additional lenses (Governance etc. —
 * tracked in #191). Adding a lens is: write a compute{Lens}Completeness
 * function, push an entry into the lenses array here.
 */
export interface LensReadout {
  key: string            // 'community' | 'governance' | ...
  label: string          // 'Community'
  percentileLabel: string
  detail: string         // e.g. 'N of M signals'
  tooltip: string
  tone: ScoreTone
}

export interface MetricCardViewModel {
  repo: string
  name: string
  createdAtLabel: string
  starsLabel: string
  forksLabel: string
  watchersLabel: string
  description: string
  primaryLanguage: string
  details: Array<{ label: string; value: string }>
  missingFields: string[]
  profile: ReturnType<typeof buildEcosystemRows>[number]['profile']
  scoreBadges: ScoreBadgeDefinition[]
  healthScore: HealthScoreDefinition
  lenses: LensReadout[]
  /**
   * Raw analysis result retained so the scorecard can recompute the health
   * score when the user toggles the solo/community override. Session-scoped
   * — never persisted.
   */
  analysisResult: AnalysisResult
}

export function buildMetricCardViewModels(results: AnalysisResult[]): MetricCardViewModel[] {
  const ecosystemRows = new Map(buildEcosystemRows(results).map((row) => [row.repo, row]))

  return results.map((result) => {
    const ecosystemRow = ecosystemRows.get(result.repo)

    return {
      repo: result.repo,
      name: formatText(result.name, result.repo),
      createdAtLabel: formatDate(result.createdAt),
      starsLabel: formatMetric(result.stars),
      forksLabel: formatMetric(result.forks),
      watchersLabel: formatMetric(result.watchers),
      description: formatText(result.description),
      primaryLanguage: formatText(result.primaryLanguage),
      details: [
        { label: 'Primary language', value: formatText(result.primaryLanguage) },
        { label: 'Description', value: formatText(result.description) },
        { label: 'Created', value: formatDate(result.createdAt) },
        { label: 'Age', value: formatAge(result.ageInDays) },
        { label: 'Stars / year', value: formatNormalizedRate(result.starsPerYear, '/yr') },
        { label: 'Contributors / year', value: formatNormalizedRate(result.contributorsPerYear, '/yr') },
        { label: 'Commits / month', value: formatNormalizedRate(result.commitsPerMonthLifetime, '/mo') },
        { label: 'Growth trajectory', value: formatTrajectory(result.growthTrajectory) },
        { label: 'Commits (30d)', value: formatMetric(result.commits30d) },
        { label: 'Commits (90d)', value: formatMetric(result.commits90d) },
        { label: 'Releases (12mo)', value: formatMetric(result.releases12mo) },
        { label: 'PRs opened (90d)', value: formatMetric(result.prsOpened90d) },
        { label: 'PRs merged (90d)', value: formatMetric(result.prsMerged90d) },
        { label: 'Open issues', value: formatMetric(result.issuesOpen) },
        { label: 'Issues closed (90d)', value: formatMetric(result.issuesClosed90d) },
        { label: 'Active contributors (90d)', value: formatMetric(result.uniqueCommitAuthors90d) },
        { label: 'Total contributors', value: formatMetric(result.totalContributors) },
      ],
      missingFields: result.missingFields,
      profile: ecosystemRow?.profile ?? null,
      scoreBadges: getScoreBadges(result),
      healthScore: getHealthScore(result),
      lenses: buildLensReadouts(result),
      analysisResult: result,
    }
  })
}

/**
 * Registered lenses, in display order. Adding a new lens = one entry here
 * plus the corresponding compute{Lens}Completeness function.
 */
function buildLensReadouts(result: AnalysisResult): LensReadout[] {
  const lenses: LensReadout[] = []

  const community = computeCommunityCompleteness(result)
  if (community.ratio !== null) {
    lenses.push({
      key: 'community',
      label: 'Community',
      percentileLabel: community.percentile !== null ? `${community.percentile}th percentile` : '—',
      detail: `${community.present.length} of ${community.present.length + community.missing.length} signals`,
      tooltip: 'Community is a cross-cutting lens — count of community signals present. Does not feed the composite OSS Health Score.',
      tone: community.tone,
    })
  }

  const governance = computeGovernanceCompleteness(result)
  if (governance.ratio !== null) {
    lenses.push({
      key: 'governance',
      label: 'Governance',
      percentileLabel: governance.percentile !== null ? `${governance.percentile}th percentile` : '—',
      detail: `${governance.present.length} of ${governance.present.length + governance.missing.length} signals`,
      tooltip: 'Governance is a cross-cutting lens — count of governance signals present (license, contributing, CoC, security, changelog, branch protection, code review, maintainers). Does not feed the composite OSS Health Score.',
      tone: governance.tone,
    })
  }

  // Release Health lens renders even when ratio is null, so users can see
  // the analyzer evaluated the signals (and that there was nothing verifiable
  // to score). Hiding the readout would falsely suggest the lens doesn't
  // apply to this repo.
  if (result.releaseHealthResult !== undefined) {
    const releaseHealth = computeReleaseHealthCompleteness(result)
    const hasData = releaseHealth.ratio !== null
    lenses.push({
      key: 'release-health',
      label: 'Release Health',
      percentileLabel: hasData && releaseHealth.percentile !== null
        ? `${releaseHealth.percentile}th percentile`
        : 'Insufficient verified public data',
      detail: hasData
        ? `${releaseHealth.present.length} of ${releaseHealth.present.length + releaseHealth.missing.length} signals`
        : 'No verified release-health signals',
      tooltip: 'Release Health is a cross-cutting lens — count of release-health signals present (release frequency, time since last release, semver compliance, release notes quality, tag-to-release promotion). Linear fallback until per-bracket calibration lands in #152. Does not feed the composite OSS Health Score.',
      tone: releaseHealth.tone,
    })
  }

  return lenses
}

function formatMetric(value: number | 'unavailable') {
  if (typeof value === 'number') {
    return new Intl.NumberFormat('en-US').format(value)
  }

  return '—'
}

function formatAge(value: number | 'unavailable' | undefined) {
  if (typeof value !== 'number') return '—'
  if (value < 30) return `${Math.round(value)} d`
  if (value < 365) return `${Math.round(value / 30.4375)} mo`
  const years = value / 365.25
  return `${years.toFixed(years >= 10 ? 0 : 1)} yr`
}

function formatNormalizedRate(
  value: number | 'too-new' | 'unavailable' | undefined,
  unit: '/yr' | '/mo',
) {
  if (value === undefined || value === 'unavailable') return '—'
  if (value === 'too-new') return 'Too new to normalize'
  const formatted = value >= 100
    ? new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value)
    : new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(value)
  return `${formatted} ${unit}`
}

function formatTrajectory(value: 'accelerating' | 'stable' | 'declining' | 'unavailable' | undefined) {
  if (value === undefined || value === 'unavailable') return 'Insufficient verified public data'
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function formatText(value: string | 'unavailable', fallback = '—') {
  if (value === 'unavailable' || value.trim().length === 0) {
    return fallback
  }

  return value
}

function formatDate(value: string | 'unavailable') {
  if (value === 'unavailable') {
    return '—'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
  }).format(date)
}
