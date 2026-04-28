import { analyze } from '@/lib/analyzer/analyze'
import type { AnalysisResult, AnalyzeResponse } from '@/lib/analyzer/analysis-result'
import type { FoundationTarget } from '@/lib/cncf-sandbox/types'
import { fetchCNCFLandscape, fetchCNCFSandboxIssues, fetchSandboxIssueBody, findSandboxApplication, getLandscapeProjectStatus } from '@/lib/cncf-sandbox/landscape'
import { evaluateAspirant } from '@/lib/cncf-sandbox/evaluate'
import { parseApplicationIssue } from '@/lib/cncf-sandbox/parse-application'
import { buildApprovedCorpusSummary } from '@/lib/cncf-sandbox/approved-corpus'

export const MAX_REPOS_PER_REQUEST = 25

/** Returns true for a well-formed "owner/name" GitHub slug (no leading slash, exactly one slash, both parts non-empty). */
function isValidRepoSlug(slug: string): boolean {
  const slash = slug.indexOf('/')
  if (slash <= 0) return false
  const owner = slug.slice(0, slash)
  const name = slug.slice(slash + 1)
  return owner.length > 0 && name.length > 0 && !name.includes('/')
}

/** Minimal AnalysisResult stub for repos already in the CNCF landscape — skips expensive GitHub analysis. */
function makeLandscapeOverrideResult(repo: string, status: 'sandbox' | 'incubating' | 'graduated' | null): AnalysisResult {
  return {
    repo,
    name: 'unavailable',
    description: 'unavailable',
    createdAt: 'unavailable',
    primaryLanguage: 'unavailable',
    stars: 'unavailable',
    forks: 'unavailable',
    watchers: 'unavailable',
    commits30d: 'unavailable',
    commits90d: 'unavailable',
    releases12mo: 'unavailable',
    prsOpened90d: 'unavailable',
    prsMerged90d: 'unavailable',
    issuesOpen: 'unavailable',
    issuesClosed90d: 'unavailable',
    uniqueCommitAuthors90d: 'unavailable',
    totalContributors: 'unavailable',
    maintainerCount: 'unavailable',
    commitCountsByAuthor: 'unavailable',
    commitCountsByExperimentalOrg: 'unavailable',
    experimentalAttributedAuthors90d: 'unavailable',
    experimentalUnattributedAuthors90d: 'unavailable',
    issueFirstResponseTimestamps: 'unavailable',
    issueCloseTimestamps: 'unavailable',
    prMergeTimestamps: 'unavailable',
    documentationResult: 'unavailable',
    licensingResult: 'unavailable',
    defaultBranchName: 'unavailable',
    topics: [],
    inclusiveNamingResult: 'unavailable',
    securityResult: 'unavailable',
    missingFields: [],
    landscapeOverride: true,
    ...(status ? { landscapeStatus: status } : {}),
    aspirantResult: null,
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      repos?: string[]
      token?: string | null
      foundationTarget?: FoundationTarget
      sandboxIssueNumbers?: Record<string, number>
    }

    if (!Array.isArray(body.repos) || body.repos.length === 0) {
      return Response.json({ error: { message: 'At least one repository is required.', code: 'INVALID_INPUT' } }, { status: 400 })
    }

    if (body.repos.length > MAX_REPOS_PER_REQUEST) {
      return Response.json({ error: { message: `Too many repositories. Maximum allowed is ${MAX_REPOS_PER_REQUEST}.`, code: 'TOO_MANY_REPOS' } }, { status: 400 })
    }

    const invalidSlugs = body.repos.filter((r) => !isValidRepoSlug(r))
    if (invalidSlugs.length > 0) {
      return Response.json({ error: { message: `Invalid repository slug(s): ${invalidSlugs.join(', ')}. Expected format: owner/name.`, code: 'INVALID_SLUG' } }, { status: 400 })
    }

    const token = body.token

    if (!token) {
      return Response.json({ error: { message: 'Authentication required.', code: 'UNAUTHENTICATED' } }, { status: 401 })
    }

    const foundationTarget: FoundationTarget = body.foundationTarget ?? 'none'

    console.log(`[analyze] Starting analysis for ${body.repos.length} repo(s): ${body.repos.join(', ')}`)
    const start = Date.now()

    // For CNCF Sandbox: fetch landscape data first so already-CNCF repos are
    // identified before the expensive GitHub analysis runs (fail-fast).
    let landscapeData = null
    let issues: Awaited<ReturnType<typeof fetchCNCFSandboxIssues>> = []
    let approvedCorpus: Awaited<ReturnType<typeof buildApprovedCorpusSummary>> | undefined
    const landscapeOverrideResults: AnalysisResult[] = []
    let reposToAnalyze = body.repos

    if (foundationTarget === 'cncf-sandbox') {
      const [landscapeResult, sandboxIssues, approvedCorpusResult] = await Promise.allSettled([
        fetchCNCFLandscape(),
        fetchCNCFSandboxIssues(token),
        buildApprovedCorpusSummary(token),
      ])

      landscapeData = landscapeResult.status === 'fulfilled' ? landscapeResult.value : null
      issues = sandboxIssues.status === 'fulfilled' ? sandboxIssues.value : []
      approvedCorpus = approvedCorpusResult.status === 'fulfilled' ? approvedCorpusResult.value : undefined

      if (landscapeResult.status === 'rejected') {
        console.warn('[analyze] CNCF landscape fetch failed — proceeding without landscape data')
      }
      if (sandboxIssues.status === 'rejected') {
        console.warn('[analyze] CNCF sandbox issues fetch failed — proceeding without application status')
      }
      if (approvedCorpusResult.status === 'rejected') {
        console.warn('[analyze] Approved corpus fetch failed — proceeding without corpus-based hints')
      }

      const knownIssueNumbers = body.sandboxIssueNumbers ?? {}

      // Pre-filter: build lightweight stubs for repos already in the CNCF
      // landscape so analyze() is never called for them.
      reposToAnalyze = []
      for (const repo of body.repos) {
        const existingStatus = landscapeData ? getLandscapeProjectStatus(repo, landscapeData) : null
        if (existingStatus === 'sandbox' || existingStatus === 'incubating' || existingStatus === 'graduated') {
          landscapeOverrideResults.push(makeLandscapeOverrideResult(repo, existingStatus))
          continue
        }

        const knownNumber = knownIssueNumbers[repo]
        const preliminaryMatch = knownNumber
          ? (issues.find((i) => i.issueNumber === knownNumber) ?? null)
          : issues.length > 0
            ? findSandboxApplication(repo, issues)
            : null

        if (preliminaryMatch?.approved) {
          landscapeOverrideResults.push(makeLandscapeOverrideResult(repo, null))
          continue
        }

        reposToAnalyze.push(repo)
      }
    }

    // Run GitHub analysis only for repos that need it.
    const response: AnalyzeResponse = reposToAnalyze.length > 0
      ? await analyze({ repos: reposToAnalyze, token })
      : { results: [], failures: [], rateLimit: null }

    // Attach aspirant evaluation results to analyzed repos.
    if (foundationTarget === 'cncf-sandbox' && reposToAnalyze.length > 0) {
      const knownIssueNumbers = body.sandboxIssueNumbers ?? {}

      for (const result of response.results) {
        const knownNumber = knownIssueNumbers[result.repo]
        const preliminaryMatch = knownNumber
          ? (issues.find((i) => i.issueNumber === knownNumber) ?? null)
          : issues.length > 0
            ? findSandboxApplication(result.repo, issues)
            : null

        const aspirantResult = evaluateAspirant(result, landscapeData, issues, knownNumber)
        if (aspirantResult.sandboxApplication) {
          const issueBody = await fetchSandboxIssueBody(token, aspirantResult.sandboxApplication.issueNumber)
          if (issueBody) {
            aspirantResult.sandboxApplication.parsedFields = parseApplicationIssue(issueBody, approvedCorpus)
          }
        }
        // Re-check preliminary match in case evaluateAspirant changed state (defensive).
        if (preliminaryMatch?.approved) {
          result.landscapeOverride = true
          result.aspirantResult = null
        } else {
          result.aspirantResult = aspirantResult
        }
      }
    }

    // Merge landscape-override stubs into results, then restore original input order.
    response.results.push(...landscapeOverrideResults)
    const inputOrder = new Map(body.repos.map((repo, i) => [repo.toLowerCase(), i]))
    response.results.sort((a, b) => (inputOrder.get(a.repo.toLowerCase()) ?? Infinity) - (inputOrder.get(b.repo.toLowerCase()) ?? Infinity))

    const elapsed = ((Date.now() - start) / 1000).toFixed(1)
    console.log(`[analyze] Completed in ${elapsed}s — ${response.results.length} succeeded, ${response.failures.length} failed`)
    if (response.rateLimit) {
      console.log(`[analyze] Rate limit remaining: ${response.rateLimit.remaining}, resets at: ${response.rateLimit.resetAt}`)
    }
    if (response.diagnostics?.length) {
      for (const d of response.diagnostics) {
        console.warn(`[analyze] Diagnostic: ${d.repo} ${d.source} — ${d.message}`)
      }
    }

    return Response.json(response)
  } catch (error) {
    console.error(`[analyze] Request failed:`, error)
    return Response.json({ error: { message: 'Analysis request failed.', code: 'INTERNAL_ERROR' } }, { status: 500 })
  }
}
