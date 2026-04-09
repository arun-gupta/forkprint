import type { AnalysisResult } from '@/lib/analyzer/analysis-result'
import { getCalibrationForStars, interpolatePercentile, formatPercentileLabel } from '@/lib/scoring/config-loader'

export interface EcosystemSpectrumProfile {
  reachPercentile: number
  reachLabel: string
  engagementPercentile: number
  engagementLabel: string
  attentionPercentile: number
  attentionLabel: string
  forkRate: number
  watcherRate: number
  forkRateLabel: string
  watcherRateLabel: string
}

export function buildSpectrumProfile(result: AnalysisResult): EcosystemSpectrumProfile | null {
  if (
    typeof result.stars !== 'number' ||
    typeof result.forks !== 'number' ||
    typeof result.watchers !== 'number' ||
    result.stars <= 0
  ) {
    return null
  }

  const forkRate = (result.forks / result.stars) * 100
  const watcherRate = (result.watchers / result.stars) * 100
  const cal = getCalibrationForStars(result.stars)

  const reachPercentile = interpolatePercentile(result.stars, cal.stars)
  const engagementPercentile = interpolatePercentile(result.forks / result.stars, cal.forkRate)
  const attentionPercentile = interpolatePercentile(result.watchers / result.stars, cal.watcherRate)

  return {
    reachPercentile,
    reachLabel: formatPercentileLabel(reachPercentile),
    engagementPercentile,
    engagementLabel: formatPercentileLabel(engagementPercentile),
    attentionPercentile,
    attentionLabel: formatPercentileLabel(attentionPercentile),
    forkRate,
    watcherRate,
    forkRateLabel: formatRateLabel(forkRate),
    watcherRateLabel: formatRateLabel(watcherRate),
  }
}

export function buildSpectrumProfiles(results: AnalysisResult[]) {
  return Object.fromEntries(
    results
      .map((result) => [result.repo, buildSpectrumProfile(result)] as const)
      .filter((entry): entry is readonly [string, EcosystemSpectrumProfile] => entry[1] !== null),
  )
}

function formatRateLabel(value: number) {
  return `${value.toFixed(1)}%`
}
