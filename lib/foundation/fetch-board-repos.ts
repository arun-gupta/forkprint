export interface SkippedIssue {
  issueNumber: number
  issueUrl: string
  title: string
  reason: string
}

export interface BoardReposResult {
  repos: string[]
  skipped: SkippedIssue[]
  /** Which resolution method succeeded */
  method: 'graphql' | 'labels'
  /** Maps each resolved repo slug to its cncf/sandbox issue number */
  issueMap: Record<string, number>
}

// Status field values to include (case-insensitive)
const BOARD_COLUMNS = new Set(['new', 'review/tech'])

// Repo names that are org-meta repos, not real projects
const EXCLUDED_REPO_NAMES = new Set(['.github', 'actions', 'community', '.github.io'])

const GITHUB_REPO_RE = /https?:\/\/github\.com\/([a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+?)(?:\/|\.git|$|\s)/i

export function parseBoardUrl(url: string): { org: string; number: number } | null {
  const match = /github\.com\/orgs\/([^/]+)\/projects\/(\d+)/i.exec(url)
  if (!match) return null
  return { org: match[1], number: parseInt(match[2], 10) }
}

function isValidProjectRepo(slug: string): boolean {
  if (slug.toLowerCase().startsWith('cncf/')) return false
  const repoName = slug.split('/')[1]?.toLowerCase()
  return !!repoName && !EXCLUDED_REPO_NAMES.has(repoName)
}

export function extractRepoSlugFromBody(body: string): string | null {
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

// ─── GraphQL path ────────────────────────────────────────────────────────────

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
      } | null
    } | null
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
            fieldValues(first: 20) {
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

type BoardItem = { issueNumber: number; issueUrl: string; title: string; body: string | null }

// Match column name by prefix so "New 🌱" still matches "new"
function matchesColumn(name: string): boolean {
  const lower = name.toLowerCase()
  return BOARD_COLUMNS.has(lower) || [...BOARD_COLUMNS].some((col) => lower.startsWith(col))
}

/**
 * Fetch one page of project items. Returns null if the project is inaccessible
 * (null projectV2), so the caller can retry with a different auth header.
 */
async function fetchOnePage(
  authHeader: string | null,
  org: string,
  projectNumber: number,
  cursor: string | null,
): Promise<{ items: BoardItem[]; nextCursor: string | null } | null> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'RepoPulse/1.0',
  }
  if (authHeader) headers['Authorization'] = authHeader

  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers,
    body: JSON.stringify({ query: GQL_QUERY, variables: { org, number: projectNumber, cursor } }),
    signal: AbortSignal.timeout(15_000),
  })

  if (!res.ok) throw new Error(`GraphQL HTTP ${res.status}`)

  const data = (await res.json()) as GraphQLResponse

  if (data.errors?.length) {
    throw new Error(`GraphQL error: ${data.errors.map((e) => e.message).join('; ')}`)
  }

  // null means access denied — signal to caller to retry differently
  if (data.data?.organization === null || data.data?.organization?.projectV2 === null) {
    return null
  }

  const projectItems = data.data?.organization?.projectV2?.items
  if (!projectItems) return { items: [], nextCursor: null }

  const items: BoardItem[] = []
  for (const node of projectItems.nodes ?? []) {
    if (!node.content?.number) continue

    const status = node.fieldValues.nodes.find(
      (fv) => fv.field?.name?.toLowerCase() === 'status',
    )
    // Include item if it has a matching Status value; if no Status field is set
    // at all on an item, include it too (board default = "New" column)
    if (status?.name && !matchesColumn(status.name)) continue

    items.push({
      issueNumber: node.content.number,
      issueUrl: node.content.url ?? '',
      title: node.content.title ?? '',
      body: node.content.body ?? null,
    })
  }

  const nextCursor = projectItems.pageInfo?.hasNextPage
    ? (projectItems.pageInfo.endCursor ?? null)
    : null

  return { items, nextCursor }
}

async function paginateBoard(
  authHeader: string | null,
  org: string,
  projectNumber: number,
): Promise<BoardItem[] | null> {
  const all: BoardItem[] = []
  let cursor: string | null = null

  do {
    const page = await fetchOnePage(authHeader, org, projectNumber, cursor)
    if (page === null) return null // access denied
    all.push(...page.items)
    cursor = page.nextCursor
  } while (cursor)

  return all
}

/**
 * Try with auth token first; if projectV2 returns null (scope issue), retry
 * without Authorization — GitHub allows unauthenticated reads of public org
 * projects at 60 req/hr, which is fine for a one-shot scan.
 */
async function fetchBoardItemsViaGraphQL(
  token: string,
  org: string,
  projectNumber: number,
): Promise<BoardItem[]> {
  const withAuth = await paginateBoard(`Bearer ${token}`, org, projectNumber)
  if (withAuth !== null) return withAuth

  // Authenticated attempt returned null (access denied) — retry without auth
  // for public boards
  const withoutAuth = await paginateBoard(null, org, projectNumber)
  if (withoutAuth !== null) return withoutAuth

  throw new Error('Project not accessible (private, or not found)')
}

// ─── Label fallback path ──────────────────────────────────────────────────────

type GitHubIssueListItem = { number: number; title: string; html_url: string; labels: Array<{ name: string }> }

async function fetchIssuesByLabel(
  token: string,
  label: string,
  excludeLabel: string,
): Promise<GitHubIssueListItem[]> {
  const issues: GitHubIssueListItem[] = []
  let page = 1
  while (page <= 3) {
    const res = await fetch(
      `https://api.github.com/repos/cncf/sandbox/issues?labels=${encodeURIComponent(label)}&state=open&per_page=100&page=${page}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'User-Agent': 'RepoPulse/1.0',
        },
        signal: AbortSignal.timeout(15_000),
      },
    )
    if (!res.ok) break
    const batch = (await res.json()) as GitHubIssueListItem[]
    if (!Array.isArray(batch) || batch.length === 0) break
    // Filter out issues that carry the exclusion label
    const filtered = batch.filter(
      (issue) => !issue.labels.some((l) => l.name.toLowerCase() === excludeLabel.toLowerCase()),
    )
    issues.push(...filtered)
    if (batch.length < 100) break
    page++
  }
  return issues
}

async function fetchBoardItemsViaLabels(token: string): Promise<BoardItem[]> {
  // "New" column:        label:New        -label:gitvote/passed
  // "review/tech" column: label:review/tech -label:sandbox
  const [newIssues, reviewTechIssues] = await Promise.all([
    fetchIssuesByLabel(token, 'New', 'gitvote/passed'),
    fetchIssuesByLabel(token, 'review/tech', 'sandbox'),
  ])

  // Deduplicate
  const seen = new Set<number>()
  const all: GitHubIssueListItem[] = []
  for (const issue of [...newIssues, ...reviewTechIssues]) {
    if (!seen.has(issue.number)) {
      seen.add(issue.number)
      all.push(issue)
    }
  }

  // Fetch bodies in parallel
  return Promise.all(
    all.map(async (issue): Promise<BoardItem> => {
      try {
        const res = await fetch(
          `https://api.github.com/repos/cncf/sandbox/issues/${issue.number}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/vnd.github+json',
              'User-Agent': 'RepoPulse/1.0',
            },
            signal: AbortSignal.timeout(10_000),
          },
        )
        if (!res.ok) return { issueNumber: issue.number, issueUrl: issue.html_url, title: issue.title, body: null }
        const data = (await res.json()) as { body?: string }
        return { issueNumber: issue.number, issueUrl: issue.html_url, title: issue.title, body: data.body ?? null }
      } catch {
        return { issueNumber: issue.number, issueUrl: issue.html_url, title: issue.title, body: null }
      }
    }),
  )
}

// ─── Public entry point ───────────────────────────────────────────────────────

function itemsToResult(items: BoardItem[], method: BoardReposResult['method']): BoardReposResult {
  const repos: string[] = []
  const skipped: SkippedIssue[] = []
  const issueMap: Record<string, number> = {}
  const seenSlugs = new Set<string>()

  for (const item of items) {
    const slug = item.body ? extractRepoSlugFromBody(item.body) : null
    if (slug && !seenSlugs.has(slug.toLowerCase())) {
      seenSlugs.add(slug.toLowerCase())
      repos.push(slug)
      issueMap[slug] = item.issueNumber
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

  return { repos, skipped, method, issueMap }
}

export async function fetchBoardRepos(token: string, boardUrl: string): Promise<BoardReposResult> {
  const parsed = parseBoardUrl(boardUrl)
  if (!parsed) return { repos: [], skipped: [], method: 'graphql', issueMap: {} }

  // Try the accurate GraphQL path first; fall back to label-based Issues API
  // if the token lacks project read access (common with baseline OAuth scope).
  try {
    const items = await fetchBoardItemsViaGraphQL(token, parsed.org, parsed.number)
    return itemsToResult(items, 'graphql')
  } catch (gqlErr) {
    console.warn('[fetchBoardRepos] GraphQL failed, falling back to label approach:', gqlErr)
  }

  const items = await fetchBoardItemsViaLabels(token)
  return itemsToResult(items, 'labels')
}
