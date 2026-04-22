// eslint-disable-next-line @typescript-eslint/no-require-imports
const yaml = require('js-yaml') as { load: (text: string) => unknown }
import type { CNCFLandscapeData, LandscapeCategory, LandscapeProjectStatus, SandboxApplicationIssue, SandboxIssueData } from './types'

const LANDSCAPE_URL =
  'https://raw.githubusercontent.com/cncf/landscape/master/landscape.yml'

let cache: CNCFLandscapeData | null = null

type RawItem = {
  repo_url?: string
  homepage_url?: string
  project?: string
  [key: string]: unknown
}

type RawSubcategory = {
  name?: string
  items?: RawItem[]
}

type RawCategory = {
  name?: string
  subcategories?: RawSubcategory[]
}

type LandscapeYml = {
  landscape?: RawCategory[]
}

export async function fetchCNCFLandscape(): Promise<CNCFLandscapeData | null> {
  if (cache) return cache

  try {
    const res = await fetch(LANDSCAPE_URL, {
      headers: { 'User-Agent': 'RepoPulse/1.0' },
      // 30 second timeout via AbortSignal
      signal: AbortSignal.timeout(30_000),
    })
    if (!res.ok) return null

    const text = await res.text()
    const raw = yaml.load(text) as LandscapeYml

    const repoUrls = new Set<string>()
    const homepageUrls = new Set<string>()
    const categories: LandscapeCategory[] = []
    const projectStatusMap = new Map<string, 'sandbox' | 'incubating' | 'graduated'>()

    for (const cat of raw?.landscape ?? []) {
      for (const sub of cat?.subcategories ?? []) {
        const projectRepos: string[] = []
        for (const item of sub?.items ?? []) {
          if (item.repo_url && typeof item.repo_url === 'string') {
            const normalized = normalizeUrl(item.repo_url)
            repoUrls.add(normalized)
            projectRepos.push(normalized)
            const proj = item.project
            if (proj === 'sandbox' || proj === 'incubating' || proj === 'graduated') {
              projectStatusMap.set(normalized, proj)
            }
          }
          if (item.homepage_url && typeof item.homepage_url === 'string') {
            homepageUrls.add(normalizeUrl(item.homepage_url))
          }
        }
        if (projectRepos.length > 0) {
          categories.push({
            name: cat.name ?? '',
            subcategoryName: sub.name ?? '',
            projectRepos,
          })
        }
      }
    }

    cache = { repoUrls, homepageUrls, fetchedAt: Date.now(), categories, projectStatusMap }
    return cache
  } catch {
    return null
  }
}

const SANDBOX_ISSUES_TTL_MS = 5 * 60 * 1000
let issueCache: SandboxIssueData | null = null

type GitHubIssueResponse = {
  number: number
  title: string
  html_url: string
  state: string
  created_at: string
  labels: Array<{ name: string }>
}

export async function fetchCNCFSandboxIssues(token: string): Promise<SandboxApplicationIssue[]> {
  if (issueCache && Date.now() - issueCache.fetchedAt < SANDBOX_ISSUES_TTL_MS) {
    return issueCache.issues
  }

  const issues: SandboxApplicationIssue[] = []
  try {
    let page = 1
    while (page <= 5) {
      const res = await fetch(
        `https://api.github.com/repos/cncf/sandbox/issues?state=all&per_page=100&page=${page}`,
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

      const batch = (await res.json()) as GitHubIssueResponse[]
      if (!Array.isArray(batch) || batch.length === 0) break

      for (const issue of batch) {
        const labels = (issue.labels ?? []).map((l) => l.name)
        issues.push({
          issueNumber: issue.number,
          issueUrl: issue.html_url,
          title: issue.title,
          state: issue.state === 'open' ? 'OPEN' : 'CLOSED',
          createdAt: issue.created_at,
          labels,
          approved: labels.includes('gitvote/passed'),
        })
      }

      if (batch.length < 100) break
      page++
    }
  } catch {
    // Non-fatal — return whatever we collected
  }

  issueCache = { issues, fetchedAt: Date.now() }
  return issues
}

export async function fetchSandboxIssueBody(token: string, issueNumber: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.github.com/repos/cncf/sandbox/issues/${issueNumber}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'User-Agent': 'RepoPulse/1.0',
        },
        signal: AbortSignal.timeout(10_000),
      },
    )
    if (!res.ok) return null
    const data = (await res.json()) as { body?: string }
    return data.body ?? null
  } catch {
    return null
  }
}

export function findSandboxApplication(
  repoSlug: string,
  issues: SandboxApplicationIssue[],
): SandboxApplicationIssue | null {
  const repoName = repoSlug.split('/')[1] ?? repoSlug
  const normalized = repoName.toLowerCase().replace(/[-_]/g, '')

  for (const issue of issues) {
    const titleNorm = issue.title.toLowerCase().replace(/[-_]/g, '')
    // Extract project name from title: strip common prefixes/brackets
    const stripped = titleNorm
      .replace(/\[sandbox\]/g, '')
      .replace(/\[project onboarding\]/g, '')
      .replace(/\[rescue\]/g, '')
      .replace(/\[update project\].*?:/g, '')
      .trim()

    // Word-boundary match: the repo name must appear as a standalone word
    const words = stripped.split(/\s+/)
    for (const word of words) {
      const wordNorm = word.replace(/[^a-z0-9]/g, '')
      if (wordNorm === normalized || wordNorm.startsWith(normalized) || normalized.startsWith(wordNorm)) {
        if (normalized.length >= 3 && wordNorm.length >= 3) {
          return issue
        }
      }
    }
  }
  return null
}

export function normalizeUrl(url: string): string {
  return url.toLowerCase().replace(/\.git$/, '').replace(/\/$/, '')
}

export function isRepoInLandscape(repoSlug: string, data: CNCFLandscapeData): boolean {
  const slug = repoSlug.toLowerCase()
  // Match against both github.com/owner/repo and just owner/repo forms
  const full = slug.startsWith('https://') ? normalizeUrl(slug) : `https://github.com/${slug}`
  return data.repoUrls.has(full) || data.repoUrls.has(slug)
}

/**
 * Returns the CNCF landscape status for a repo:
 * - 'graduated' | 'incubating' | 'sandbox' → has that project field in landscape.yml
 * - 'landscape' → listed in landscape but no project field (cloud-native but not CNCF-hosted)
 * - null → not listed in landscape at all
 */
export function getLandscapeProjectStatus(repoSlug: string, data: CNCFLandscapeData): LandscapeProjectStatus {
  const slug = repoSlug.toLowerCase()
  const full = slug.startsWith('https://') ? normalizeUrl(slug) : `https://github.com/${slug}`
  const status = data.projectStatusMap.get(full) ?? data.projectStatusMap.get(slug)
  if (status) return status
  if (isRepoInLandscape(repoSlug, data)) return 'landscape'
  return null
}
