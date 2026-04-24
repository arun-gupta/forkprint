import { queryGitHubGraphQL } from '@/lib/analyzer/github-graphql'
import { CANDIDACY_CRITERIA_QUERY, REPO_README_BLOB_QUERY } from '@/lib/analyzer/queries'
import { fetchCNCFLandscape } from '@/lib/cncf-sandbox/landscape'
import { scoreCandidacyRepo } from '@/lib/cncf-sandbox/candidacy-scoring'
import type { CandidacyRepoResult } from '@/lib/cncf-sandbox/types'
import type { RateLimitState } from '@/lib/analyzer/analysis-result'

const README_FILENAME_PATTERN = /^readme(\.[a-z0-9]+)?$/i

interface CriteriaResponse {
  repository: {
    description: string | null
    homepageUrl: string | null
    repositoryTopics: { nodes: Array<{ topic: { name: string } }> }
    licenseInfo: { spdxId: string | null } | null
    rootTree: { entries: Array<{ name: string; type: string }> } | null
    docContributing: { oid: string } | null
    docContributingLower: { oid: string } | null
    docContributingGithub: { oid: string } | null
    docContributingDocs: { oid: string } | null
    docCodeOfConduct: { oid: string } | null
    docCodeOfConductLower: { oid: string } | null
    docCodeOfConductGithub: { oid: string } | null
    cncfMaintainers: { oid: string } | null
    cncfMaintainersMd: { oid: string } | null
    cncfMaintainersMdLower: { oid: string } | null
    cncfCodeowners: { oid: string } | null
    cncfCodeownersGithub: { oid: string } | null
    docSecurity: { oid: string } | null
    docSecurityLower: { oid: string } | null
    docSecurityGithub: { oid: string } | null
    docSecurityDocs: { oid: string } | null
    cncfRoadmap: { oid: string } | null
    cncfRoadmapLower: { oid: string } | null
    cncfRoadmapDocs: { oid: string } | null
    cncfAdopters: { oid: string } | null
    cncfAdoptersLower: { oid: string } | null
    cncfAdoptersPlain: { oid: string } | null
    cncfAdoptersDocs: { oid: string } | null
    docLicense: { oid: string } | null
    docLicenseLower: { oid: string } | null
  } | null
}

type BatchResultItem =
  | { repo: string; success: true; result: CandidacyRepoResult }
  | { repo: string; success: false; error: string }

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      repos?: string[]
      token?: string | null
      stars?: Record<string, number>
    }

    if (!Array.isArray(body.repos) || body.repos.length === 0) {
      return Response.json({ error: { message: 'At least one repository is required.', code: 'INVALID_INPUT' } }, { status: 400 })
    }

    const token = body.token
    if (!token) {
      return Response.json({ error: { message: 'Authentication required.', code: 'UNAUTHENTICATED' } }, { status: 401 })
    }

    const starsMap: Record<string, number> = body.stars ?? {}

    const [landscapeData] = await Promise.allSettled([fetchCNCFLandscape()])
    const landscape = landscapeData.status === 'fulfilled' ? landscapeData.value : null

    let latestRateLimit: RateLimitState | null = null

    const results: BatchResultItem[] = await Promise.all(
      body.repos.map(async (repoSlug): Promise<BatchResultItem> => {
        const parts = repoSlug.split('/')
        const owner = parts[0]
        const name = parts[1]

        if (!owner || !name) {
          return { repo: repoSlug, success: false, error: 'Invalid repo slug' }
        }

        try {
          const criteriaResp = await queryGitHubGraphQL<CriteriaResponse>(
            token,
            CANDIDACY_CRITERIA_QUERY,
            { owner, name },
          )

          if (criteriaResp.rateLimit) latestRateLimit = criteriaResp.rateLimit

          const repo = criteriaResp.data.repository
          if (!repo) {
            return { repo: repoSlug, success: false, error: 'Repository not found' }
          }

          // Fetch README if available
          let readmeContent: string | null = null
          const readmeEntry = (repo.rootTree?.entries ?? []).find(
            (e) => e.type === 'blob' && README_FILENAME_PATTERN.test(e.name),
          )
          if (readmeEntry) {
            try {
              const readmeResp = await queryGitHubGraphQL<{
                repository: { object: { text: string | null } | null } | null
              }>(token, REPO_README_BLOB_QUERY, {
                owner,
                name,
                expression: `HEAD:${readmeEntry.name}`,
              })
              if (readmeResp.rateLimit) latestRateLimit = readmeResp.rateLimit
              readmeContent = readmeResp.data.repository?.object?.text ?? null
            } catch {
              // Non-fatal — proceed without README content
            }
          }

          const hasRoadmapFile = !!(repo.cncfRoadmap || repo.cncfRoadmapLower || repo.cncfRoadmapDocs)
          const hasReadmeRoadmapSection = !!(readmeContent?.match(/^#+\s*roadmap\b/im))

          const result = scoreCandidacyRepo(
            repoSlug,
            starsMap[repoSlug] ?? 0,
            {
              spdxId: repo.licenseInfo?.spdxId ?? null,
              hasLicenseFile: !!(repo.docLicense || repo.docLicenseLower),
              hasContributing: !!(
                repo.docContributing || repo.docContributingLower ||
                repo.docContributingGithub || repo.docContributingDocs
              ),
              hasCodeOfConduct: !!(
                repo.docCodeOfConduct || repo.docCodeOfConductLower || repo.docCodeOfConductGithub
              ),
              hasMaintainers: !!(
                repo.cncfMaintainers || repo.cncfMaintainersMd || repo.cncfMaintainersMdLower ||
                repo.cncfCodeowners || repo.cncfCodeownersGithub
              ),
              hasSecurity: !!(
                repo.docSecurity || repo.docSecurityLower || repo.docSecurityGithub || repo.docSecurityDocs
              ),
              hasRoadmapFile,
              hasReadmeRoadmapSection,
              hasWebsite: !!(repo.homepageUrl?.trim()),
              hasAdopters: !!(
                repo.cncfAdopters || repo.cncfAdoptersLower || repo.cncfAdoptersPlain || repo.cncfAdoptersDocs
              ),
              description: repo.description,
              topics: (repo.repositoryTopics?.nodes ?? []).map((n) => n.topic.name),
              readmeContent,
            },
            landscape,
          )

          return { repo: repoSlug, success: true, result }
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Unknown error'
          return { repo: repoSlug, success: false, error: message }
        }
      }),
    )

    return Response.json({ results, rateLimit: latestRateLimit })
  } catch (error) {
    console.error('[cncf-candidacy] Request failed:', error)
    return Response.json({ error: { message: 'Candidacy scan request failed.', code: 'INTERNAL_ERROR' } }, { status: 500 })
  }
}
