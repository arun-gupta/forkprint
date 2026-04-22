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
  labels: string[]
  /** True when the issue carries the `gitvote/passed` label — TOC vote approved. */
  approved: boolean
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
  /** Maps normalized repo URL → CNCF project maturity level (only entries that have a project field) */
  projectStatusMap: Map<string, 'sandbox' | 'incubating' | 'graduated'>
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

// ── Org-level CNCF Candidacy Scan (issue #400) ──────────────────────────────

/** Pill shown on each repo in the org-level candidacy picker */
export type LandscapeProjectStatus = 'graduated' | 'incubating' | 'sandbox' | 'landscape' | null

/** Binary Track 1 criteria (auto-detectable, 9 criteria out of 9) */
export interface CandidacyTrack1 {
  license: boolean
  contributing: boolean
  codeOfConduct: boolean
  maintainers: boolean
  security: boolean
  roadmap: boolean
  website: boolean
  adopters: boolean
  landscape: boolean
}

/** Track 2 evidence (partially auto-detectable, 9 criteria out of 9) */
export interface CandidacyTrack2 {
  lfxInsights: boolean
  projectSummary: boolean
  roadmapContext: boolean
  specOrStandard: boolean
  businessSeparation: boolean
  cloudNativeIntegration: boolean
  cloudNativeOverlap: boolean
  similarProjects: boolean
  tagReview: boolean
}

export type CandidacyTier = 'strong' | 'needs-work' | 'not-ready'

export interface CandidacyGap {
  catalogId: string
  title: string
}

/** Full per-repo candidacy scan result */
export interface CandidacyRepoResult {
  repo: string
  stars: number
  landscapeStatus: LandscapeProjectStatus
  track1Score: number
  track1: CandidacyTrack1
  track2Score: number
  track2: CandidacyTrack2
  tier: CandidacyTier
  topGaps: CandidacyGap[]
  readmeFirstParagraph: string | null
}
