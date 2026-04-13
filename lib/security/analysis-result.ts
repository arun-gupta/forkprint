import type { Unavailable } from '@/lib/analyzer/analysis-result'
import type { ScoreTone } from '@/specs/008-metric-cards/contracts/metric-card-props'

export type RiskLevel = 'Critical' | 'High' | 'Medium' | 'Low'

export type RecommendationCategoryKey =
  | 'critical_issues'
  | 'quick_wins'
  | 'workflow_hardening'
  | 'best_practices'

export type RecommendationSource = 'scorecard' | 'direct_check'

export interface ScorecardCheck {
  name: string
  score: number
  reason: string
}

export interface ScorecardAssessment {
  overallScore: number
  checks: ScorecardCheck[]
  scorecardVersion: string
}

export type DirectSecurityCheckName = 'security_policy' | 'dependabot' | 'ci_cd' | 'branch_protection'

export interface DirectSecurityCheck {
  name: DirectSecurityCheckName
  detected: boolean | Unavailable
  details: string | null
}

export interface SecurityResult {
  scorecard: ScorecardAssessment | Unavailable
  directChecks: DirectSecurityCheck[]
  branchProtectionEnabled: boolean | Unavailable
}

export interface SecurityRecommendation {
  bucket: 'security'
  category: RecommendationSource
  item: string
  weight: number
  text: string
  title?: string
  riskLevel?: RiskLevel
  evidence?: string
  explanation?: string
  remediationHint?: string | null
  docsUrl?: string | null
  groupCategory?: RecommendationCategoryKey
}

export interface SecurityScoreDefinition {
  value: number | 'Insufficient verified public data'
  tone: ScoreTone
  percentile: number | null
  bracketLabel: string | null
  compositeScore: number
  scorecardScore: number | null
  directCheckScore: number
  mode: 'scorecard' | 'direct-only'
  recommendations: SecurityRecommendation[]
}
