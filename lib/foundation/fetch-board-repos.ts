export interface SkippedIssue {
  issueNumber: number
  issueUrl: string
  title: string
  reason: string
}

export interface BoardReposResult {
  repos: string[]
  skipped: SkippedIssue[]
}

// Status field values to include (case-insensitive)
const BOARD_COLUMNS = new Set(['new', 'upcoming'])

// Repo names that are org-meta repos, not real projects
const EXCLUDED_REPO_NAMES = new Set(['.github', 'actions', 'community', '.github.io'])

const GITHUB_REPO_RE = /https?:\/\/github\.com\/([a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+?)(?:\/|\.git|$|\s)/i

function parseBoardUrl(url: string): { org: string; number: number } | null {
  const match = /github\.com\/orgs\/([^/]+)\/projects\/(\d+)/i.exec(url)
  if (!match) return null
  return { org: match[1], number: parseInt(match[2], 10) }
}

function isValidProjectRepo(slug: string): boolean {
  if (slug.toLowerCase().startsWith('cncf/')) return false
  const repoName = slug.split('/')[1]?.toLowerCase()
  return !!repoName && !EXCLUDED_REPO_NAMES.has(repoName)
}

function extractRepoSlugFromBody(body: string): string | null {
  const parts = body.split(/^### /m)

  // First pass: headings that specifically reference the GitHub/project URL
  for (const part of parts) {
    const newlineIdx = part.indexOf('\n')
    if (newlineIdx === -1) continue
    const heading = part.slice(0, newlineIdx).trim()
    const content = part.slice(newlineIdx + 1).trim()

    if (/github/i.test(heading) && /(url|link|org|project|repo)/i.test(heading)) {
      const match = GITHUB_REPO_RE.exec(content)
      if (match?.[1] && isValidProjectRepo(match[1])) return match[1]
    }
  }

  // Second pass: any section containing a GitHub URL
  for (const part of parts) {
    const newlineIdx = part.indexOf('\n')
    if (newlineIdx === -1) continue
    const content = part.slice(newlineIdx + 1).trim()

    const match = GITHUB_REPO_RE.exec(content)
    if (match?.[1] && isValidProjectRepo(match[1])) return match[1]
  }

  return null
}

type ProjectItemNode = {
  content: {
    number?: number
    url?: string
    title?: string
    body?: string
  } | null
  fieldValues: {
    nodes: Array<{
      name?: string
      field?: { name?: string }
    }>
  }
}

type GraphQLResponse = {
  data?: {
    organization?: {
      projectV2?: {
        items?: {
          nodes?: ProjectItemNode[]
          pageInfo?: { hasNextPage?: boolean; endCursor?: string | null }
        }
      }
    }
  }
  errors?: Array<{ message: string }>
}

const GQL_QUERY = `
  query GetBoardItems($org: String!, $number: Int!, $cursor: String) {
    organization(login: $org) {
      projectV2(number: $number) {
        items(first: 100, after: $cursor) {
          nodes {
            content {
              ... on Issue {
                number
                url
                title
                body
              }
            }
            fieldValues(first: 8) {
              nodes {
                ... on ProjectV2ItemFieldSingleSelectValue {
                  name
                  field {
                    ... on ProjectV2SingleSelectField {
                      name
                    }
                  }
                }
              }
            }
          }
          pageInfo { hasNextPage endCursor }
        }
      }
    }
  }
`

async function fetchBoardItemsViaGraphQL(
  token: string,
  org: string,
  projectNumber: number,
): Promise<Array<{ issueNumber: number; issueUrl: string; title: string; body: string | null }>> {
  const items: Array<{ issueNumber: number; issueUrl: string; title: string; body: string | null }> = []
  let cursor: string | null = null

  do {
    const res = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'RepoPulse/1.0',
      },
      body: JSON.stringify({ query: GQL_QUERY, variables: { org, number: projectNumber, cursor } }),
      signal: AbortSignal.timeout(15_000),
    })

    if (!res.ok) break

    const data = (await res.json()) as GraphQLResponse
    if (data.errors?.length) break

    const projectItems = data.data?.organization?.projectV2?.items
    if (!projectItems) break

    for (const node of projectItems.nodes ?? []) {
      if (!node.content?.number) continue

      const status = node.fieldValues.nodes.find(
        (fv) => fv.field?.name?.toLowerCase() === 'status',
      )
      if (!status?.name || !BOARD_COLUMNS.has(status.name.toLowerCase())) continue

      items.push({
        issueNumber: node.content.number,
        issueUrl: node.content.url ?? '',
        title: node.content.title ?? '',
        body: node.content.body ?? null,
      })
    }

    const pageInfo = projectItems.pageInfo
    cursor = pageInfo?.hasNextPage ? (pageInfo.endCursor ?? null) : null
  } while (cursor)

  return items
}

export async function fetchBoardRepos(token: string, boardUrl: string): Promise<BoardReposResult> {
  const parsed = parseBoardUrl(boardUrl)
  if (!parsed) return { repos: [], skipped: [] }

  const items = await fetchBoardItemsViaGraphQL(token, parsed.org, parsed.number)

  const repos: string[] = []
  const skipped: SkippedIssue[] = []
  const seenSlugs = new Set<string>()

  for (const item of items) {
    const slug = item.body ? extractRepoSlugFromBody(item.body) : null
    if (slug && !seenSlugs.has(slug.toLowerCase())) {
      seenSlugs.add(slug.toLowerCase())
      repos.push(slug)
    } else {
      skipped.push({
        issueNumber: item.issueNumber,
        issueUrl: item.issueUrl,
        title: item.title,
        reason: slug
          ? `Duplicate repository: ${slug}`
          : 'No GitHub repository URL found in issue body',
      })
    }
  }

  return { repos, skipped }
}
