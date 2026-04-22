export type FoundationTarget = 'none' | 'cncf-sandbox'

export type AspirantFieldStatus = 'ready' | 'partial' | 'missing' | 'human-only'

export interface AspirantField {
  id: string
  label: string
  status: AspirantFieldStatus
  weight: number
  pointsEarned: number
  homeTab?: string
  evidence?: string
  remediationHint?: string
  explanatoryNote?: string
}

export type CNCFTag =
  | 'tag-security'
  | 'tag-operational-resilience'
  | 'tag-workloads-foundation'
  | 'tag-infrastructure'
  | 'tag-developer-experience'

export interface TAGRecommendation {
  primaryTag: CNCFTag | null
  matchedSignals: string[]
  fallbackNote: string | null
}

export type ApplicationFieldAssessment = 'strong' | 'adequate' | 'weak' | 'empty'

export interface ParsedApplicationField {
  fieldId: string
  content: string | null
  assessment: ApplicationFieldAssessment
  recommendation: string | null
}

export interface SandboxApplicationIssue {
  issueNumber: number
  issueUrl: string
  title: string
  state: 'OPEN' | 'CLOSED'
  createdAt: string
  parsedFields?: ParsedApplicationField[]
}

export interface AspirantReadinessResult {
  foundationTarget: FoundationTarget
  readinessScore: number
  autoFields: AspirantField[]
  humanOnlyFields: AspirantField[]
  readyCount: number
  totalAutoCheckable: number
  alreadyInLandscape: boolean
  tagRecommendation: TAGRecommendation
  sandboxApplication: SandboxApplicationIssue | null
}

export interface SandboxIssueData {
  issues: SandboxApplicationIssue[]
  fetchedAt: number
}

export interface CNCFLandscapeData {
  repoUrls: Set<string>
  homepageUrls: Set<string>
  fetchedAt: number
  categories: LandscapeCategory[]
}

export interface LandscapeCategory {
  name: string
  subcategoryName: string
  projectRepos: string[]
}

export interface CNCFFieldBadge {
  fieldId: string
  label: string
  status: AspirantFieldStatus
}
