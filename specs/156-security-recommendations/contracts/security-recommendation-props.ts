/**
 * Security Recommendation Contracts — enriched recommendation types
 *
 * Extends the existing SecurityRecommendation with structured fields
 * for richer display in the Security tab and Recommendations view.
 */

/** Risk levels aligned with OpenSSF Scorecard documentation */
export type RiskLevel = 'Critical' | 'High' | 'Medium' | 'Low'

/** Priority-driven recommendation category keys for grouping */
export type RecommendationCategoryKey =
  | 'critical_issues'
  | 'quick_wins'
  | 'workflow_hardening'
  | 'best_practices'

/** Source of the recommendation */
export type RecommendationSource = 'scorecard' | 'direct_check'

/** A static catalog entry for a known security check */
export interface RecommendationCatalogEntry {
  /** Scorecard check name or direct check name */
  key: string
  /** Whether this covers a Scorecard check or direct check */
  source: RecommendationSource
  /** Descriptive, action-oriented title */
  title: string
  /** Risk classification from OpenSSF documentation */
  riskLevel: RiskLevel
  /** Which category this recommendation belongs to */
  groupCategory: RecommendationCategoryKey
  /** Why a low score or missing signal matters */
  whyItMatters: string
  /** Recommended action to address the finding */
  remediation: string
  /** Brief practical hint for common fixes, or null */
  remediationHint: string | null
  /** URL to relevant OpenSSF Scorecard check docs, or null */
  docsUrl: string | null
  /** Corresponding direct check name for deduplication, or null */
  directCheckMapping: string | null
}

/** Category definition for display ordering */
export interface RecommendationCategoryDefinition {
  key: RecommendationCategoryKey
  label: string
  order: number
}

/** Enriched recommendation for UI display in the Security tab */
export interface EnrichedSecurityRecommendationDisplay {
  /** Descriptive action-oriented title */
  title: string
  /** Source label for attribution */
  source: RecommendationSource
  /** Risk classification */
  riskLevel: RiskLevel
  /** Repo-specific evidence (e.g., "Token-Permissions scored 0/10") */
  evidence: string
  /** Why this finding matters */
  explanation: string
  /** Recommended action */
  remediation: string
  /** Brief practical hint, or null */
  remediationHint: string | null
  /** Link to OpenSSF check docs, or null */
  docsUrl: string | null
  /** Category key for grouping */
  groupCategory: RecommendationCategoryKey
}

/** Props for the categorized recommendations section in SecurityView */
export interface SecurityRecommendationsSectionProps {
  /** Recommendations grouped by category, in display order */
  groups: Array<{
    category: RecommendationCategoryDefinition
    recommendations: EnrichedSecurityRecommendationDisplay[]
  }>
}
