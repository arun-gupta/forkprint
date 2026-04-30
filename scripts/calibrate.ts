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
import { computePercentiles } from './percentile-utils'

loadEnvConfig(process.cwd())

// ─── Token pool ───────────────────────────────────────────────────────────────
//
// Priority: GITHUB_TOKEN_1/2/3/... (numbered) → GITHUB_TOKENS (comma-separated) → GITHUB_TOKEN (single)

function collectTokens(): string[] {
  // 1. Numbered: GITHUB_TOKEN_1, GITHUB_TOKEN_2, ...
  const numbered: string[] = []
  for (const [key, value] of Object.entries(process.env)) {
    if (/^GITHUB_TOKENS?_\d+$/i.test(key) && value?.trim()) {
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
const OUTPUT_PATH = 'lib/scoring/calibration-data.json'

function monthsAgo(n: number): string {
  const d = new Date()
  d.setMonth(d.getMonth() - n)
  return d.toISOString().split('T')[0]!
}

// Each bracket is divided into strata with proportional targets — denser strata
// (more repos in the population) get higher targets. This reflects the actual
// GitHub population distribution where far more repos exist at the low end.
//
// Target sample sizes per bracket:
//   Emerging:    4 strata, 200 total (60+50+45+45)
//   Growing:     5 strata, 200 total (55+45+40+35+25)
//   Established: 5 strata, 200 total (55+45+40+35+25)
//   Popular:     5 strata, 195 total (60+50+40+30+15)
//
// Grand total: ~795 repos

interface Stratum {
  label: string
  min: number
  max: number | null
  pushedAfter: string
  target: number
}

// Solo profile brackets (issue #229). Solo repos above 100 stars are rare
// enough that a calibrated bracket would be sparse — they fall back to
// community brackets at runtime, so no solo-medium / solo-large is defined.
const SOLO_BRACKETS: Record<string, { label: string; strata: Stratum[] }> = {
  'solo-tiny': {
    label: 'Solo Tiny (< 10 stars)',
    strata: [
      { label: 'S1 (1–4)', min: 1, max: 4, pushedAfter: monthsAgo(12), target: 200 },
      { label: 'S2 (5–9)', min: 5, max: 9, pushedAfter: monthsAgo(12), target: 200 },
    ],
  },
  'solo-small': {
    label: 'Solo Small (10–99 stars)',
    strata: [
      { label: 'S1 (10–29)', min: 10, max: 29, pushedAfter: monthsAgo(12), target: 160 },
      { label: 'S2 (30–59)', min: 30, max: 59, pushedAfter: monthsAgo(12), target: 140 },
      { label: 'S3 (60–99)', min: 60, max: 99, pushedAfter: monthsAgo(12), target: 100 },
    ],
  },
}

const COMMUNITY_BRACKETS: Record<string, { label: string; strata: Stratum[] }> = {
  emerging: {
    label: 'Emerging (10–99 stars)',
    strata: [
      { label: 'S1 (10–19)',   min: 10,  max: 19,  pushedAfter: monthsAgo(12), target: 118 },
      { label: 'S2 (20–34)',   min: 20,  max: 34,  pushedAfter: monthsAgo(12), target: 102 },
      { label: 'S3 (35–54)',   min: 35,  max: 54,  pushedAfter: monthsAgo(12), target: 92 },
      { label: 'S4 (55–99)',   min: 55,  max: 99,  pushedAfter: monthsAgo(12), target: 88 },
    ],
  },
  growing: {
    label: 'Growing (100–999 stars)',
    strata: [
      { label: 'S1 (100–199)',  min: 100,  max: 199,  pushedAfter: monthsAgo(12), target: 108 },
      { label: 'S2 (200–349)',  min: 200,  max: 349,  pushedAfter: monthsAgo(12), target: 87 },
      { label: 'S3 (350–549)',  min: 350,  max: 549,  pushedAfter: monthsAgo(12), target: 80 },
      { label: 'S4 (550–749)',  min: 550,  max: 749,  pushedAfter: monthsAgo(12), target: 70 },
      { label: 'S5 (750–999)',  min: 750,  max: 999,  pushedAfter: monthsAgo(12), target: 55 },
    ],
  },
  established: {
    label: 'Established (1k–10k stars)',
    strata: [
      { label: 'S1 (1k–2k)',    min: 1000,  max: 1999,  pushedAfter: monthsAgo(12), target: 108 },
      { label: 'S2 (2k–3.5k)',  min: 2000,  max: 3499,  pushedAfter: monthsAgo(12), target: 87 },
      { label: 'S3 (3.5k–5k)',  min: 3500,  max: 4999,  pushedAfter: monthsAgo(12), target: 80 },
      { label: 'S4 (5k–7k)',    min: 5000,  max: 6999,  pushedAfter: monthsAgo(12), target: 70 },
      { label: 'S5 (7k–10k)',   min: 7000,  max: 9999,  pushedAfter: monthsAgo(12), target: 55 },
    ],
  },
  popular: {
    label: 'Popular (10k+ stars)',
    strata: [
      { label: 'S1 (10k–20k)',   min: 10000,   max: 19999,  pushedAfter: monthsAgo(12), target: 115 },
      { label: 'S2 (20k–40k)',   min: 20000,   max: 39999,  pushedAfter: monthsAgo(12), target: 95 },
      { label: 'S3 (40k–80k)',   min: 40000,   max: 79999,  pushedAfter: monthsAgo(12), target: 80 },
      { label: 'S4 (80k–170k)',  min: 80000,   max: 169999, pushedAfter: monthsAgo(12), target: 60 },
      { label: 'S5 (170k+)',     min: 170000,  max: null,    pushedAfter: monthsAgo(12), target: 40 },
    ],
  },
}

type BracketKey = string

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

// Dynamic language cap — popular languages get higher limits to reflect
// GitHub's natural distribution while still preventing domination.
const POPULAR_LANGUAGES = new Set([
  'JavaScript', 'TypeScript', 'Python', 'Java', 'Go', 'Rust', 'C++', 'C#',
])
const MAX_PER_POPULAR_LANGUAGE = 15
const MAX_PER_OTHER_LANGUAGE = 8

function maxForLanguage(lang: string): number {
  return POPULAR_LANGUAGES.has(lang) ? MAX_PER_POPULAR_LANGUAGE : MAX_PER_OTHER_LANGUAGE
}

// Org diversity cap — prevents any single org from dominating a bracket.
const MAX_PER_ORG = 5

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
  return computePercentiles(values).p90
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
  const empty: Record<BracketKey, RepoMetrics[]> = {}
  const emptySampled: Record<BracketKey, string[]> = {}
  for (const key of Object.keys(BRACKETS)) {
    empty[key] = []
    emptySampled[key] = []
  }
  return { results: empty, sampledRepos: emptySampled }
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
  orgCount: Map<string, number>,
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
        // Solo runs loosen the language cap — the solo cohort's natural
        // language distribution differs from the general population and a
        // strict cap would under-sample languages that solo maintainers
        // favor. Still capped so no single language can dominate.
        const langCap = SOLO_PROFILE
          ? (POPULAR_LANGUAGES.has(lang) ? 40 : 20)
          : maxForLanguage(lang)
        if ((langCount.get(lang) ?? 0) >= langCap) continue

        // Org cap only applies to community runs. Solo repos are by
        // definition single-maintainer individual accounts, so org
        // concentration is effectively a no-op for solo sampling.
        if (!SOLO_PROFILE) {
          const org = repo.full_name.split('/')[0]!
          if ((orgCount.get(org) ?? 0) >= MAX_PER_ORG) continue
        }
        const org = repo.full_name.split('/')[0]!

        if (SOLO_PROFILE) {
          // Verify solo criteria before admitting the candidate. Marks the
          // repo as seen either way so we don't re-check it across sorts.
          seen.add(repo.full_name)
          const isSolo = await isSoloCandidate(repo.full_name, nextToken()).catch(() => false)
          if (!isSolo) continue
        } else {
          seen.add(repo.full_name)
        }
        langCount.set(lang, (langCount.get(lang) ?? 0) + 1)
        orgCount.set(org, (orgCount.get(org) ?? 0) + 1)
        accepted.push(repo.full_name)
      }

      await sleep(600)
    }
  }

  return accepted
}

async function sampleBracket(bracket: { label: string; strata: Stratum[] }, excludeRepos?: Set<string>): Promise<string[]> {
  const all: string[] = []
  const seen = new Set<string>(excludeRepos ?? [])
  const langCount = new Map<string, number>()
  const orgCount = new Map<string, number>()

  for (const stratum of bracket.strata) {
    console.log(`  Stratum ${stratum.label} — target ${stratum.target}`)
    const repos = await sampleStratum(stratum, seen, langCount, orgCount)
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
    stars:                           computePercentiles(collect(results, 'stars')),
    forks:                           computePercentiles(collect(results, 'forks')),
    watchers:                        computePercentiles(collect(results, 'watchers')),
    forkRate:                        computePercentiles(collect(results, 'forkRate')),
    watcherRate:                     computePercentiles(collect(results, 'watcherRate')),
    prMergeRate:                     computePercentiles(collect(results, 'prMergeRate')),
    issueClosureRate:                computePercentiles(collect(results, 'issueClosureRate')),
    staleIssueRatio:                 computePercentiles(collect(results, 'staleIssueRatio')),
    stalePrRatio:                    computePercentiles(collect(results, 'stalePrRatio')),
    medianTimeToMergeHours:          computePercentiles(collect(results, 'medianTimeToMergeHours')),
    medianTimeToCloseHours:          computePercentiles(collect(results, 'medianTimeToCloseHours')),
    issueFirstResponseMedianHours:   computePercentiles(collect(results, 'issueFirstResponseMedianHours')),
    issueFirstResponseP90Hours:      computePercentiles(collect(results, 'issueFirstResponseP90Hours')),
    prFirstReviewMedianHours:        computePercentiles(collect(results, 'prFirstReviewMedianHours')),
    prFirstReviewP90Hours:           computePercentiles(collect(results, 'prFirstReviewP90Hours')),
    issueResolutionMedianHours:      computePercentiles(collect(results, 'issueResolutionMedianHours')),
    issueResolutionP90Hours:         computePercentiles(collect(results, 'issueResolutionP90Hours')),
    prMergeMedianHours:              computePercentiles(collect(results, 'prMergeMedianHours')),
    prMergeP90Hours:                 computePercentiles(collect(results, 'prMergeP90Hours')),
    issueResolutionRate:             computePercentiles(collect(results, 'issueResolutionRate')),
    contributorResponseRate:         computePercentiles(collect(results, 'contributorResponseRate')),
    humanResponseRatio:              computePercentiles(collect(results, 'humanResponseRatio')),
    botResponseRatio:                computePercentiles(collect(results, 'botResponseRatio')),
    prReviewDepth:                   computePercentiles(collect(results, 'prReviewDepth')),
    issuesClosedWithoutCommentRatio: computePercentiles(collect(results, 'issuesClosedWithoutCommentRatio')),
    topContributorShare:             computePercentiles(collect(results, 'topContributorShare')),
  }
}

// ─── Profile flag (issue #229) ───────────────────────────────────────────────

const SOLO_PROFILE = process.argv.includes('--profile=solo')
const BRACKETS: Record<string, { label: string; strata: Stratum[] }> = SOLO_PROFILE ? SOLO_BRACKETS : COMMUNITY_BRACKETS
const CHECKPOINT_PATH = SOLO_PROFILE ? 'scripts/calibrate-solo-checkpoint.json' : 'scripts/calibrate-checkpoint.json'

// Lightweight solo verification. Mirrors the 3-of-4 heuristic in
// lib/scoring/solo-profile.ts using only signals we can fetch cheaply.
// Because we can't access the full AnalysisResult during sampling, we
// require 2-of-3 of: ≤2 unique recent commit authors, ≤2 contributors,
// no GOVERNANCE file. Maintainer-count isn't derivable lightweight, so
// it's approximated by the contributor-count check. Candidates that
// fail the filter are skipped.
async function isSoloCandidate(fullName: string, token: string): Promise<boolean> {
  const [contribRes, commitsRes, govRes] = await Promise.all([
    fetchWithRetry(`https://api.github.com/repos/${fullName}/contributors?per_page=3&anon=1`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
    }),
    fetchWithRetry(`https://api.github.com/repos/${fullName}/commits?per_page=100&since=${monthsAgo(3)}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
    }),
    fetchWithRetry(`https://api.github.com/repos/${fullName}/contents/GOVERNANCE.md`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
    }),
  ])

  const contribs = contribRes.ok ? ((await contribRes.json()) as unknown[]) : []
  const contributorsLowCount = Array.isArray(contribs) && contribs.length <= 2

  let recentAuthorsLowCount = false
  if (commitsRes.ok) {
    const commits = (await commitsRes.json()) as Array<{ author?: { login?: string } | null; commit?: { author?: { email?: string } } }>
    const authors = new Set<string>()
    for (const c of commits ?? []) {
      const id = c.author?.login ?? c.commit?.author?.email ?? ''
      if (id) authors.add(id)
    }
    recentAuthorsLowCount = authors.size > 0 && authors.size <= 2
  }

  const noGovernance = govRes.status === 404

  const tripped = [contributorsLowCount, recentAuthorsLowCount, noGovernance].filter(Boolean).length
  return tripped >= 2
}

// ─── Dry-run support ─────────────────────────────────────────────────────────

const DRY_RUN = process.argv.includes('--dry-run')
const REPOS_OUTPUT_PATH = 'docs/calibrate-repos.md'

// Read the existing repo file (if any) as a map of canonical header → section
// text so a dry-run for one profile can replace only its own sections and
// leave the other profile's sections intact. Section text starts at `## `
// and includes all lines up to but not including the next `## ` or `---`.
function readSectionsByHeader(): Map<string, string[]> {
  const sections = new Map<string, string[]>()
  if (!existsSync(REPOS_OUTPUT_PATH)) return sections
  const content = readFileSync(REPOS_OUTPUT_PATH, 'utf8').split('\n')
  let currentHeader: string | null = null
  let currentLines: string[] = []
  for (const line of content) {
    if (line.startsWith('## ')) {
      if (currentHeader) sections.set(currentHeader, currentLines)
      currentHeader = line
      currentLines = [line]
    } else if (line.startsWith('---')) {
      if (currentHeader) {
        sections.set(currentHeader, currentLines)
        currentHeader = null
        currentLines = []
      }
    } else if (currentHeader) {
      currentLines.push(line)
    }
  }
  if (currentHeader) sections.set(currentHeader, currentLines)
  return sections
}

// Canonical header order across both profiles. Sections not in this list
// are preserved but pushed to the end.
const CANONICAL_ORDER = [
  'Solo Tiny',
  'Solo Small',
  'Emerging',
  'Growing',
  'Established',
  'Popular',
]

function headerSortKey(header: string): number {
  const stripped = header.replace(/^##\s+/, '').trim()
  for (let i = 0; i < CANONICAL_ORDER.length; i++) {
    if (stripped.toLowerCase().startsWith(CANONICAL_ORDER[i]!.toLowerCase())) return i
  }
  return CANONICAL_ORDER.length
}

function writeDryRunReport(sampledRepos: Record<BracketKey, string[]>) {
  const existingSections = readSectionsByHeader()

  // Replace the sections owned by the active profile.
  for (const bracketKey of Object.keys(BRACKETS) as BracketKey[]) {
    const bracket = BRACKETS[bracketKey]
    const repos = sampledRepos[bracketKey]
    const header = `## ${bracket.label} (${repos.length} repos)`
    const sectionLines = [header, '']
    for (const repo of repos) sectionLines.push(`- [${repo}](https://github.com/${repo})`)
    sectionLines.push('')
    // Drop any old section for this bracket (match by label prefix, since the
    // count in parens may differ between runs).
    for (const key of [...existingSections.keys()]) {
      const stripped = key.replace(/^##\s+/, '').trim()
      if (stripped.toLowerCase().startsWith(bracket.label.toLowerCase().split(' (')[0]!)) {
        existingSections.delete(key)
      }
    }
    existingSections.set(header, sectionLines)
  }

  const orderedHeaders = [...existingSections.keys()].sort(
    (a, b) => headerSortKey(a) - headerSortKey(b),
  )

  const lines: string[] = [
    '# Calibration Repos (dry-run)',
    '',
    `Generated: ${new Date().toISOString().split('T')[0]}`,
    '',
  ]

  let total = 0
  for (const header of orderedHeaders) {
    const section = existingSections.get(header)!
    lines.push(...section)
    // Count repos by counting lines starting with `- [`
    total += section.filter((l) => l.startsWith('- [')).length
  }

  lines.push(`---`)
  lines.push(`**Total: ${total} repos**`)
  lines.push('')
  lines.push('To proceed with full calibration using these repos, run:')
  lines.push('```')
  lines.push(SOLO_PROFILE ? 'npm run calibrate:solo' : 'npm run calibrate')
  lines.push('```')
  lines.push('The checkpoint already contains the sampled repos — the full run will skip re-sampling.')

  writeFileSync(REPOS_OUTPUT_PATH, lines.join('\n'))
  console.log(`\nRepo list written to ${REPOS_OUTPUT_PATH}`)
}

const DIVERSITY_REPORT_PATH = 'docs/calibrate-diversity.md'

async function writeDiversityReport(sampledRepos: Record<BracketKey, string[]>) {
  const lines: string[] = [
    '# Calibration Diversity Report',
    '',
    `Generated: ${new Date().toISOString().split('T')[0]}`,
    '',
    'This report is auto-generated by `npm run calibrate:dry-run` to provide transparency into the composition of the calibration sample.',
    '',
  ]

  let grandTotal = 0
  const globalOrgs = new Map<string, number>()

  // Fetch languages for all repos
  console.log('Fetching languages for diversity report...')
  const repoLanguages = new Map<string, string>()
  const allRepos = Object.values(sampledRepos).flat()
  for (let i = 0; i < allRepos.length; i += 5) {
    const batch = allRepos.slice(i, i + 5)
    await Promise.all(batch.map(async (repo) => {
      try {
        const res = await fetchWithRetry(`https://api.github.com/repos/${repo}`, {
          headers: { Authorization: `Bearer ${nextToken()}`, Accept: 'application/vnd.github+json' },
        })
        if (res.ok) {
          const data = (await res.json()) as { language: string | null }
          repoLanguages.set(repo, data.language ?? 'None')
        }
      } catch {
        repoLanguages.set(repo, 'Unknown')
      }
    }))
    if ((i + 5) % 100 < 5) console.log(`  ${Math.min(i + 5, allRepos.length)}/${allRepos.length}...`)
    await sleep(200)
  }
  console.log(`  Languages fetched for ${repoLanguages.size} repos`)

  for (const bracketKey of Object.keys(BRACKETS) as BracketKey[]) {
    const bracket = BRACKETS[bracketKey]
    const repos = sampledRepos[bracketKey]
    grandTotal += repos.length

    lines.push(`## ${bracket.label} (${repos.length} repos)`)
    lines.push('')

    // Org distribution
    const orgs = new Map<string, number>()
    for (const repo of repos) {
      const org = repo.split('/')[0]!
      orgs.set(org, (orgs.get(org) ?? 0) + 1)
      globalOrgs.set(org, (globalOrgs.get(org) ?? 0) + 1)
    }

    const sortedOrgs = [...orgs.entries()].sort((a, b) => b[1] - a[1])
    const multiRepoOrgs = sortedOrgs.filter(([, count]) => count >= 2)
    const singleRepoCount = sortedOrgs.filter(([, count]) => count === 1).length

    lines.push(`### Organization diversity`)
    lines.push('')
    lines.push(`- **${orgs.size}** unique organizations`)
    lines.push(`- **${singleRepoCount}** single-repo orgs`)
    if (multiRepoOrgs.length > 0) {
      lines.push(`- **${multiRepoOrgs.length}** orgs with 2+ repos:`)
      for (const [org, count] of multiRepoOrgs) {
        lines.push(`  - ${org}: ${count}`)
      }
    }
    lines.push('')

    // Language distribution for this bracket
    const bracketLangs = new Map<string, number>()
    for (const repo of repos) {
      const lang = repoLanguages.get(repo) ?? 'Unknown'
      bracketLangs.set(lang, (bracketLangs.get(lang) ?? 0) + 1)
    }
    const sortedLangs = [...bracketLangs.entries()].sort((a, b) => b[1] - a[1])
    lines.push(`### Language distribution`)
    lines.push('')
    lines.push(`**${bracketLangs.size}** unique languages`)
    lines.push('')
    lines.push('| Language | Repos | % |')
    lines.push('|----------|-------|---|')
    for (const [lang, count] of sortedLangs.slice(0, 10)) {
      lines.push(`| ${lang} | ${count} | ${(count / repos.length * 100).toFixed(1)}% |`)
    }
    const othersCount = sortedLangs.slice(10).reduce((s, [, c]) => s + c, 0)
    if (othersCount > 0) {
      lines.push(`| *Others* | *${othersCount}* | *${(othersCount / repos.length * 100).toFixed(1)}%* |`)
    }
    lines.push('')

  }

  // Global summary — insert at the TOP of the report, after the header
  const summary: string[] = []

  // Bracket distribution
  // Compute global language stats first for the header
  const globalLangs = new Map<string, number>()
  for (const [, lang] of repoLanguages) {
    globalLangs.set(lang, (globalLangs.get(lang) ?? 0) + 1)
  }
  const sortedGlobalLangs = [...globalLangs.entries()].sort((a, b) => b[1] - a[1])

  summary.push(`## Summary: ${grandTotal} repos · ${globalOrgs.size} orgs · ${globalLangs.size} languages · ${Object.keys(BRACKETS).length} brackets`)
  summary.push('')
  summary.push('### Sample size')
  summary.push('')
  summary.push('| Bracket | Repos |')
  summary.push('|---------|-------|')
  for (const bracketKey of Object.keys(BRACKETS) as BracketKey[]) {
    const bracket = BRACKETS[bracketKey]
    const count = sampledRepos[bracketKey].length
    summary.push(`| ${bracket.label} | ${count} |`)
  }
  summary.push(`| **Total** | **${grandTotal}** |`)
  summary.push('')

  // Top orgs
  const topGlobalOrgs = [...globalOrgs.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15)
  summary.push('### Organization diversity')
  summary.push('')
  summary.push(`**${globalOrgs.size}** unique organizations across all brackets.`)
  summary.push('')
  summary.push('| Organization | Repos |')
  summary.push('|-------------|-------|')
  for (const [org, count] of topGlobalOrgs) {
    summary.push(`| ${org} | ${count} |`)
  }
  summary.push('')

  // Strata targets
  summary.push('### Strata targets')
  summary.push('')
  for (const bracketKey of Object.keys(BRACKETS) as BracketKey[]) {
    const bracket = BRACKETS[bracketKey]
    summary.push(`**${bracket.label}**: ${bracket.strata.map((s) => `${s.label} (${s.target})`).join(' · ')}`)
    summary.push('')
  }

  summary.push('**Why 4 vs 5 strata?** Emerging (10–99 stars) uses 4 strata because the range spans only 90 stars — a narrow range where a 5th stratum would create sub-ranges too small to be meaningful. Growing, Established, and Popular each span one or more orders of magnitude and use 5 strata for finer coverage.')
  summary.push('')
  summary.push('**Why are strata targets unequal?** Targets are proportional to GitHub\'s population density within each range. Lower strata (e.g., 10–19 stars) have vastly more repos in the population than upper strata (e.g., 170k+ stars), so they receive higher targets. This ensures the sample reflects the natural distribution rather than over-representing the sparse high end. Some strata may fall short of target when language or organization diversity caps limit the available pool.')
  summary.push('')

  // Language diversity summary
  summary.push('### Language diversity')
  summary.push('')
  summary.push(`**${globalLangs.size}** unique languages across all brackets.`)
  summary.push('')
  summary.push('| Language | Repos | % |')
  summary.push('|----------|-------|---|')
  for (const [lang, count] of sortedGlobalLangs.slice(0, 15)) {
    summary.push(`| ${lang} | ${count} | ${(count / grandTotal * 100).toFixed(1)}% |`)
  }
  const globalOthers = sortedGlobalLangs.slice(15).reduce((s, [, c]) => s + c, 0)
  if (globalOthers > 0) {
    summary.push(`| *Others* | *${globalOthers}* | *${(globalOthers / grandTotal * 100).toFixed(1)}%* |`)
  }
  summary.push('')
  summary.push(`Cap: ${MAX_PER_POPULAR_LANGUAGE} per bracket for popular languages (${[...POPULAR_LANGUAGES].join(', ')}), ${MAX_PER_OTHER_LANGUAGE} for others.`)
  summary.push('')

  // Sampling rules
  summary.push('### Sampling rules')
  summary.push('')
  summary.push(`- **Language cap**: ${MAX_PER_POPULAR_LANGUAGE} repos per bracket for popular languages, ${MAX_PER_OTHER_LANGUAGE} for others`)
  summary.push(`- **Organization cap**: ${MAX_PER_ORG} repos per organization per bracket`)
  summary.push('- **Pushed within**: 12 months (rolling window computed at runtime)')
  summary.push('- **Excluded**: forks, archived repos, profile READMEs, documentation sites, mirrors, collections/lists, bypass tools')
  summary.push('')
  summary.push('---')
  summary.push('')

  // Insert summary after the header (line index 5 = after "Generated" and blank line)
  const headerEnd = lines.findIndex((l) => l.startsWith('## '))
  lines.splice(headerEnd, 0, ...summary)
  lines.push('')

  writeFileSync(DIVERSITY_REPORT_PATH, lines.join('\n'))
  console.log(`Diversity report written to ${DIVERSITY_REPORT_PATH}`)
}

// ─── Repo list reader ────────────────────────────────────────────────────────

/**
 * Parses docs/calibrate-repos.md to extract the definitive repo list per bracket.
 * Returns null if the file doesn't exist (triggers fresh sampling).
 */
function readRepoListFile(): Record<BracketKey, string[]> | null {
  if (!existsSync(REPOS_OUTPUT_PATH)) return null

  const content = readFileSync(REPOS_OUTPUT_PATH, 'utf8')
  const result: Record<BracketKey, string[]> = {}
  for (const key of Object.keys(BRACKETS)) result[key] = []

  const bracketPatterns: Array<{ key: BracketKey; pattern: RegExp }> = SOLO_PROFILE
    ? [
        { key: 'solo-tiny', pattern: /^## Solo Tiny/i },
        { key: 'solo-small', pattern: /^## Solo Small/i },
      ]
    : [
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
    console.log('DRY RUN — preserving existing repos, sampling new ones to fill targets\n')
  }

  const checkpoint = loadCheckpoint()

  // Both dry runs and full runs read the existing repo list first.
  // Dry runs then sample new repos to fill the gaps; full runs use the list as-is.
  const existingRepoList = readRepoListFile()
  if (existingRepoList) {
    const total = Object.values(existingRepoList).reduce((s, repos) => s + repos.length, 0)
    console.log(`Existing repo list: ${REPOS_OUTPUT_PATH} (${total} repos)`)
  }

  for (const bracketKey of Object.keys(BRACKETS) as BracketKey[]) {
    const bracket = BRACKETS[bracketKey]
    console.log(`\n── ${bracket.label} ──`)

    const existingRepos = existingRepoList?.[bracketKey] ?? []
    const totalTarget = bracket.strata.reduce((s, t) => s + t.target, 0)

    if (DRY_RUN) {
      // Dry run: keep existing repos, sample new ones to fill the gap
      const needed = Math.max(0, totalTarget - existingRepos.length)
      if (needed > 0) {
        console.log(`Keeping ${existingRepos.length} existing repos, sampling ${needed} more (target ${totalTarget})...`)
        const newRepos = await sampleBracket(bracket, new Set(existingRepos))
        const combined = [...existingRepos, ...newRepos.slice(0, needed)]
        checkpoint.sampledRepos[bracketKey] = combined
      } else {
        console.log(`Already have ${existingRepos.length} repos (target ${totalTarget}) — no sampling needed`)
        checkpoint.sampledRepos[bracketKey] = existingRepos
      }
      saveCheckpoint(checkpoint)
      console.log(`  → ${checkpoint.sampledRepos[bracketKey].length} total repos`)
      continue
    }

    // Full run: use repos from the definitive list file
    if (existingRepoList) {
      checkpoint.sampledRepos[bracketKey] = existingRepos
      saveCheckpoint(checkpoint)
      console.log(`Loaded ${existingRepos.length} repos from ${REPOS_OUTPUT_PATH}`)
    } else if (checkpoint.sampledRepos[bracketKey].length === 0) {
      console.log(`No repo list file found. Sampling ${totalTarget} repos...`)
      checkpoint.sampledRepos[bracketKey] = await sampleBracket(bracket)
      saveCheckpoint(checkpoint)
      console.log(`Sampled ${checkpoint.sampledRepos[bracketKey].length} repos`)
    } else {
      console.log(`Using ${checkpoint.sampledRepos[bracketKey].length} repos from checkpoint`)
    }

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
    await writeDiversityReport(checkpoint.sampledRepos)
    const total = Object.values(checkpoint.sampledRepos).reduce((s, r) => s + r.length, 0)
    console.log(`\nDry run complete: ${total} repos sampled across ${Object.keys(BRACKETS).length} brackets`)
    console.log('Checkpoint saved — run `npm run calibrate` to fetch metrics for these repos')
    return
  }

  // Compute and write calibration data. Solo runs MERGE into the existing
  // community calibration file rather than overwriting it — they only touch
  // the solo-tiny / solo-small entries.
  console.log('\n── Computing percentiles ──')

  const newSampleSizes: Record<string, number> = {}
  const newBrackets: Record<string, ReturnType<typeof computeBracketCalibration>> = {}
  for (const key of Object.keys(BRACKETS)) {
    newSampleSizes[key] = checkpoint.results[key].length
    newBrackets[key] = computeBracketCalibration(checkpoint.results[key])
  }

  if (SOLO_PROFILE && existsSync(OUTPUT_PATH)) {
    const existing = JSON.parse(readFileSync(OUTPUT_PATH, 'utf8')) as {
      generated: string
      source: string
      sampleSizes: Record<string, number>
      brackets: Record<string, unknown>
    }
    const merged = {
      generated: new Date().toISOString().split('T')[0]!,
      source: existing.source,
      sampleSizes: { ...existing.sampleSizes, ...newSampleSizes },
      brackets: { ...existing.brackets, ...newBrackets },
    }
    writeFileSync(OUTPUT_PATH, JSON.stringify(merged, null, 2))
    console.log(`\nSolo calibration merged into ${OUTPUT_PATH}`)
    console.log('Solo sample sizes:', newSampleSizes)
    return
  }

  const calibration = {
    generated: new Date().toISOString().split('T')[0]!,
    source: 'GitHub Search API + lightweight GraphQL',
    sampleSizes: newSampleSizes,
    brackets: newBrackets,
  }

  writeFileSync(OUTPUT_PATH, JSON.stringify(calibration, null, 2))
  console.log(`\nCalibration data written to ${OUTPUT_PATH}`)
  console.log('Sample sizes:', calibration.sampleSizes)
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
