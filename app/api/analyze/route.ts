import { analyze } from '@/lib/analyzer/analyze'
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

    const response = await analyze({
      repos: body.repos,
      token,
    })

    // Fetch CNCF landscape data when CNCF Sandbox target is selected
    let landscapeData = null
    if (foundationTarget === 'cncf-sandbox') {
      const [landscapeResult, sandboxIssues, approvedCorpusResult] = await Promise.allSettled([
        fetchCNCFLandscape(),
        fetchCNCFSandboxIssues(token),
        buildApprovedCorpusSummary(token),
      ])

      landscapeData = landscapeResult.status === 'fulfilled' ? landscapeResult.value : null
      const issues = sandboxIssues.status === 'fulfilled' ? sandboxIssues.value : []
      const approvedCorpus = approvedCorpusResult.status === 'fulfilled' ? approvedCorpusResult.value : undefined

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

      // Attach aspirant evaluation results to each repo result
      for (const result of response.results) {
        // Direct lookup when the caller knows the sandbox issue number (board scan);
        // fall back to fuzzy title matching for manually-entered repos.
        const knownNumber = knownIssueNumbers[result.repo]
        const preliminaryMatch = knownNumber
          ? (issues.find((i) => i.issueNumber === knownNumber) ?? null)
          : issues.length > 0
            ? findSandboxApplication(result.repo, issues)
            : null

        // Check if repo is already a CNCF-hosted project (sandbox/incubating/graduated)
        const existingStatus = landscapeData
          ? getLandscapeProjectStatus(result.repo, landscapeData)
          : null
        if (existingStatus === 'sandbox' || existingStatus === 'incubating' || existingStatus === 'graduated') {
          result.landscapeOverride = true
          result.landscapeStatus = existingStatus
          result.aspirantResult = null
          continue
        }

        if (preliminaryMatch?.approved) {
          result.landscapeOverride = true
          result.aspirantResult = null
          continue
        }

        const aspirantResult = evaluateAspirant(result, landscapeData, issues, knownNumber)
        // If an application issue was found, fetch its body and parse the fields
        if (aspirantResult.sandboxApplication) {
          const body = await fetchSandboxIssueBody(token, aspirantResult.sandboxApplication.issueNumber)
          if (body) {
            aspirantResult.sandboxApplication.parsedFields = parseApplicationIssue(body, approvedCorpus)
          }
        }
        result.aspirantResult = aspirantResult
      }
    }

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
