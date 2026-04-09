/**
 * Fast calibration script for RepoPulse scoring thresholds.
 *
 * Combines three optimizations over the original calibrate.ts:
 *   1. Lightweight custom GraphQL — bypasses analyze() and its slow paginated
 *      commit history calls. Fetches only the fields needed for calibration.
 *   2. GraphQL alias batching — fetches 5 repos per query instead of 1.
 *   3. Multi-token round-robin — accepts GITHUB_TOKENS (comma-separated) to
 *      multiply effective rate limit. Falls back to GITHUB_TOKEN.
 *
 * Metrics NOT collected (require bot detection / maintainer identification):
 *   humanResponseRatio, botResponseRatio, contributorResponseRate,
 *   stalePrRatio, prFirstReviewP90Hours, issueResolutionMedianHours,
 *   issueResolutionP90Hours, prMergeMedianHours, prMergeP90Hours,
 *   issueResolutionRate
 *   (these fields are left as null in the output)
 *
 * Usage:
 *   npm run calibrate-fast
 *
 * Env vars:
 *   GITHUB_TOKENS=token1,token2,token3   (preferred — multiplies rate limit)
 *   GITHUB_TOKEN=token                   (fallback — single token)
 *
 * Checkpoints progress to scripts/calibrate-fast-checkpoint.json.
 * Delete it to start a fresh run.
 */

import { loadEnvConfig } from '@next/env'
import { existsSync, readFileSync, writeFileSync } from 'fs'

loadEnvConfig(process.cwd())

// ─── Token pool ───────────────────────────────────────────────────────────────

const rawTokens = (process.env.GITHUB_TOKENS ?? process.env.GITHUB_TOKEN ?? '')
  .split(',')
  .map((t) => t.trim())
  .filter(Boolean)

if (rawTokens.length === 0) {
  console.error('No GitHub tokens found. Set GITHUB_TOKENS or GITHUB_TOKEN in .env.local')
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

const TARGET_PER_BRACKET = 50   // minimum for p90 stability (5 anchor points)
const BATCH_SIZE = 5             // repos per GraphQL alias query
const PR_WINDOW_DAYS = 90
const ISSUE_WINDOW_DAYS = 90
const STALE_DAYS = 30
const CHECKPOINT_PATH = 'scripts/calibrate-fast-checkpoint.json'
const OUTPUT_PATH = 'lib/scoring/calibration-data.json'

const BRACKETS = {
  emerging:    { min: 10,    max: 99,   pushedAfter: '2025-01-01', label: 'Emerging (10–99 stars)' },
  growing:     { min: 100,   max: 999,  pushedAfter: '2024-10-01', label: 'Growing (100–999 stars)' },
  established: { min: 1000,  max: 9999, pushedAfter: '2024-10-01', label: 'Established (1k–10k stars)' },
  popular:     { min: 10000, max: null, pushedAfter: '2024-10-01', label: 'Popular (10k+ stars)' },
} as const

type BracketKey = keyof typeof BRACKETS

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
  prReviewDepth: number | null
  issuesClosedWithoutCommentRatio: number | null
  topContributorShare: number | null
}

interface Checkpoint {
  results: Record<BracketKey, RepoMetrics[]>
  sampledRepos: Record<BracketKey, string[]>
}

// ─── GraphQL types ────────────────────────────────────────────────────────────

interface GQLPRNode {
  createdAt: string
  mergedAt: string | null
  reviews: { totalCount: number }
  comments: { totalCount: number }
  timelineItems: { nodes: Array<{ createdAt?: string }> }
}

interface GQLIssueNode {
  createdAt: string
  closedAt: string | null
  comments: { totalCount: number }
  timelineItems: { nodes: Array<{ createdAt?: string }> }
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
): Promise<string[]> {
  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=${sort}&per_page=100&page=${page}`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
  })

  if (!res.ok) {
    if (res.status === 403 || res.status === 429) {
      const wait = Number(res.headers.get('Retry-After') ?? '60')
      console.log(`Search rate limited. Waiting ${wait}s...`)
      await sleep(wait * 1000)
      return fetchSearchPage(query, sort, page, token)
    }
    throw new Error(`Search API ${res.status}: ${await res.text()}`)
  }

  const body = (await res.json()) as { items: Array<{ full_name: string }> }
  return body.items.map((i) => i.full_name)
}

async function sampleRepos(
  bracket: (typeof BRACKETS)[BracketKey],
  target: number,
): Promise<string[]> {
  const starsFilter = bracket.max
    ? `stars:${bracket.min}..${bracket.max}`
    : `stars:>=${bracket.min}`
  const query = `${starsFilter} fork:false archived:false pushed:>${bracket.pushedAfter}`
  const repos = new Set<string>()
  const sorts = ['updated', 'created', 'stars']

  for (const sort of sorts) {
    if (repos.size >= target) break
    for (let page = 1; page <= 10 && repos.size < target; page++) {
      const names = await fetchSearchPage(query, sort, page, nextToken())
      if (names.length === 0) break
      names.forEach((n) => repos.add(n))
      await sleep(600)
    }
  }

  return [...repos].slice(0, target)
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
            comments { totalCount }
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
                ... on IssueComment { createdAt }
              }
            }
          }
        }
      }`
  }).join('\n')

  return `{ ${aliases} }`
}

async function runGraphQL(query: string, token: string): Promise<Record<string, GQLRepoData | null>> {
  const res = await fetch('https://api.github.com/graphql', {
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
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
    })

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

// ─── Metrics computation ──────────────────────────────────────────────────────

function computeMetrics(fullName: string, data: GQLRepoData, topContributorShare: number | null): RepoMetrics {
  const stars = data.stargazerCount
  const forks = data.forkCount
  const watchers = data.watchers.totalCount

  const forkRate = stars > 0 ? forks / stars : null
  const watcherRate = stars > 0 ? watchers / stars : null

  // Filter PRs/issues to the activity window
  const recentPRs = data.mergedPRs.nodes.filter(
    (pr) => pr.mergedAt && pr.mergedAt >= PR_WINDOW,
  )
  const recentIssues = data.closedIssues.nodes.filter(
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
      const firstComment = issue.timelineItems.nodes[0]?.createdAt
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
      const firstReview = pr.timelineItems.nodes[0]?.createdAt
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
      ? recentPRs.reduce((s, pr) => s + pr.reviews.totalCount, 0) / recentPRs.length
      : null

  // Issues closed without any comment
  const issuesClosedWithoutCommentRatio =
    recentIssues.length > 0
      ? recentIssues.filter((i) => i.comments.totalCount === 0).length / recentIssues.length
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
    stalePrRatio: null,              // not computable without per-repo search queries
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
      const topContributorShare = await fetchTopContributorShare(fullName, nextToken())
      await sleep(200)

      const metrics = computeMetrics(fullName, repoData, topContributorShare)
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
    // Bot detection metrics — not computable without maintainer identification.
    // Scoring functions that use these will fall back to 0 (no contribution to score).
    contributorResponseRate:         { p25: 0, p50: 0, p75: 0, p90: 0 },
    humanResponseRatio:              { p25: 0, p50: 0, p75: 0, p90: 0 },
    botResponseRatio:                { p25: 0, p50: 0, p75: 0, p90: 0 },
    prReviewDepth:                   percentiles(collect(results, 'prReviewDepth')),
    issuesClosedWithoutCommentRatio: percentiles(collect(results, 'issuesClosedWithoutCommentRatio')),
    topContributorShare:             percentiles(collect(results, 'topContributorShare')),
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const checkpoint = loadCheckpoint()

  for (const bracketKey of Object.keys(BRACKETS) as BracketKey[]) {
    const bracket = BRACKETS[bracketKey]
    console.log(`\n── ${bracket.label} ──`)

    // Sample repos if not already done
    if (checkpoint.sampledRepos[bracketKey].length === 0) {
      console.log(`Sampling ${TARGET_PER_BRACKET} repos...`)
      checkpoint.sampledRepos[bracketKey] = await sampleRepos(bracket, TARGET_PER_BRACKET)
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

  // Compute and write calibration data
  console.log('\n── Computing percentiles ──')

  const calibration = {
    generated: new Date().toISOString().split('T')[0]!,
    source: 'GitHub Search API + lightweight GraphQL (calibrate-fast)',
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
