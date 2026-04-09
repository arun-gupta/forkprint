/**
 * Calibration script for RepoPulse scoring thresholds.
 *
 * Samples repos from GitHub Search API across four star brackets,
 * runs each through the RepoPulse analyzer, computes percentile
 * distributions per metric per bracket, and writes a versioned
 * config JSON to lib/scoring/calibration-data.json.
 *
 * Usage:
 *   npx tsx scripts/calibrate.ts
 *
 * Requires GITHUB_TOKEN in .env.local.
 * Checkpoints progress to scripts/calibrate-checkpoint.json so
 * the run can be resumed if interrupted.
 */

import { loadEnvConfig } from '@next/env'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { analyze } from '../lib/analyzer/analyze'
import type { AnalysisResult } from '../lib/analyzer/analysis-result'

// ─── Config ──────────────────────────────────────────────────────────────────

loadEnvConfig(process.cwd())

const TOKEN = process.env.GITHUB_TOKEN
if (!TOKEN) {
  console.error('GITHUB_TOKEN not found — add it to .env.local')
  process.exit(1)
}

const TARGET_PER_BRACKET = 200
const BATCH_SIZE = 20         // repos analyzed in parallel per batch
const MIN_RATE_LIMIT = 50     // pause when remaining GraphQL calls drop below this
const CHECKPOINT_PATH = 'scripts/calibrate-checkpoint.json'
const OUTPUT_PATH = 'lib/scoring/calibration-data.json'

const BRACKETS = {
  emerging:    { min: 10,    max: 99,   pushedAfter: '2025-01-01', label: 'Emerging (10–99 stars)' },
  growing:     { min: 100,   max: 999,  pushedAfter: '2024-10-01', label: 'Growing (100–999 stars)' },
  established: { min: 1000,  max: 9999, pushedAfter: '2024-10-01', label: 'Established (1k–10k stars)' },
  popular:     { min: 10000, max: null, pushedAfter: '2024-10-01', label: 'Popular (10k+ stars)' },
} as const

type BracketKey = keyof typeof BRACKETS

// ─── Types ───────────────────────────────────────────────────────────────────

interface Checkpoint {
  results: Record<BracketKey, AnalysisResult[]>
  sampledRepos: Record<BracketKey, string[]>
}

interface PercentileSet {
  p25: number
  p50: number
  p75: number
  p90: number
}

interface BracketCalibration {
  sampleSize: number
  stars: PercentileSet
  forks: PercentileSet
  watchers: PercentileSet
  forkRate: PercentileSet
  watcherRate: PercentileSet
  prMergeRate: PercentileSet
  issueClosureRate: PercentileSet
  staleIssueRatio: PercentileSet
  medianTimeToMergeHours: PercentileSet
  medianTimeToCloseHours: PercentileSet
  issueFirstResponseMedianHours: PercentileSet
  issueFirstResponseP90Hours: PercentileSet
  prFirstReviewMedianHours: PercentileSet
  topContributorShare: PercentileSet
}

interface CalibrationData {
  generated: string
  source: string
  sampleSizes: Record<BracketKey, number>
  brackets: Record<BracketKey, BracketCalibration>
}

// ─── Utilities ───────────────────────────────────────────────────────────────

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.ceil((p / 100) * sorted.length) - 1
  return Math.round(sorted[Math.max(0, index)] * 1000) / 1000
}

function percentiles(values: number[]): PercentileSet {
  return {
    p25: percentile(values, 25),
    p50: percentile(values, 50),
    p75: percentile(values, 75),
    p90: percentile(values, 90),
  }
}

function defined(v: number | 'unavailable' | undefined): v is number {
  return typeof v === 'number' && isFinite(v)
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
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

function saveCheckpoint(checkpoint: Checkpoint) {
  writeFileSync(CHECKPOINT_PATH, JSON.stringify(checkpoint, null, 2))
}

// ─── GitHub Search API ───────────────────────────────────────────────────────

async function fetchSearchPage(
  starsQuery: string,
  sort: string,
  page: number,
): Promise<string[]> {
  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(starsQuery)}&sort=${sort}&per_page=100&page=${page}`
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: 'application/vnd.github+json',
    },
  })

  if (!res.ok) {
    if (res.status === 403 || res.status === 429) {
      const retryAfter = Number(res.headers.get('Retry-After') ?? '60')
      console.log(`Search API rate limited. Waiting ${retryAfter}s...`)
      await sleep(retryAfter * 1000)
      return fetchSearchPage(starsQuery, sort, page)
    }
    throw new Error(`Search API error: ${res.status}`)
  }

  const body = (await res.json()) as { items: Array<{ full_name: string }> }
  return body.items.map((item) => item.full_name)
}

async function sampleRepos(bracket: (typeof BRACKETS)[BracketKey], target: number): Promise<string[]> {
  const starsFilter = bracket.max
    ? `stars:${bracket.min}..${bracket.max}`
    : `stars:>=${bracket.min}`
  const starsQuery = `${starsFilter} fork:false archived:false pushed:>${bracket.pushedAfter}`

  const repos = new Set<string>()
  // Use multiple sort strategies to diversify the sample
  const sorts = ['updated', 'created', 'stars']

  for (const sort of sorts) {
    if (repos.size >= target) break
    for (let page = 1; page <= 10 && repos.size < target; page++) {
      const names = await fetchSearchPage(starsQuery, sort, page)
      if (names.length === 0) break
      names.forEach((n) => repos.add(n))
      await sleep(500) // respect search API secondary rate limits
    }
  }

  return [...repos].slice(0, target)
}

// ─── Metrics extraction ───────────────────────────────────────────────────────

function extractMetrics(result: AnalysisResult) {
  const stars = defined(result.stars) ? result.stars : null
  const forks = defined(result.forks) ? result.forks : null
  const watchers = defined(result.watchers) ? result.watchers : null
  const forkRate = stars && forks && stars > 0 ? forks / stars : null
  const watcherRate = stars && watchers && stars > 0 ? watchers / stars : null

  const activity90 = result.activityMetricsByWindow?.[90]
  const prMergeRate =
    activity90 &&
    defined(activity90.prsOpened) &&
    defined(activity90.prsMerged) &&
    activity90.prsOpened > 0
      ? activity90.prsMerged / activity90.prsOpened
      : null

  const issueClosureRate =
    activity90 &&
    defined(activity90.issuesOpened) &&
    defined(activity90.issuesClosed) &&
    activity90.issuesOpened > 0
      ? activity90.issuesClosed / activity90.issuesOpened
      : null

  const staleIssueRatio =
    activity90 && defined(activity90.staleIssueRatio) ? activity90.staleIssueRatio : null

  const medianTimeToMergeHours =
    activity90 && defined(activity90.medianTimeToMergeHours)
      ? activity90.medianTimeToMergeHours
      : null

  const medianTimeToCloseHours =
    activity90 && defined(activity90.medianTimeToCloseHours)
      ? activity90.medianTimeToCloseHours
      : null

  const responsiveness = result.responsivenessMetrics
  const issueFirstResponseMedianHours =
    responsiveness && defined(responsiveness.issueFirstResponseMedianHours)
      ? responsiveness.issueFirstResponseMedianHours
      : null

  const issueFirstResponseP90Hours =
    responsiveness && defined(responsiveness.issueFirstResponseP90Hours)
      ? responsiveness.issueFirstResponseP90Hours
      : null

  const prFirstReviewMedianHours =
    responsiveness && defined(responsiveness.prFirstReviewMedianHours)
      ? responsiveness.prFirstReviewMedianHours
      : null

  // Top contributor share: commits by top author / total commits
  let topContributorShare: number | null = null
  if (result.commitCountsByAuthor && result.commitCountsByAuthor !== 'unavailable') {
    const counts = Object.values(result.commitCountsByAuthor)
    const total = counts.reduce((a, b) => a + b, 0)
    const top = Math.max(...counts)
    if (total > 0) topContributorShare = top / total
  }

  return {
    stars,
    forks,
    watchers,
    forkRate,
    watcherRate,
    prMergeRate,
    issueClosureRate,
    staleIssueRatio,
    medianTimeToMergeHours,
    medianTimeToCloseHours,
    issueFirstResponseMedianHours,
    issueFirstResponseP90Hours,
    prFirstReviewMedianHours,
    topContributorShare,
  }
}

function computeBracketCalibration(results: AnalysisResult[]): BracketCalibration {
  const metrics = results.map(extractMetrics)

  function collect(key: keyof ReturnType<typeof extractMetrics>): number[] {
    return metrics
      .map((m) => m[key])
      .filter((v): v is number => v !== null)
  }

  return {
    sampleSize: results.length,
    stars: percentiles(collect('stars')),
    forks: percentiles(collect('forks')),
    watchers: percentiles(collect('watchers')),
    forkRate: percentiles(collect('forkRate')),
    watcherRate: percentiles(collect('watcherRate')),
    prMergeRate: percentiles(collect('prMergeRate')),
    issueClosureRate: percentiles(collect('issueClosureRate')),
    staleIssueRatio: percentiles(collect('staleIssueRatio')),
    medianTimeToMergeHours: percentiles(collect('medianTimeToMergeHours')),
    medianTimeToCloseHours: percentiles(collect('medianTimeToCloseHours')),
    issueFirstResponseMedianHours: percentiles(collect('issueFirstResponseMedianHours')),
    issueFirstResponseP90Hours: percentiles(collect('issueFirstResponseP90Hours')),
    prFirstReviewMedianHours: percentiles(collect('prFirstReviewMedianHours')),
    topContributorShare: percentiles(collect('topContributorShare')),
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const checkpoint = loadCheckpoint()

  for (const bracketKey of Object.keys(BRACKETS) as BracketKey[]) {
    const bracket = BRACKETS[bracketKey]
    const existing = checkpoint.results[bracketKey]

    console.log(`\n── ${bracket.label} ──`)

    // Sample repos if not already done
    if (checkpoint.sampledRepos[bracketKey].length === 0) {
      console.log(`Sampling ${TARGET_PER_BRACKET} repos...`)
      checkpoint.sampledRepos[bracketKey] = await sampleRepos(bracket, TARGET_PER_BRACKET)
      saveCheckpoint(checkpoint)
      console.log(`Sampled ${checkpoint.sampledRepos[bracketKey].length} repos`)
    } else {
      console.log(`Using ${checkpoint.sampledRepos[bracketKey].length} sampled repos from checkpoint`)
    }

    const analyzedRepos = new Set(existing.map((r) => r.repo))
    const remaining = checkpoint.sampledRepos[bracketKey].filter((r) => !analyzedRepos.has(r))

    console.log(`Already analyzed: ${existing.length} | Remaining: ${remaining.length}`)

    // Analyze in batches
    for (let i = 0; i < remaining.length; i += BATCH_SIZE) {
      const batch = remaining.slice(i, i + BATCH_SIZE)
      process.stdout.write(`  [${i + 1}–${Math.min(i + BATCH_SIZE, remaining.length)}/${remaining.length}] `)

      const response = await analyze({ repos: batch, token: TOKEN! })

      checkpoint.results[bracketKey].push(...response.results)
      saveCheckpoint(checkpoint)

      process.stdout.write(`✓ (${response.results.length} ok, ${response.failures.length} failed)\n`)

      // Check rate limit
      if (response.rateLimit && typeof response.rateLimit.remaining === 'number') {
        const remaining = response.rateLimit.remaining
        if (remaining < MIN_RATE_LIMIT) {
          const resetAt = response.rateLimit.resetAt
          const waitMs = resetAt && resetAt !== 'unavailable'
            ? Math.max(0, new Date(resetAt).getTime() - Date.now()) + 5000
            : 60000
          console.log(`Rate limit low (${remaining} remaining). Waiting ${Math.ceil(waitMs / 1000)}s...`)
          await sleep(waitMs)
        }
      }

      await sleep(200) // small buffer between batches
    }

    console.log(`Bracket complete: ${checkpoint.results[bracketKey].length} results`)
  }

  // Compute calibration data
  console.log('\n── Computing percentiles ──')

  const calibration: CalibrationData = {
    generated: new Date().toISOString().split('T')[0]!,
    source: 'GitHub Search API + RepoPulse GraphQL analyzer',
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
  console.error('Fatal error:', err)
  process.exit(1)
})
