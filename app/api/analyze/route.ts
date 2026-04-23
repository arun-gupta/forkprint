import { analyze } from '@/lib/analyzer/analyze'
import type { FoundationTarget } from '@/lib/cncf-sandbox/types'
import { fetchCNCFLandscape, fetchCNCFSandboxIssues, fetchSandboxIssueBody, findSandboxApplication, getLandscapeProjectStatus } from '@/lib/cncf-sandbox/landscape'
import { evaluateAspirant } from '@/lib/cncf-sandbox/evaluate'
import { parseApplicationIssue } from '@/lib/cncf-sandbox/parse-application'

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      repos?: string[]
      token?: string | null
      foundationTarget?: FoundationTarget
    }

    if (!Array.isArray(body.repos) || body.repos.length === 0) {
      return Response.json({ error: 'At least one repository is required.' }, { status: 400 })
    }

    const token = body.token

    if (!token) {
      return Response.json({ error: 'Authentication required.' }, { status: 401 })
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
      const [landscapeResult, sandboxIssues] = await Promise.allSettled([
        fetchCNCFLandscape(),
        fetchCNCFSandboxIssues(token),
      ])

      landscapeData = landscapeResult.status === 'fulfilled' ? landscapeResult.value : null
      const issues = sandboxIssues.status === 'fulfilled' ? sandboxIssues.value : []

      if (landscapeResult.status === 'rejected') {
        console.warn('[analyze] CNCF landscape fetch failed — proceeding without landscape data')
      }
      if (sandboxIssues.status === 'rejected') {
        console.warn('[analyze] CNCF sandbox issues fetch failed — proceeding without application status')
      }

      // Attach aspirant evaluation results to each repo result
      for (const result of response.results) {
        // Short-circuit: if the matching issue already has gitvote/passed, skip full evaluation
        const preliminaryMatch = issues.length > 0
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

        const aspirantResult = evaluateAspirant(result, landscapeData, issues)
        // If an application issue was found, fetch its body and parse the fields
        if (aspirantResult.sandboxApplication) {
          const body = await fetchSandboxIssueBody(token, aspirantResult.sandboxApplication.issueNumber)
          if (body) {
            aspirantResult.sandboxApplication.parsedFields = parseApplicationIssue(body)
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
    return Response.json({ error: 'Analysis request failed.' }, { status: 500 })
  }
}
