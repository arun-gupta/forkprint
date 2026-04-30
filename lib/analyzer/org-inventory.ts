import type { RateLimitState } from './analysis-result'
import { queryGitHubGraphQL } from './github-graphql'

export interface OrgRepoNode {
  name: string
  description: string | null
  primaryLanguage: { name: string } | null
  repositoryTopics: {
    nodes: Array<{ topic: { name: string } | null } | null>
  }
  stargazerCount: number
  forkCount: number
  isFork: boolean
  parent?: { nameWithOwner: string } | null
  watchers: { totalCount: number }
  issues: { totalCount: number }
  pushedAt: string | null
  isArchived: boolean
  diskUsage: number | null
  visibility?: 'PUBLIC' | 'PRIVATE' | 'INTERNAL' | null
  isPrivate?: boolean
  licenseInfo: {
    spdxId: string | null
    name: string | null
  } | null
  url: string
}

export interface OrgRepoSummary {
  repo: string
  name: string
  description: string | 'unavailable'
  primaryLanguage: string | 'unavailable'
  stars: number | 'unavailable'
  forks: number | 'unavailable'
  watchers: number | 'unavailable'
  openIssues: number | 'unavailable'
  pushedAt: string | 'unavailable'
  archived: boolean
  isFork: boolean
  topics?: string[]
  sizeKb?: number | 'unavailable'
  visibility?: 'public' | 'private' | 'internal' | 'unavailable'
  licenseSpdxId?: string | 'unavailable'
  licenseName?: string | 'unavailable'
  parentRepo?: string
  url: string
}

export interface OrgInventorySummary {
  totalPublicRepos: number
  totalStars: number | 'unavailable'
  mostStarredRepos: Array<{ repo: string; stars: number | 'unavailable' }>
  mostRecentlyActiveRepos: Array<{ repo: string; pushedAt: string | 'unavailable' }>
  languageDistribution: Array<{ language: string; repoCount: number }>
  archivedRepoCount: number
  activeRepoCount: number
}

export interface OrgInventoryResponse {
  org: string
  summary: OrgInventorySummary
  results: OrgRepoSummary[]
  rateLimit: RateLimitState | null
  failure: { code: string; message: string } | null
}

interface OrgInventoryGraphQLResponse {
  organization: {
    repositories: {
      pageInfo: {
        hasNextPage: boolean
        endCursor: string | null
      }
      nodes: OrgRepoNode[]
    }
  } | null
}

export function normalizeOrgInput(input: string):
  | { valid: true; org: string }
  | { valid: false; error: string } {
  const trimmed = input.trim()
  if (!trimmed) {
    return { valid: false, error: 'A GitHub organization is required.' }
  }

  const githubUrlMatch = trimmed.match(/^(?:https?:\/\/)?github\.com\/(.+)$/i)
  if (githubUrlMatch) {
    const withoutOrigin = githubUrlMatch[1].replace(/\/+$/, '')
    const segments = withoutOrigin.split('/').filter(Boolean)

    if (segments.length === 1) {
      return { valid: true, org: segments[0] }
    }

    return { valid: false, error: 'Enter a top-level GitHub organization, not a repository URL.' }
  }

  if (trimmed.includes('/')) {
    return { valid: false, error: 'Enter a GitHub org slug or a GitHub org URL.' }
  }

  return { valid: true, org: trimmed }
}

export function buildOrgRepoSummary(owner: string, node: OrgRepoNode): OrgRepoSummary {
  return {
    repo: `${owner}/${node.name}`,
    name: node.name,
    description: node.description ?? 'unavailable',
    primaryLanguage: node.primaryLanguage?.name ?? 'unavailable',
    stars: node.stargazerCount,
    forks: node.forkCount,
    watchers: node.watchers.totalCount,
    openIssues: node.issues.totalCount,
    pushedAt: node.pushedAt ?? 'unavailable',
    archived: node.isArchived,
    isFork: node.isFork,
    topics: (node.repositoryTopics?.nodes ?? [])
      .map((entry) => entry?.topic?.name ?? null)
      .filter((value): value is string => Boolean(value)),
    sizeKb: typeof node.diskUsage === 'number' ? node.diskUsage : 'unavailable',
    visibility: normalizeVisibility(node.visibility, node.isPrivate),
    licenseSpdxId: node.licenseInfo?.spdxId ?? 'unavailable',
    licenseName: node.licenseInfo?.name ?? 'unavailable',
    parentRepo: node.parent?.nameWithOwner,
    url: node.url,
  }
}

export async function analyzeOrgInventory(input: { org: string; token: string }): Promise<OrgInventoryResponse> {
  const normalized = normalizeOrgInput(input.org)
  if (!normalized.valid) {
    return {
      org: input.org,
      summary: emptySummary(),
      results: [],
      rateLimit: null,
      failure: { code: 'INVALID_ORG', message: normalized.error },
    }
  }

  const response = await fetchOrgInventoryPage(input.token, normalized.org)

  if (!response.data.organization) {
    return {
      org: normalized.org,
      summary: emptySummary(),
      results: [],
      rateLimit: response.rateLimit,
      failure: { code: 'NOT_FOUND', message: 'Organization could not be found or has no visible public repositories.' },
    }
  }

  const nodes = await fetchAllOrgRepositoryNodes(input.token, normalized.org, response)
  const results = nodes.map((node) => buildOrgRepoSummary(normalized.org, node))
  const { buildOrgInventorySummary } = await import('@/lib/org-inventory/summary')

  return {
    org: normalized.org,
    summary: buildOrgInventorySummary(results),
    results,
    rateLimit: response.rateLimit,
    failure: null,
  }
}

async function fetchAllOrgRepositoryNodes(
  token: string,
  org: string,
  initialResponse: Awaited<ReturnType<typeof fetchOrgInventoryPage>>,
) {
  const organization = initialResponse.data.organization
  if (!organization) {
    return []
  }

  const nodes = [...organization.repositories.nodes]
  let hasNextPage = organization.repositories.pageInfo.hasNextPage
  let cursor = organization.repositories.pageInfo.endCursor

  while (hasNextPage && cursor) {
    const response = await fetchOrgInventoryPage(token, org, cursor)
    if (!response.data.organization) {
      break
    }

    nodes.push(...response.data.organization.repositories.nodes)
    hasNextPage = response.data.organization.repositories.pageInfo.hasNextPage
    cursor = response.data.organization.repositories.pageInfo.endCursor
  }

  return nodes
}

async function fetchOrgInventoryPage(token: string, org: string, after?: string | null) {
  return queryGitHubGraphQL<OrgInventoryGraphQLResponse>(token, ORG_INVENTORY_QUERY, {
    org,
    after: after ?? null,
  })
}

function emptySummary(): OrgInventorySummary {
  return {
    totalPublicRepos: 0,
    totalStars: 'unavailable',
    mostStarredRepos: [],
    mostRecentlyActiveRepos: [],
    languageDistribution: [],
    archivedRepoCount: 0,
    activeRepoCount: 0,
  }
}

const ORG_INVENTORY_QUERY = `
  query OrgInventory($org: String!, $after: String) {
    organization(login: $org) {
      repositories(first: 100, after: $after, privacy: PUBLIC, orderBy: { field: PUSHED_AT, direction: DESC }) {
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          name
          description
          primaryLanguage {
            name
          }
          repositoryTopics(first: 20) {
            nodes {
              topic {
                name
              }
            }
          }
          stargazerCount
          forkCount
          isFork
          parent {
            nameWithOwner
          }
          watchers {
            totalCount
          }
          issues(states: OPEN) {
            totalCount
          }
          pushedAt
          isArchived
          diskUsage
          visibility
          isPrivate
          licenseInfo {
            spdxId
            name
          }
          url
        }
      }
    }
    rateLimit {
      limit
      remaining
      resetAt
    }
  }
`

function normalizeVisibility(
  visibility: OrgRepoNode['visibility'],
  isPrivate: boolean | undefined,
): OrgRepoSummary['visibility'] {
  if (visibility === 'PUBLIC') return 'public'
  if (visibility === 'PRIVATE') return 'private'
  if (visibility === 'INTERNAL') return 'internal'
  if (isPrivate === true) return 'private'
  if (isPrivate === false) return 'public'
  return 'unavailable'
}
