/**
 * Security View Props — UI contract for the Security tab
 *
 * This contract defines the shape of data the SecurityView component expects.
 * It is derived from SecurityResult + SecurityScoreDefinition in the analyzer.
 */

import type { ScoreTone } from '@/specs/008-metric-cards/contracts/metric-card-props'

/** A single Scorecard check displayed in the UI */
export interface ScorecardCheckDisplay {
  name: string
  score: number | 'indeterminate'
  reason: string
}

/** A single direct security check displayed in the UI */
export interface DirectCheckDisplay {
  name: string
  label: string
  detected: boolean | 'unavailable'
  details: string | null
}

/** Recommendation displayed in the Security section */
export interface SecurityRecommendationDisplay {
  category: string
  item: string
  text: string
  weight: number
}

/** Props for the SecurityView component */
export interface SecurityViewProps {
  /** Composite security score (0-100) or insufficient data */
  score: number | 'Insufficient verified public data'
  /** Visual tone for the score badge */
  tone: ScoreTone
  /** Percentile within star bracket, null if calibration unavailable */
  percentile: number | null
  /** Star bracket label (e.g., "popular", "established") */
  bracketLabel: string | null

  /** Which scoring mode was used */
  mode: 'scorecard' | 'direct-only'

  /** Scorecard data (null when mode is "direct-only") */
  scorecard: {
    overallScore: number
    checks: ScorecardCheckDisplay[]
  } | null

  /** Direct check results (always present) */
  directChecks: DirectCheckDisplay[]

  /** Actionable recommendations sorted by weight descending */
  recommendations: SecurityRecommendationDisplay[]
}
