/**
 * Lists candidate repos per star bracket for manual review.
 *
 * Fetches from GitHub Search API with quality filters applied,
 * outputs a markdown file at scripts/calibration-candidates.md.
 *
 * Usage:
 *   npm run list-candidates
 *
 * Requires GITHUB_TOKEN in .env.local.
 */

import { loadEnvConfig } from '@next/env'
import { writeFileSync } from 'fs'

loadEnvConfig(process.cwd())

const TOKEN = process.env.GITHUB_TOKEN
if (!TOKEN) {
  console.error('GITHUB_TOKEN not found — add it to .env.local')
  process.exit(1)
}

const CANDIDATES_PER_BRACKET = 20
const OUTPUT_PATH = 'scripts/calibration-candidates.md'

function monthsAgo(n: number): string {
  const d = new Date()
  d.setMonth(d.getMonth() - n)
  return d.toISOString().split('T')[0]!
}

// Sub-ranges for established bracket to ensure diversity across 1k–10k
const ESTABLISHED_SUB_RANGES = [
  { stars: 'stars:1000..2999',  pushedAfter: monthsAgo(12), label: 'low' },
  { stars: 'stars:3000..5999',  pushedAfter: monthsAgo(12), label: 'mid' },
  { stars: 'stars:6000..9999',  pushedAfter: monthsAgo(12), label: 'high' },
]

const BRACKETS = [
  {
    key: 'emerging',
    label: 'Emerging (10–99 stars)',
    starsFilter: 'stars:10..99',
    starsMin: 10,
    starsMax: 99,
    pushedAfter: monthsAgo(12),
    fetchCount: 80, // over-fetch so we have enough after filtering
  },
  {
    key: 'growing',
    label: 'Growing (100–999 stars)',
    starsFilter: 'stars:100..999',
    starsMin: 100,
    starsMax: 999,
    pushedAfter: monthsAgo(12),
    fetchCount: 80,
  },
  {
    key: 'established',
    label: 'Established (1,000–9,999 stars)',
    starsFilter: null, // uses sub-ranges instead
    starsMin: 1000,
    starsMax: 9999,
    pushedAfter: monthsAgo(12),
    fetchCount: 40, // per sub-range
  },
  {
    key: 'popular',
    label: 'Popular (10,000+ stars)',
    starsFilter: 'stars:>=10000',
    starsMin: 10000,
    starsMax: null,
    pushedAfter: monthsAgo(12),
    fetchCount: 100, // over-fetch heavily — many will be filtered out
    sorts: ['updated', 'created', 'stars'], // updated-first avoids artificially inflated star counts
  },
]

// Patterns that indicate list/collection/resource repos rather than software projects
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

// Repo name suffixes/patterns that indicate documentation sites (not software)
const DOCS_NAME_PATTERNS = [
  /[-_.]?docs?$/i,
  /[-_.]?documentation$/i,
  /[-_.]?wiki$/i,
  /[-_.]?website$/i,
  /[-_.]?(\.io)$/i,
  /[-_.]?guidelines?$/i,
  /[-_.]?writers?[- _]toolkit$/i,
]

// Description phrases that indicate a repo should be excluded
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

// Languages that are not genuine software projects (notebooks, filter lists, etc.)
const EXCLUDED_LANGUAGES = new Set([
  'Jupyter Notebook',
  'Adblock Filter List',
  'TeX',
  'YAML',
  'Markdown',
  'DIGITAL Command Language',
])

const POPULAR_LANGUAGES = new Set([
  'JavaScript', 'TypeScript', 'Python', 'Java', 'Go', 'Rust', 'C++', 'C#',
])
const MAX_PER_POPULAR_LANGUAGE = 8
const MAX_PER_OTHER_LANGUAGE = 5

function maxForLanguage(lang: string): number {
  return POPULAR_LANGUAGES.has(lang) ? MAX_PER_POPULAR_LANGUAGE : MAX_PER_OTHER_LANGUAGE
}

interface RepoItem {
  full_name: string
  description: string | null
  stargazers_count: number
  language: string | null
  pushed_at: string
  open_issues_count: number
}

function isGenuineSoftwareProject(repo: RepoItem, starsMin: number, starsMax: number | null): boolean {
  // Must have a primary programming language
  if (!repo.language) return false

  // Exclude non-software primary languages
  if (EXCLUDED_LANGUAGES.has(repo.language)) return false

  // Must be within the intended star range (guards against search index staleness)
  if (repo.stargazers_count < starsMin) return false
  if (starsMax !== null && repo.stargazers_count > starsMax) return false

  const [owner, name] = repo.full_name.split('/')
  const repoName = name ?? ''
  const desc = repo.description ?? ''
  const nameAndDesc = `${repo.full_name} ${desc}`

  // Exclude profile READMEs (owner/owner repos)
  if (owner === repoName) return false

  // Exclude documentation/website repos by name pattern
  for (const pattern of DOCS_NAME_PATTERNS) {
    if (pattern.test(repoName)) return false
  }

  // Exclude by description patterns (mirrors, bypass tools, account cyclers, etc.)
  for (const pattern of EXCLUDED_DESC_PATTERNS) {
    if (pattern.test(desc) || pattern.test(repoName)) return false
  }

  // Exclude index/registry repos
  if (/\b(index|registry)\b/i.test(repoName) && /\b(index|registry)\b/i.test(desc)) return false

  // Filter out collection/resource repos by name and description patterns
  for (const pattern of COLLECTION_PATTERNS) {
    if (pattern.test(nameAndDesc)) return false
  }

  return true
}

async function fetchPage(
  starsFilter: string,
  pushedAfter: string,
  sort: string,
  perPage: number,
  page = 1,
): Promise<RepoItem[]> {
  const q = `${starsFilter} fork:false archived:false pushed:>${pushedAfter}`
  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&sort=${sort}&per_page=${perPage}&page=${page}`
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: 'application/vnd.github+json',
    },
  })

  if (!res.ok) {
    throw new Error(`Search API error ${res.status}: ${await res.text()}`)
  }

  const body = (await res.json()) as { items: RepoItem[] }
  return body.items
}

async function fetchCandidates(
  starsFilter: string,
  pushedAfter: string,
  starsMin: number,
  starsMax: number | null,
  target: number,
  fetchCount: number,
  sorts = ['updated', 'stars', 'created'],
): Promise<RepoItem[]> {
  const seen = new Set<string>()
  const langCount = new Map<string, number>()
  const candidates: RepoItem[] = []

  for (const sort of sorts) {
    if (candidates.length >= target) break

    const items = await fetchPage(starsFilter, pushedAfter, sort, Math.min(fetchCount, 100))
    await sleep(800)

    for (const repo of items) {
      if (seen.has(repo.full_name)) continue
      seen.add(repo.full_name)

      if (!isGenuineSoftwareProject(repo, starsMin, starsMax)) continue

      // Language diversity: cap how many repos share the same primary language
      const lang = repo.language!
      if ((langCount.get(lang) ?? 0) >= maxForLanguage(lang)) continue

      langCount.set(lang, (langCount.get(lang) ?? 0) + 1)
      candidates.push(repo)
    }
  }

  return candidates.slice(0, target)
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function main() {
  const lines: string[] = [
    '# Calibration Candidates',
    '',
    'Review each repo. Delete rows you want to exclude, or add replacements.',
    'Run `npm run calibrate` once you are happy with the list.',
    '',
  ]

  for (const bracket of BRACKETS) {
    console.log(`Fetching ${bracket.label}...`)

    let candidates: RepoItem[]

    if (bracket.key === 'established') {
      // Sample from three sub-ranges for diversity across 1k–10k
      const perSubRange = Math.ceil(CANDIDATES_PER_BRACKET / ESTABLISHED_SUB_RANGES.length)
      const all: RepoItem[] = []

      for (const sub of ESTABLISHED_SUB_RANGES) {
        console.log(`  Sub-range ${sub.label} (${sub.stars})...`)
        const batch = await fetchCandidates(
          sub.stars,
          sub.pushedAfter,
          bracket.starsMin,
          bracket.starsMax,
          perSubRange,
          bracket.fetchCount,
        )
        all.push(...batch)
        await sleep(500)
      }

      // Deduplicate and trim
      const seen = new Set<string>()
      candidates = all.filter((r) => {
        if (seen.has(r.full_name)) return false
        seen.add(r.full_name)
        return true
      }).slice(0, CANDIDATES_PER_BRACKET)
    } else {
      candidates = await fetchCandidates(
        bracket.starsFilter!,
        bracket.pushedAfter,
        bracket.starsMin,
        bracket.starsMax,
        CANDIDATES_PER_BRACKET,
        bracket.fetchCount,
        'sorts' in bracket ? bracket.sorts : undefined,
      )
    }

    lines.push(`## ${bracket.label}`)
    lines.push('')

    if (candidates.length === 0) {
      lines.push('_No candidates found — adjust filters or add manually._')
      lines.push('')
      continue
    }

    lines.push('| Repo | Stars | Language | Last pushed | Description |')
    lines.push('|------|-------|----------|-------------|-------------|')

    for (const repo of candidates) {
      const pushed = repo.pushed_at.split('T')[0]
      const desc = (repo.description ?? '').replace(/\|/g, '\\|').slice(0, 80)
      lines.push(
        `| [${repo.full_name}](https://github.com/${repo.full_name}) | ${repo.stargazers_count} | ${repo.language ?? '—'} | ${pushed} | ${desc} |`,
      )
    }

    lines.push('')
    console.log(`  → ${candidates.length} candidates`)
  }

  writeFileSync(OUTPUT_PATH, lines.join('\n'))
  console.log(`\nCandidates written to ${OUTPUT_PATH}`)
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
