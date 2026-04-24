import type { Unavailable } from './analysis-result'

export interface DocBlob {
  text?: string
  oid?: string
}

export interface ResolvedReadme {
  path: string
  text: string | null
}

export interface RepoOverviewResponse {
  repository: {
    name: string
    description: string | null
    createdAt: string
    primaryLanguage: { name: string } | null
    stargazerCount: number
    forkCount: number
    watchers: { totalCount: number }
    issues: { totalCount: number }
    pullRequests?: { totalCount: number }
    defaultBranchRef?: { name: string } | null
    repositoryTopics?: { nodes: Array<{ topic: { name: string } }> } | null
    licenseInfo?: { spdxId: string | null; name: string | null } | null
    rootTree?: { entries: Array<{ name: string; type: string }> } | null
    docLicense?: DocBlob | null
    docLicenseLower?: DocBlob | null
    docLicenseMd?: DocBlob | null
    docLicenseMdLower?: DocBlob | null
    docLicenseTxt?: DocBlob | null
    docLicenseTxtLower?: DocBlob | null
    docCopying?: DocBlob | null
    docCopyingLower?: DocBlob | null
    docLicenseMit?: DocBlob | null
    docLicenseApache?: DocBlob | null
    docLicenseBsd?: DocBlob | null
    docContributing?: DocBlob | null
    docContributingRst?: DocBlob | null
    docContributingTxt?: DocBlob | null
    docContributingLower?: DocBlob | null
    docContributingDocs?: DocBlob | null
    docContributingGithub?: DocBlob | null
    docCodeOfConduct?: DocBlob | null
    docCodeOfConductRst?: DocBlob | null
    docCodeOfConductTxt?: DocBlob | null
    docCodeOfConductHyphenLower?: DocBlob | null
    docCodeOfConductUnderscoreLower?: DocBlob | null
    docCodeOfConductDocs?: DocBlob | null
    docCodeOfConductGithub?: DocBlob | null
    cncfAdopters?: DocBlob | null
    cncfAdoptersLower?: DocBlob | null
    cncfAdoptersPlain?: DocBlob | null
    cncfAdoptersDocs?: DocBlob | null
    cncfRoadmap?: DocBlob | null
    cncfRoadmapLower?: DocBlob | null
    cncfRoadmapDocs?: DocBlob | null
    cncfMaintainers?: DocBlob | null
    cncfMaintainersMd?: DocBlob | null
    cncfMaintainersMdLower?: DocBlob | null
    cncfCodeowners?: DocBlob | null
    cncfCodeownersGithub?: DocBlob | null
    docLicenseRst?: DocBlob | null
    docLicenseRstLower?: DocBlob | null
    docSecurity?: DocBlob | null
    docSecurityLower?: DocBlob | null
    docSecurityRst?: DocBlob | null
    docSecurityGithub?: DocBlob | null
    docSecurityGithubLower?: DocBlob | null
    docSecurityDocs?: DocBlob | null
    docSecurityDocsLower?: DocBlob | null
    docSecurityContacts?: DocBlob | null
    docChangelog?: DocBlob | null
    docChangelogPlain?: DocBlob | null
    docChangelogDocs?: DocBlob | null
    docChanges?: DocBlob | null
    docChangesRst?: DocBlob | null
    docHistory?: DocBlob | null
    docNews?: DocBlob | null
    secDependabot?: DocBlob | null
    secDependabotYaml?: DocBlob | null
    secRenovateRoot?: DocBlob | null
    secRenovateGithub?: DocBlob | null
    secRenovateConfig?: DocBlob | null
    secRenovateRc?: DocBlob | null
    hasDiscussionsEnabled?: boolean | null
    commFunding?: { oid: string } | null
    commIssueTemplateLegacyRoot?: { oid: string } | null
    commIssueTemplateLegacyGithub?: { oid: string } | null
    commIssueTemplateDir?: { entries: Array<{ name: string }> } | null
    commPrTemplateRoot?: { oid: string } | null
    commPrTemplateGithub?: { oid: string } | null
    commPrTemplateDocs?: { oid: string } | null
    commDiscussionsRecent?: {
      totalCount?: number
      pageInfo?: { hasNextPage: boolean; endCursor: string | null }
      nodes: Array<{ createdAt: string }>
    } | null
    commGovernanceRoot?: { oid: string } | null
    commGovernanceGithub?: { oid: string } | null
    commGovernanceDocs?: { oid: string } | null
    onbDevcontainerDir?: { entries: Array<{ name: string }> } | null
    onbDevcontainerJson?: { oid: string } | null
    onbDockerComposeYml?: { oid: string } | null
    onbDockerComposeYaml?: { oid: string } | null
    onbGitpod?: { oid: string } | null
    workflowDir?: {
      entries: Array<{
        name: string
        object: { text: string } | null
      }>
    } | null
  } | null
}

export interface RepoCommitAndReleasesResponse {
  repository: {
    releases: {
      totalCount: number
      nodes: Array<{
        tagName: string
        name: string | null
        description: string | null
        isPrerelease: boolean
        createdAt: string
        publishedAt: string | null
      }>
    }
    refs: { totalCount: number } | null
    defaultBranchRef: {
      target: {
        lifetime?: { totalCount: number }
        recent30: { totalCount: number }
        recent60: { totalCount: number }
        recent90: { totalCount: number }
        recent180: { totalCount: number }
        recent365?: { totalCount: number }
        recent365Commits: CommitHistoryConnection | null
      } | null
    } | null
  } | null
}

export interface SearchCount { issueCount: number }

export interface RepoActivityCountsResponse {
  prsOpened30: SearchCount
  prsOpened60: SearchCount
  prsOpened90: SearchCount
  prsOpened180: SearchCount
  prsOpened365: SearchCount
  prsMerged30: SearchCount
  prsMerged60: SearchCount
  prsMerged90: SearchCount
  prsMerged180: SearchCount
  prsMerged365: SearchCount
  issuesOpened30: SearchCount
  issuesOpened60: SearchCount
  issuesOpened90: SearchCount
  issuesOpened180: SearchCount
  issuesOpened365: SearchCount
  issuesClosed30: SearchCount
  issuesClosed60: SearchCount
  issuesClosed90: SearchCount
  issuesClosed180: SearchCount
  issuesClosed365: SearchCount
  staleIssues30: SearchCount
  staleIssues60: SearchCount
  staleIssues90: SearchCount
  staleIssues180: SearchCount
  staleIssues365: SearchCount
  goodFirstIssues?: SearchCount
  goodFirstIssuesHyphenated?: SearchCount
  goodFirstIssuesBeginner?: SearchCount
  goodFirstIssuesStarter?: SearchCount
  recentMergedPullRequests: {
    nodes: Array<{
      createdAt: string
      mergedAt: string | null
      authorAssociation?: string | null
    }>
  }
  recentClosedIssues: {
    nodes: Array<{
      createdAt: string
      closedAt: string | null
    }>
  }
}

export type RepoActivityResponse = RepoCommitAndReleasesResponse & RepoActivityCountsResponse

export interface SearchActorNode {
  login: string | null
}

export interface SearchCommentNode {
  createdAt: string
  author: SearchActorNode | null
}

export interface SearchReviewNode {
  createdAt: string
  author: SearchActorNode | null
}

export interface ResponsivenessIssueNode {
  createdAt: string
  closedAt?: string | null
  author: SearchActorNode | null
  comments: {
    totalCount: number
    nodes: SearchCommentNode[]
  }
}

export interface ResponsivenessPullRequestNode {
  createdAt: string
  author: SearchActorNode | null
  comments: {
    totalCount: number
    nodes: SearchCommentNode[]
  }
  reviews: {
    totalCount: number
    nodes: SearchReviewNode[]
  }
}

// Pass 1 metadata types — no nested comment/review nodes
export interface MetadataIssueNode {
  id: string
  createdAt: string
  closedAt?: string | null
  author: SearchActorNode | null
  comments: { totalCount: number }
}

export interface MetadataPullRequestNode {
  id: string
  createdAt: string
  author: SearchActorNode | null
  comments: { totalCount: number }
  reviews: { totalCount: number }
}

export interface RepoResponsivenessMetadataResponse {
  recentCreatedIssues: { nodes: MetadataIssueNode[] }
  recentClosedIssues: { nodes: MetadataIssueNode[] }
  recentCreatedPullRequests: { nodes: MetadataPullRequestNode[] }
  recentMergedPullRequests: { nodes: Array<{ createdAt: string; mergedAt: string | null }> }
  staleOpenPullRequests30: { issueCount: number }
  staleOpenPullRequests60: { issueCount: number }
  staleOpenPullRequests90: { issueCount: number }
  staleOpenPullRequests180: { issueCount: number }
  staleOpenPullRequests365: { issueCount: number }
}

// Pass 2 detail node — returned by node() queries
export interface DetailNode {
  id: string
  createdAt: string
  author: SearchActorNode | null
  comments?: { totalCount: number; nodes: SearchCommentNode[] }
  reviews?: { totalCount: number; nodes: SearchReviewNode[] }
}

export interface RepoResponsivenessResponse {
  recentCreatedIssues: {
    nodes: ResponsivenessIssueNode[]
  }
  recentClosedIssues: {
    nodes: ResponsivenessIssueNode[]
  }
  recentCreatedPullRequests: {
    nodes: ResponsivenessPullRequestNode[]
  }
  recentMergedPullRequests: {
    nodes: Array<{
      createdAt: string
      mergedAt: string | null
    }>
  }
  staleOpenPullRequests30: {
    issueCount: number
  }
  staleOpenPullRequests60: {
    issueCount: number
  }
  staleOpenPullRequests90: {
    issueCount: number
  }
  staleOpenPullRequests180: {
    issueCount: number
  }
  staleOpenPullRequests365: {
    issueCount: number
  }
}

export interface LegacyRepoActivityResponse {
  prsOpened?: { issueCount: number }
  prsMerged?: { issueCount: number }
  issuesClosed?: { issueCount: number }
}

export interface RepoCommitHistoryPageResponse {
  repository: {
    defaultBranchRef: {
      target: {
        recent365Commits: CommitHistoryConnection | null
      } | null
    } | null
  } | null
}

export interface CommitHistoryConnection {
  pageInfo: {
    hasNextPage: boolean
    endCursor: string | null
  }
  nodes: CommitNode[]
}

export interface CommitNode {
  authoredDate: string
  message?: string
  author: {
    name: string | null
    email: string | null
    user: {
      login: string
    } | null
  } | null
}

export interface ResponseSignal {
  firstResponderKind: 'bot' | 'human' | null
  firstHumanResponseAt: string | null
}

export interface AnalyzerError {
  message?: string
  status?: number
  retryAfter?: number | Unavailable
}
