/**
 * Calibration script for RepoPulse scoring thresholds.
 *
 * Uses lightweight custom GraphQL queries, alias batching (5 repos per query),
 * and multi-token round-robin to efficiently sample and analyze GitHub repos.
 *
 * Usage:
 *   npm run calibrate            # full run — fetch metrics for all sampled repos
 *   npm run calibrate:dry-run    # sample repos only, write list without fetching metrics
 *
 * Env vars:
 *   GITHUB_TOKENS=token1,token2,token3   (preferred — multiplies rate limit)
 *   GITHUB_TOKEN=token                   (fallback — single token)
 *
 * Checkpoints progress to scripts/calibrate-checkpoint.json.
 * Delete it to start a fresh run.
 */

import { loadEnvConfig } from '@next/env'
import { existsSync, readFileSync, writeFileSync } from 'fs'

loadEnvConfig(process.cwd())

// ─── Token pool ───────────────────────────────────────────────────────────────
//
// Priority: GITHUB_TOKEN_1/2/3/... (numbered) → GITHUB_TOKENS (comma-separated) → GITHUB_TOKEN (single)

function collectTokens(): string[] {
  // 1. Numbered: GITHUB_TOKEN_1, GITHUB_TOKEN_2, ...
  const numbered: string[] = []
  for (const [key, value] of Object.entries(process.env)) {
    if (/^GITHUB_TOKEN_\d+$/i.test(key) && value?.trim()) {
      numbered.push(value.trim())
    }
  }
  if (numbered.length > 0) return numbered

  // 2. Comma-separated: GITHUB_TOKENS
  if (process.env.GITHUB_TOKENS) {
    const tokens = process.env.GITHUB_TOKENS.split(',').map((t) => t.trim()).filter(Boolean)
    if (tokens.length > 0) return tokens
  }

  // 3. Single: GITHUB_TOKEN
  if (process.env.GITHUB_TOKEN?.trim()) {
    return [process.env.GITHUB_TOKEN.trim()]
  }

  return []
}

const rawTokens = collectTokens()

if (rawTokens.length === 0) {
  console.error('No GitHub tokens found. Set GITHUB_TOKEN_1, GITHUB_TOKEN_2, ... or GITHUB_TOKENS or GITHUB_TOKEN in .env.local')
  process.exit(1)
}

console.log(`Using ${rawTokens.length} token(s)`)

let tokenIndex = 0
function nextToken(): string {
  const token = rawTokens[tokenIndex % rawTokens.length]!
  tokenIndex++
  return token
}

// ─── Config ───────────────────────────────────────────────────────────────────

const BATCH_SIZE = 3             // repos per GraphQL alias query (kept at 3 to avoid RESOURCE_LIMITS_EXCEEDED)
const PR_WINDOW_DAYS = 90
const ISSUE_WINDOW_DAYS = 90
const STALE_DAYS = 30
const CHECKPOINT_PATH = 'scripts/calibrate-checkpoint.json'
const OUTPUT_PATH = 'lib/scoring/calibration-data.json'

function monthsAgo(n: number): string {
  const d = new Date()
  d.setMonth(d.getMonth() - n)
  return d.toISOString().split('T')[0]!
}

// Each bracket is divided into strata to prevent clustering at the low end of
// a range (e.g. 100-star repos dominating the Growing sample). Repos are
// sampled evenly across strata — TARGET_PER_STRATUM per stratum.
//
// Target sample sizes per bracket (strata × TARGET_PER_STRATUM):
//   Emerging:    3 strata × 17 = 51
//   Growing:     4 strata × 13 = 52
//   Established: 4 strata × 13 = 52
//   Popular:     4 strata × 13 = 52
//
// All exceed the 50-repo minimum required for p90 stability.

const TARGET_PER_STRATUM = 17  // adjusted per bracket below where needed

interface Stratum {
  label: string
  min: number
  max: number | null
  pushedAfter: string
  target: number
}

const BRACKETS: Record<string, { label: string; strata: Stratum[] }> = {
  emerging: {
    label: 'Emerging (10–99 stars)',
    strata: [
      { label: 'S1 (10–29)',  min: 10,  max: 29,  pushedAfter: monthsAgo(12), target: TARGET_PER_STRATUM },
      { label: 'S2 (30–59)',  min: 30,  max: 59,  pushedAfter: monthsAgo(12), target: TARGET_PER_STRATUM },
      { label: 'S3 (60–99)',  min: 60,  max: 99,  pushedAfter: monthsAgo(12), target: TARGET_PER_STRATUM },
    ],
  },
  growing: {
    label: 'Growing (100–999 stars)',
    strata: [
      { label: 'S1 (100–324)',  min: 100,  max: 324,  pushedAfter: monthsAgo(12), target: 13 },
      { label: 'S2 (325–549)',  min: 325,  max: 549,  pushedAfter: monthsAgo(12), target: 13 },
      { label: 'S3 (550–774)',  min: 550,  max: 774,  pushedAfter: monthsAgo(12), target: 13 },
      { label: 'S4 (775–999)',  min: 775,  max: 999,  pushedAfter: monthsAgo(12), target: 13 },
    ],
  },
  established: {
    label: 'Established (1k–10k stars)',
    strata: [
      { label: 'S1 (1k–3k)',     min: 1000,  max: 2999,  pushedAfter: monthsAgo(12), target: 13 },
      { label: 'S2 (3k–5.5k)',   min: 3000,  max: 5499,  pushedAfter: monthsAgo(12), target: 13 },
      { label: 'S3 (5.5k–7.5k)', min: 5500,  max: 7499,  pushedAfter: monthsAgo(12), target: 13 },
      { label: 'S4 (7.5k–10k)',  min: 7500,  max: 9999,  pushedAfter: monthsAgo(12), target: 13 },
    ],
  },
  popular: {
    label: 'Popular (10k+ stars)',
    strata: [
      { label: 'S1 (10k–25k)',  min: 10000,  max: 24999,  pushedAfter: monthsAgo(12), target: 13 },
      { label: 'S2 (25k–65k)',  min: 25000,  max: 64999,  pushedAfter: monthsAgo(12), target: 13 },
      { label: 'S3 (65k–170k)', min: 65000,  max: 169999, pushedAfter: monthsAgo(12), target: 13 },
      { label: 'S4 (170k+)',    min: 170000, max: null,    pushedAfter: monthsAgo(12), target: 13 },
    ],
  },
}

type BracketKey = keyof typeof BRACKETS

// ─── Client-side quality filters ─────────────────────────────────────────────
// Mirrors the filters in list-candidates.ts to exclude non-software repos.

const COLLECTION_PATTERNS = [
  /\bawesome\b/i,
  /\bcurated[- ]list\b/i,
  /\bfree[- ]programming[- ]books?\b/i,
  /\bcheatsheet\b/i,
  /^roadmap/i,
  /\binterview[- ](questions?|prep|university)\b/i,
  /\bstudy[- ]plan\b/i,
  /\blearning[- ]path\b/i,
  /\bpublic[- ]apis?\b/i,
  /\bsystem[- ]design[- ]primer\b/i,
  /\bfree[- ]for[- ]dev/i,
  /\bcurriculum\b/i,
  /\bcookbook\b/i,
  /\brecipes?\b/i,
  /\bstyle[- ]?guide\b/i,
  /\bself[- ]taught\b/i,
  /\bhow[- ]?to[- ]?cook\b/i,
  /\bword[- ]?lists?\b/i,
  /\bsec[- ]?lists?\b/i,
]

const DOCS_NAME_PATTERNS = [
  /[-_.]?docs?$/i,
  /[-_.]?documentation$/i,
  /[-_.]?wiki$/i,
  /[-_.]?website$/i,
  /[-_.]?(\.io)$/i,
  /[-_.]?guidelines?$/i,
  /[-_.]?writers?[- _]toolkit$/i,
]

const EXCLUDED_DESC_PATTERNS = [
  /\b(mirrored? from|mirror of|read[- ]?only mirror|unofficial mirror|official (github )?mirror)\b/i,
  /do not (create|open|submit) (prs?|pull requests?|issues?) here/i,
  /^documentation (for|of)\b/i,
  /\botp[- ]?(bot|bypass|generator)\b/i,
  /\b2fa[- ]?(bypass|crack)\b/i,
  /\baccount[- ]?(manager|switcher|switch)\b/i,
  /\botp[- ]?(bomb|flood|spam)\b/i,
  /\bactivation[- ]?scripts?\b/i,
]

const EXCLUDED_LANGUAGES = new Set([
  'Jupyter Notebook',
  'Adblock Filter List',
  'TeX',
  'YAML',
  'Markdown',                // Pure markdown repos are collections/resources, not software
  'DIGITAL Command Language', // Legal/admin repos (e.g. DMCA notices)
])

const MAX_PER_LANGUAGE = 3

interface SearchRepoItem {
  full_name: string
  description: string | null
  language: string | null
  stargazers_count: number
}

function isGenuineSoftwareProject(repo: SearchRepoItem, starsMin: number, starsMax: number | null): boolean {
  if (!repo.language) return false
  if (EXCLUDED_LANGUAGES.has(repo.language)) return false
  if (repo.stargazers_count < starsMin) return false
  if (starsMax !== null && repo.stargazers_count > starsMax) return false

  const [owner, name] = repo.full_name.split('/')
  const repoName = name ?? ''
  const desc = repo.description ?? ''
  const nameAndDesc = `${repo.full_name} ${desc}`

  if (owner === repoName) return false
  for (const pattern of DOCS_NAME_PATTERNS) {
    if (pattern.test(repoName)) return false
  }
  for (const pattern of EXCLUDED_DESC_PATTERNS) {
    if (pattern.test(desc) || pattern.test(repoName)) return false
  }
  if (/\b(index|registry)\b/i.test(repoName) && /\b(index|registry)\b/i.test(desc)) return false
  for (const pattern of COLLECTION_PATTERNS) {
    if (pattern.test(nameAndDesc)) return false
  }
  return true
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface PercentileSet {
  p25: number
  p50: number
  p75: number
  p90: number
}

interface RepoMetrics {
  repo: string
  stars: number
  forks: number
  watchers: number
  forkRate: number | null
  watcherRate: number | null
  prMergeRate: number | null
  issueClosureRate: number | null
  staleIssueRatio: number | null
  stalePrRatio: number | null
  medianTimeToMergeHours: number | null
  medianTimeToCloseHours: number | null
  issueFirstResponseMedianHours: number | null
  issueFirstResponseP90Hours: number | null
  prFirstReviewMedianHours: number | null
  prFirstReviewP90Hours: number | null
  issueResolutionMedianHours: number | null  // same data as medianTimeToCloseHours — aliased for scoring compat
  issueResolutionP90Hours: number | null
  prMergeMedianHours: number | null           // same data as medianTimeToMergeHours — aliased for scoring compat
  prMergeP90Hours: number | null
  issueResolutionRate: number | null          // same data as issueClosureRate — aliased for scoring compat
  contributorResponseRate: number | null
  humanResponseRatio: number | null
  botResponseRatio: number | null
  prReviewDepth: number | null
  issuesClosedWithoutCommentRatio: number | null
  topContributorShare: number | null
}

interface Checkpoint {
  results: Record<BracketKey, RepoMetrics[]>
  sampledRepos: Record<BracketKey, string[]>
}

// ─── GraphQL types ────────────────────────────────────────────────────────────

interface GQLTimelineNode {
  createdAt?: string
  author?: { login: string }
}

interface GQLPRNode {
  createdAt: string
  mergedAt: string | null
  reviews: { totalCount: number }
  timelineItems: { nodes: GQLTimelineNode[] }
}

interface GQLIssueNode {
  createdAt: string
  closedAt: string | null
  comments: { totalCount: number }
  timelineItems: { nodes: GQLTimelineNode[] }
}

interface GQLRepoData {
  stargazerCount: number
  forkCount: number
  watchers: { totalCount: number }
  openIssues: { totalCount: number }
  openPRs: { totalCount: number }
  recentlyActiveIssues: { totalCount: number }
  mergedPRs: { nodes: GQLPRNode[] }
  closedIssues: { nodes: GQLIssueNode[] }
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.ceil((p / 100) * sorted.length) - 1
  return Math.round(sorted[Math.max(0, index)]! * 1000) / 1000
}

function percentiles(values: number[]): PercentileSet {
  return {
    p25: percentile(values, 25),
    p50: percentile(values, 50),
    p75: percentile(values, 75),
    p90: percentile(values, 90),
  }
}

async function fetchWithRetry(url: string, init: RequestInit, maxRetries = 3): Promise<Response> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, init)
      if (res.status >= 500 && attempt < maxRetries) {
        const wait = 10 * (attempt + 1)
        console.log(`    ${res.status} from ${url.split('?')[0]}. Retrying in ${wait}s...`)
        await sleep(wait * 1000)
        continue
      }
      return res
    } catch (err) {
      if (attempt < maxRetries) {
        const wait = 5 * (attempt + 1)
        console.log(`    Network error (attempt ${attempt + 1}/${maxRetries}). Retrying in ${wait}s...`)
        await sleep(wait * 1000)
        continue
      }
      throw err
    }
  }
  throw new Error('Unreachable')
}

function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[mid - 1]! + sorted[mid]!) / 2
    : sorted[mid]!
}

function p90Value(values: number[]): number | null {
  if (values.length === 0) return null
  return percentile(values, 90)
}

function hoursBetween(a: string, b: string): number {
  return (new Date(b).getTime() - new Date(a).getTime()) / 3_600_000
}

function windowStart(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

function loadCheckpoint(): Checkpoint {
  if (existsSync(CHECKPOINT_PATH)) {
    console.log(`Resuming from checkpoint: ${CHECKPOINT_PATH}`)
    return JSON.parse(readFileSync(CHECKPOINT_PATH, 'utf8')) as Checkpoint
  }
  return {
    results: { emerging: [], growing: [], established: [], popular: [] },
    sampledRepos: { emerging: [], growing: [], established: [], popular: [] },
  }
}

function saveCheckpoint(cp: Checkpoint) {
  writeFileSync(CHECKPOINT_PATH, JSON.stringify(cp, null, 2))
}

// ─── GitHub Search API ────────────────────────────────────────────────────────

async function fetchSearchPage(
  query: string,
  sort: string,
  page: number,
  token: string,
): Promise<SearchRepoItem[]> {
  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=${sort}&per_page=100&page=${page}`
  const headers = { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' }
  const res = await fetchWithRetry(url, { headers })

  if (!res.ok) {
    if (res.status === 403 || res.status === 429) {
      const wait = Number(res.headers.get('Retry-After') ?? '60')
      console.log(`Search rate limited. Waiting ${wait}s...`)
      await sleep(wait * 1000)
      return fetchSearchPage(query, sort, page, token)
    }
    throw new Error(`Search API ${res.status}: ${await res.text()}`)
  }

  const body = (await res.json()) as { items: SearchRepoItem[] }
  return body.items
}

async function sampleStratum(
  stratum: Stratum,
  seen: Set<string>,
  langCount: Map<string, number>,
): Promise<string[]> {
  const starsFilter = stratum.max
    ? `stars:${stratum.min}..${stratum.max}`
    : `stars:>=${stratum.min}`
  const query = `${starsFilter} fork:false archived:false pushed:>${stratum.pushedAfter}`
  const accepted: string[] = []
  const sorts = ['updated', 'created', 'stars']

  for (const sort of sorts) {
    if (accepted.length >= stratum.target) break
    for (let page = 1; page <= 10 && accepted.length < stratum.target; page++) {
      const items = await fetchSearchPage(query, sort, page, nextToken())
      if (items.length === 0) break

      for (const repo of items) {
        if (accepted.length >= stratum.target) break
        if (seen.has(repo.full_name)) continue
        if (!isGenuineSoftwareProject(repo, stratum.min, stratum.max)) continue

        const lang = repo.language!
        if ((langCount.get(lang) ?? 0) >= MAX_PER_LANGUAGE) continue

        seen.add(repo.full_name)
        langCount.set(lang, (langCount.get(lang) ?? 0) + 1)
        accepted.push(repo.full_name)
      }

      await sleep(600)
    }
  }

  return accepted
}

async function sampleBracket(bracket: { label: string; strata: Stratum[] }): Promise<string[]> {
  const all: string[] = []
  const seen = new Set<string>()
  const langCount = new Map<string, number>()

  for (const stratum of bracket.strata) {
    console.log(`  Stratum ${stratum.label} — target ${stratum.target}`)
    const repos = await sampleStratum(stratum, seen, langCount)
    all.push(...repos)
    console.log(`    → ${repos.length} sampled`)
    await sleep(500)
  }
  return all
}

// ─── GraphQL batch fetcher ─────────────────────────────────────────────────────

const PR_WINDOW = windowStart(PR_WINDOW_DAYS)
const ISSUE_WINDOW = windowStart(ISSUE_WINDOW_DAYS)
const STALE_CUTOFF = windowStart(STALE_DAYS)

function buildBatchQuery(repos: string[]): string {
  const aliases = repos.map((fullName, i) => {
    const [owner, name] = fullName.split('/')
    return `
      repo${i}: repository(owner: ${JSON.stringify(owner)}, name: ${JSON.stringify(name)}) {
        stargazerCount
        forkCount
        watchers { totalCount }
        openIssues: issues(states: OPEN) { totalCount }
        openPRs: pullRequests(states: OPEN) { totalCount }
        recentlyActiveIssues: issues(states: OPEN, filterBy: { since: "${STALE_CUTOFF}" }) { totalCount }
        mergedPRs: pullRequests(
          states: MERGED
          first: 100
          orderBy: { field: UPDATED_AT, direction: DESC }
        ) {
          nodes {
            createdAt
            mergedAt
            reviews { totalCount }
            timelineItems(first: 1, itemTypes: [PULL_REQUEST_REVIEW, ISSUE_COMMENT]) {
              nodes {
                ... on PullRequestReview { createdAt }
                ... on IssueComment { createdAt }
              }
            }
          }
        }
        closedIssues: issues(
          states: CLOSED
          first: 100
          orderBy: { field: UPDATED_AT, direction: DESC }
        ) {
          nodes {
            createdAt
            closedAt
            comments { totalCount }
            timelineItems(first: 1, itemTypes: [ISSUE_COMMENT]) {
              nodes {
                ... on IssueComment { createdAt author { login } }
              }
            }
          }
        }
      }`
  }).join('\n')

  return `{ ${aliases} }`
}

async function runGraphQL(query: string, token: string): Promise<Record<string, GQLRepoData | null>> {
  const res = await fetchWithRetry('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  })

  if (!res.ok) {
    if (res.status === 403 || res.status === 429) {
      const wait = Number(res.headers.get('Retry-After') ?? '60')
      console.log(`GraphQL rate limited. Waiting ${wait}s...`)
      await sleep(wait * 1000)
      return runGraphQL(query, token)
    }
    throw new Error(`GraphQL ${res.status}: ${await res.text()}`)
  }

  const body = (await res.json()) as { data?: Record<string, GQLRepoData | null>; errors?: unknown[] }

  if (body.errors) {
    console.warn('GraphQL partial errors:', JSON.stringify(body.errors).slice(0, 200))
  }

  return body.data ?? {}
}

// ─── REST: top contributor share ──────────────────────────────────────────────

async function fetchTopContributorShare(fullName: string, token: string): Promise<number | null> {
  const url = `https://api.github.com/repos/${fullName}/stats/contributors`
  const headers = { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' }
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetchWithRetry(url, { headers })

    if (res.status === 202) {
      // GitHub is computing stats — wait and retry
      await sleep(3000)
      continue
    }
    if (!res.ok) return null

    const data = (await res.json()) as Array<{ total: number }> | null
    if (!Array.isArray(data) || data.length === 0) return null

    const total = data.reduce((s, c) => s + c.total, 0)
    const top = Math.max(...data.map((c) => c.total))
    return total > 0 ? top / total : null
  }
  return null
}

// ─── Bot detection ────────────────────────────────────────────────────────────

// Known bot logins and suffix patterns. Covers GitHub Apps (login ends in
// [bot]), Dependabot, Renovate, and other common automation accounts.
const KNOWN_BOTS = new Set([
  'dependabot', 'renovate', 'renovate-bot', 'github-actions',
  'semantic-release-bot', 'allcontributors', 'stale', 'codecov-commenter',
  'coveralls', 'snyk-bot', 'greenkeeper', 'imgbot',
])

function isBot(login: string): boolean {
  const lower = login.toLowerCase()
  return lower.endsWith('[bot]') || KNOWN_BOTS.has(lower)
}

// ─── REST: stale PR count ─────────────────────────────────────────────────────

// Returns the count of open PRs not updated since STALE_CUTOFF.
// Uses GitHub Search API: is:pr is:open repo:owner/name updated:<date
async function fetchStalePrCount(fullName: string, token: string): Promise<number | null> {
  const cutoffDate = STALE_CUTOFF.split('T')[0]! // YYYY-MM-DD
  const q = `is:pr is:open repo:${fullName} updated:<${cutoffDate}`
  const url = `https://api.github.com/search/issues?q=${encodeURIComponent(q)}&per_page=1`

  const headers = { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' }
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetchWithRetry(url, { headers })

    if (res.status === 403 || res.status === 429) {
      const wait = Number(res.headers.get('Retry-After') ?? '30')
      console.log(`    Search rate limited. Waiting ${wait}s...`)
      await sleep(wait * 1000)
      continue
    }
    if (!res.ok) return null

    const body = (await res.json()) as { total_count: number }
    return body.total_count
  }
  return null
}

// ─── Metrics computation ──────────────────────────────────────────────────────

function computeMetrics(
  fullName: string,
  data: GQLRepoData,
  topContributorShare: number | null,
  stalePrCount: number | null,
): RepoMetrics {
  const stars = data.stargazerCount
  const forks = data.forkCount
  const watchers = data.watchers.totalCount

  const forkRate = stars > 0 ? forks / stars : null
  const watcherRate = stars > 0 ? watchers / stars : null

  // Filter PRs/issues to the activity window (guard against null nodes from RESOURCE_LIMITS_EXCEEDED)
  const prNodes = (data.mergedPRs?.nodes ?? []).filter((n): n is GQLPRNode => n !== null)
  const issueNodes = (data.closedIssues?.nodes ?? []).filter((n): n is GQLIssueNode => n !== null)

  const recentPRs = prNodes.filter(
    (pr) => pr.mergedAt && pr.mergedAt >= PR_WINDOW,
  )
  const recentIssues = issueNodes.filter(
    (issue) => issue.closedAt && issue.closedAt >= ISSUE_WINDOW,
  )

  // PR merge rate: merged / (merged + open)
  const totalPRsOpened = recentPRs.length + data.openPRs.totalCount
  const prMergeRate = totalPRsOpened > 0 ? recentPRs.length / totalPRsOpened : null

  // Issue closure rate: closed / (closed + open)
  const totalIssuesOpened = recentIssues.length + data.openIssues.totalCount
  const issueClosureRate = totalIssuesOpened > 0 ? recentIssues.length / totalIssuesOpened : null

  // Stale issue ratio: open issues NOT updated recently / total open issues
  // recentlyActiveIssues = open issues updated since STALE_CUTOFF → stale = the complement
  const staleCount = Math.max(0, data.openIssues.totalCount - data.recentlyActiveIssues.totalCount)
  const staleIssueRatio =
    data.openIssues.totalCount > 0
      ? staleCount / data.openIssues.totalCount
      : null

  // Median time to merge (hours)
  const mergeTimesHours = recentPRs
    .filter((pr) => pr.mergedAt)
    .map((pr) => hoursBetween(pr.createdAt, pr.mergedAt!))
    .filter((h) => h >= 0)
  const medianTimeToMergeHours = median(mergeTimesHours)
  const mergeP90Hours = p90Value(mergeTimesHours)

  // Median time to close issue (hours)
  const closeTimesHours = recentIssues
    .filter((issue) => issue.closedAt)
    .map((issue) => hoursBetween(issue.createdAt, issue.closedAt!))
    .filter((h) => h >= 0)
  const medianTimeToCloseHours = median(closeTimesHours)
  const closeP90Hours = p90Value(closeTimesHours)

  // Issue first response: hours from issue open to first comment
  const issueFirstResponseTimes = recentIssues
    .map((issue) => {
      const firstComment = issue.timelineItems?.nodes?.[0]?.createdAt
      if (!firstComment) return null
      const h = hoursBetween(issue.createdAt, firstComment)
      return h >= 0 ? h : null
    })
    .filter((h): h is number => h !== null)
  const issueFirstResponseMedianHours = median(issueFirstResponseTimes)
  const issueFirstResponseP90Hours = p90Value(issueFirstResponseTimes)

  // PR first review: hours from PR open to first review/comment
  const prFirstReviewTimes = recentPRs
    .map((pr) => {
      const firstReview = pr.timelineItems?.nodes?.[0]?.createdAt
      if (!firstReview) return null
      const h = hoursBetween(pr.createdAt, firstReview)
      return h >= 0 ? h : null
    })
    .filter((h): h is number => h !== null)
  const prFirstReviewMedianHours = median(prFirstReviewTimes)
  const prFirstReviewP90Hours = p90Value(prFirstReviewTimes)

  // PR review depth: average reviews per merged PR
  const prReviewDepth =
    recentPRs.length > 0
      ? recentPRs.reduce((s, pr) => s + (pr.reviews?.totalCount ?? 0), 0) / recentPRs.length
      : null

  // Issues closed without any comment
  const issuesClosedWithoutCommentRatio =
    recentIssues.length > 0
      ? recentIssues.filter((i) => (i.comments?.totalCount ?? 0) === 0).length / recentIssues.length
      : null

  // Stale PR ratio: open PRs not updated in STALE_DAYS / total open PRs
  const stalePrRatio =
    stalePrCount !== null && data.openPRs.totalCount > 0
      ? stalePrCount / data.openPRs.totalCount
      : null

  // Bot detection on closed issues — classify first responder as bot or human.
  // Bot heuristic: login ends in [bot] or is a known automation account.
  const issuesWithFirstResponder = recentIssues.filter(
    (i) => i.timelineItems?.nodes?.[0]?.author?.login,
  )
  const botFirstResponses = issuesWithFirstResponder.filter((i) =>
    isBot(i.timelineItems!.nodes[0]!.author!.login),
  )
  const n = issuesWithFirstResponder.length
  const botResponseRatio = n > 0 ? botFirstResponses.length / n : null
  const humanResponseRatio = n > 0 ? (n - botFirstResponses.length) / n : null

  // Contributor response rate: fraction of closed issues that received any comment
  const contributorResponseRate =
    recentIssues.length > 0
      ? recentIssues.filter((i) => (i.comments?.totalCount ?? 0) > 0).length / recentIssues.length
      : null

  return {
    repo: fullName,
    stars,
    forks,
    watchers,
    forkRate,
    watcherRate,
    prMergeRate,
    issueClosureRate,
    staleIssueRatio,
    stalePrRatio,
    medianTimeToMergeHours,
    medianTimeToCloseHours,
    issueFirstResponseMedianHours,
    issueFirstResponseP90Hours,
    prFirstReviewMedianHours,
    prFirstReviewP90Hours,
    issueResolutionMedianHours: medianTimeToCloseHours,   // same metric, aliased
    issueResolutionP90Hours: closeP90Hours,
    prMergeMedianHours: medianTimeToMergeHours,           // same metric, aliased
    prMergeP90Hours: mergeP90Hours,
    issueResolutionRate: issueClosureRate,                 // same metric, aliased
    contributorResponseRate,
    humanResponseRatio,
    botResponseRatio,
    prReviewDepth,
    issuesClosedWithoutCommentRatio,
    topContributorShare,
  }
}

// ─── Batch processor ──────────────────────────────────────────────────────────

async function processBatch(repos: string[]): Promise<RepoMetrics[]> {
  const token = nextToken()
  const query = buildBatchQuery(repos)
  const data = await runGraphQL(query, token)

  const results: RepoMetrics[] = []

  for (let i = 0; i < repos.length; i++) {
    const fullName = repos[i]!
    const repoData = data[`repo${i}`]

    if (!repoData) {
      console.warn(`  ✗ ${fullName} — null response (private or deleted)`)
      continue
    }

    try {
      const [topContributorShare, stalePrCount] = await Promise.all([
        fetchTopContributorShare(fullName, nextToken()),
        fetchStalePrCount(fullName, nextToken()),
      ])
      await sleep(200)

      const metrics = computeMetrics(fullName, repoData, topContributorShare, stalePrCount)
      results.push(metrics)
      console.log(`  ✓ ${fullName} (${metrics.stars} stars)`)
    } catch (err) {
      console.warn(`  ✗ ${fullName} — error: ${err}`)
    }
  }

  return results
}

// ─── Calibration computation ──────────────────────────────────────────────────

function collect(results: RepoMetrics[], key: keyof RepoMetrics): number[] {
  return results
    .map((r) => r[key] as number | null)
    .filter((v): v is number => v !== null && isFinite(v))
}

function computeBracketCalibration(results: RepoMetrics[]) {
  return {
    sampleSize: results.length,
    stars:                           percentiles(collect(results, 'stars')),
    forks:                           percentiles(collect(results, 'forks')),
    watchers:                        percentiles(collect(results, 'watchers')),
    forkRate:                        percentiles(collect(results, 'forkRate')),
    watcherRate:                     percentiles(collect(results, 'watcherRate')),
    prMergeRate:                     percentiles(collect(results, 'prMergeRate')),
    issueClosureRate:                percentiles(collect(results, 'issueClosureRate')),
    staleIssueRatio:                 percentiles(collect(results, 'staleIssueRatio')),
    stalePrRatio:                    percentiles(collect(results, 'stalePrRatio')),
    medianTimeToMergeHours:          percentiles(collect(results, 'medianTimeToMergeHours')),
    medianTimeToCloseHours:          percentiles(collect(results, 'medianTimeToCloseHours')),
    issueFirstResponseMedianHours:   percentiles(collect(results, 'issueFirstResponseMedianHours')),
    issueFirstResponseP90Hours:      percentiles(collect(results, 'issueFirstResponseP90Hours')),
    prFirstReviewMedianHours:        percentiles(collect(results, 'prFirstReviewMedianHours')),
    prFirstReviewP90Hours:           percentiles(collect(results, 'prFirstReviewP90Hours')),
    issueResolutionMedianHours:      percentiles(collect(results, 'issueResolutionMedianHours')),
    issueResolutionP90Hours:         percentiles(collect(results, 'issueResolutionP90Hours')),
    prMergeMedianHours:              percentiles(collect(results, 'prMergeMedianHours')),
    prMergeP90Hours:                 percentiles(collect(results, 'prMergeP90Hours')),
    issueResolutionRate:             percentiles(collect(results, 'issueResolutionRate')),
    contributorResponseRate:         percentiles(collect(results, 'contributorResponseRate')),
    humanResponseRatio:              percentiles(collect(results, 'humanResponseRatio')),
    botResponseRatio:                percentiles(collect(results, 'botResponseRatio')),
    prReviewDepth:                   percentiles(collect(results, 'prReviewDepth')),
    issuesClosedWithoutCommentRatio: percentiles(collect(results, 'issuesClosedWithoutCommentRatio')),
    topContributorShare:             percentiles(collect(results, 'topContributorShare')),
  }
}

// ─── Dry-run support ─────────────────────────────────────────────────────────

const DRY_RUN = process.argv.includes('--dry-run')
const REPOS_OUTPUT_PATH = 'docs/calibrate-repos.md'

function writeDryRunReport(sampledRepos: Record<BracketKey, string[]>) {
  const lines: string[] = [
    '# Calibration Repos (dry-run)',
    '',
    `Generated: ${new Date().toISOString().split('T')[0]}`,
    '',
  ]

  let total = 0
  for (const bracketKey of Object.keys(BRACKETS) as BracketKey[]) {
    const bracket = BRACKETS[bracketKey]
    const repos = sampledRepos[bracketKey]
    total += repos.length

    lines.push(`## ${bracket.label} (${repos.length} repos)`)
    lines.push('')

    for (const repo of repos) {
      lines.push(`- [${repo}](https://github.com/${repo})`)
    }
    lines.push('')
  }

  lines.push(`---`)
  lines.push(`**Total: ${total} repos**`)
  lines.push('')
  lines.push('To proceed with full calibration using these repos, run:')
  lines.push('```')
  lines.push('npm run calibrate')
  lines.push('```')
  lines.push('The checkpoint already contains the sampled repos — the full run will skip re-sampling.')

  writeFileSync(REPOS_OUTPUT_PATH, lines.join('\n'))
  console.log(`\nRepo list written to ${REPOS_OUTPUT_PATH}`)
}

// ─── Repo list reader ────────────────────────────────────────────────────────

/**
 * Parses docs/calibrate-repos.md to extract the definitive repo list per bracket.
 * Returns null if the file doesn't exist (triggers fresh sampling).
 */
function readRepoListFile(): Record<BracketKey, string[]> | null {
  if (!existsSync(REPOS_OUTPUT_PATH)) return null

  const content = readFileSync(REPOS_OUTPUT_PATH, 'utf8')
  const result: Record<BracketKey, string[]> = { emerging: [], growing: [], established: [], popular: [] }

  const bracketPatterns: Array<{ key: BracketKey; pattern: RegExp }> = [
    { key: 'emerging', pattern: /^## Emerging/i },
    { key: 'growing', pattern: /^## Growing/i },
    { key: 'established', pattern: /^## Established/i },
    { key: 'popular', pattern: /^## Popular/i },
  ]

  let currentBracket: BracketKey | null = null

  for (const line of content.split('\n')) {
    const trimmed = line.trim()

    // Check for bracket headers
    for (const { key, pattern } of bracketPatterns) {
      if (pattern.test(trimmed)) {
        currentBracket = key
        break
      }
    }

    // Parse repo lines: "- [owner/repo](url)" or "- owner/repo"
    if (currentBracket && trimmed.startsWith('- ')) {
      const match = trimmed.match(/^- \[([^\]]+)\]/) ?? trimmed.match(/^- (.+)/)
      if (match?.[1]) {
        const repo = match[1].trim()
        if (repo.includes('/') && !repo.startsWith('http')) {
          result[currentBracket].push(repo)
        }
      }
    }
  }

  const total = Object.values(result).reduce((s, repos) => s + repos.length, 0)
  if (total === 0) return null

  return result
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (DRY_RUN) {
    console.log('DRY RUN — sampling repos from GitHub Search, writing to', REPOS_OUTPUT_PATH, '\n')
  }

  const checkpoint = loadCheckpoint()

  // Full runs use the definitive repo list from docs/calibrate-repos.md.
  // Dry runs always re-sample from GitHub Search API.
  const repoList = DRY_RUN ? null : readRepoListFile()
  if (repoList && !DRY_RUN) {
    const total = Object.values(repoList).reduce((s, repos) => s + repos.length, 0)
    console.log(`Using definitive repo list from ${REPOS_OUTPUT_PATH} (${total} repos)`)
  }

  for (const bracketKey of Object.keys(BRACKETS) as BracketKey[]) {
    const bracket = BRACKETS[bracketKey]
    console.log(`\n── ${bracket.label} ──`)

    // Determine repo list for this bracket
    if (repoList && !DRY_RUN) {
      // Full run: use repos from the definitive list file
      checkpoint.sampledRepos[bracketKey] = repoList[bracketKey]
      saveCheckpoint(checkpoint)
      console.log(`Loaded ${checkpoint.sampledRepos[bracketKey].length} repos from ${REPOS_OUTPUT_PATH}`)
    } else if (checkpoint.sampledRepos[bracketKey].length === 0) {
      // Dry run or no list file: sample from GitHub Search
      const totalTarget = bracket.strata.reduce((s, t) => s + t.target, 0)
      console.log(`Sampling across ${bracket.strata.length} strata (target ${totalTarget})...`)
      checkpoint.sampledRepos[bracketKey] = await sampleBracket(bracket)
      saveCheckpoint(checkpoint)
      console.log(`Sampled ${checkpoint.sampledRepos[bracketKey].length} repos`)
    } else {
      console.log(`Using ${checkpoint.sampledRepos[bracketKey].length} repos from checkpoint`)
    }

    if (DRY_RUN) continue

    const analyzed = new Set(checkpoint.results[bracketKey].map((r) => r.repo))
    const remaining = checkpoint.sampledRepos[bracketKey].filter((r) => !analyzed.has(r))
    console.log(`Already analyzed: ${checkpoint.results[bracketKey].length} | Remaining: ${remaining.length}`)

    // Process in batches
    for (let i = 0; i < remaining.length; i += BATCH_SIZE) {
      const batch = remaining.slice(i, i + BATCH_SIZE)
      console.log(`\n  Batch [${i + 1}–${Math.min(i + BATCH_SIZE, remaining.length)}/${remaining.length}]`)

      const batchResults = await processBatch(batch)
      checkpoint.results[bracketKey].push(...batchResults)
      saveCheckpoint(checkpoint)

      await sleep(500) // buffer between batches
    }

    console.log(`Bracket complete: ${checkpoint.results[bracketKey].length} results`)
  }

  if (DRY_RUN) {
    writeDryRunReport(checkpoint.sampledRepos)
    const total = Object.values(checkpoint.sampledRepos).reduce((s, r) => s + r.length, 0)
    console.log(`\nDry run complete: ${total} repos sampled across ${Object.keys(BRACKETS).length} brackets`)
    console.log('Checkpoint saved — run `npm run calibrate` to fetch metrics for these repos')
    return
  }

  // Compute and write calibration data
  console.log('\n── Computing percentiles ──')

  const calibration = {
    generated: new Date().toISOString().split('T')[0]!,
    source: 'GitHub Search API + lightweight GraphQL',
    sampleSizes: {
      emerging:    checkpoint.results.emerging.length,
      growing:     checkpoint.results.growing.length,
      established: checkpoint.results.established.length,
      popular:     checkpoint.results.popular.length,
    },
    brackets: {
      emerging:    computeBracketCalibration(checkpoint.results.emerging),
      growing:     computeBracketCalibration(checkpoint.results.growing),
      established: computeBracketCalibration(checkpoint.results.established),
      popular:     computeBracketCalibration(checkpoint.results.popular),
    },
  }

  writeFileSync(OUTPUT_PATH, JSON.stringify(calibration, null, 2))
  console.log(`\nCalibration data written to ${OUTPUT_PATH}`)
  console.log('Sample sizes:', calibration.sampleSizes)
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
