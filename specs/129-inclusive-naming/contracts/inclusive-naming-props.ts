/**
 * UI contracts for the Inclusive Naming pane in the Documentation tab.
 * These types define the shape of data passed to UI components.
 */

export type INITier = 1 | 2 | 3

export type InclusiveNamingCheckType = 'branch' | 'description' | 'topic'

export type InclusiveNamingSeverity =
  | 'Replace immediately'
  | 'Recommended to replace'
  | 'Consider replacing'

export interface InclusiveNamingCheckProps {
  checkType: InclusiveNamingCheckType
  term: string
  passed: boolean
  tier: INITier | null
  severity: InclusiveNamingSeverity | null
  replacements: string[]
  context: string | null
}

export interface InclusiveNamingPaneProps {
  defaultBranchName: string | null
  branchCheck: InclusiveNamingCheckProps
  metadataChecks: InclusiveNamingCheckProps[]
  compositeScore: number
  recommendations: InclusiveNamingRecommendationProps[]
}

export interface InclusiveNamingRecommendationProps {
  item: string
  tier: INITier
  severity: InclusiveNamingSeverity
  replacements: string[]
  text: string
}
