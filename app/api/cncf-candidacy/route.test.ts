import { beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from './route'
import { queryGitHubGraphQL } from '@/lib/analyzer/github-graphql'
import { fetchCNCFLandscape } from '@/lib/cncf-sandbox/landscape'
import { scoreCandidacyRepo } from '@/lib/cncf-sandbox/candidacy-scoring'

vi.mock('@/lib/analyzer/github-graphql', () => ({
  queryGitHubGraphQL: vi.fn(),
}))

vi.mock('@/lib/cncf-sandbox/landscape', () => ({
  fetchCNCFLandscape: vi.fn(),
}))

vi.mock('@/lib/cncf-sandbox/candidacy-scoring', () => ({
  scoreCandidacyRepo: vi.fn(),
}))

const queryMock = vi.mocked(queryGitHubGraphQL)
const landscapeMock = vi.mocked(fetchCNCFLandscape)
const scoreMock = vi.mocked(scoreCandidacyRepo)

function makeRequest(body: unknown) {
  return new Request('http://localhost/api/cncf-candidacy', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

const MINIMAL_CRITERIA_RESP = {
  data: {
    repository: {
      description: 'Test repo',
      homepageUrl: null,
      repositoryTopics: { nodes: [] },
      licenseInfo: { spdxId: 'MIT' },
      rootTree: { entries: [] },
      docContributing: null, docContributingLower: null, docContributingGithub: null, docContributingDocs: null,
      docCodeOfConduct: null, docCodeOfConductLower: null, docCodeOfConductGithub: null,
      cncfMaintainers: null, cncfMaintainersMd: null, cncfMaintainersMdLower: null,
      cncfCodeowners: null, cncfCodeownersGithub: null,
      docSecurity: null, docSecurityLower: null, docSecurityGithub: null, docSecurityDocs: null,
      cncfRoadmap: null, cncfRoadmapLower: null, cncfRoadmapDocs: null,
      cncfAdopters: null, cncfAdoptersLower: null, cncfAdoptersPlain: null, cncfAdoptersDocs: null,
      docLicense: null, docLicenseLower: null,
    },
  },
  rateLimit: null,
}

describe('POST /api/cncf-candidacy', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    landscapeMock.mockResolvedValue(null)
    scoreMock.mockReturnValue({
      repo: 'facebook/react',
      stars: 0,
      landscapeStatus: null,
      track1Score: 0,
      track2Score: 0,
      tier: 'not-ready',
      topGaps: [],
      readmeFirstParagraph: null,
      track1: {
        license: false, contributing: false, codeOfConduct: false, maintainers: false,
        security: false, roadmap: false, website: false, adopters: false, landscape: false,
      },
      track2: {
        lfxInsights: false, projectSummary: false, roadmapContext: false, specOrStandard: false,
        businessSeparation: false, cloudNativeIntegration: false, cloudNativeOverlap: false,
        similarProjects: false, tagReview: false,
      },
    })
  })

  it('returns 401 when token is missing', async () => {
    const response = await POST(makeRequest({ repos: ['facebook/react'] }))
    const body = await response.json()
    expect(response.status).toBe(401)
    expect(body.error).toEqual({ message: 'Authentication required.', code: 'UNAUTHENTICATED' })
  })

  it('returns 400 when repos array is empty', async () => {
    const response = await POST(makeRequest({ repos: [], token: 'ghp_test' }))
    const body = await response.json()
    expect(response.status).toBe(400)
    expect(body.error).toEqual({ message: 'At least one repository is required.', code: 'INVALID_INPUT' })
  })

  it('returns 400 when repos is missing', async () => {
    const response = await POST(makeRequest({ token: 'ghp_test' }))
    const body = await response.json()
    expect(response.status).toBe(400)
    expect(body.error.code).toBe('INVALID_INPUT')
  })

  it('returns results for a valid request', async () => {
    queryMock.mockResolvedValue(MINIMAL_CRITERIA_RESP)

    const response = await POST(makeRequest({ repos: ['facebook/react'], token: 'ghp_test' }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(Array.isArray(body.results)).toBe(true)
    expect(body.results[0].repo).toBe('facebook/react')
    expect(body.results[0].success).toBe(true)
  })

  it('marks a repo as failed when GraphQL throws', async () => {
    queryMock.mockRejectedValue(new Error('GraphQL error'))

    const response = await POST(makeRequest({ repos: ['facebook/react'], token: 'ghp_test' }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.results[0].success).toBe(false)
    expect(body.results[0].error).toBe('GraphQL error')
  })

  it('marks a repo as failed when the repository is not found', async () => {
    queryMock.mockResolvedValue({ data: { repository: null }, rateLimit: null })

    const response = await POST(makeRequest({ repos: ['facebook/react'], token: 'ghp_test' }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.results[0].success).toBe(false)
    expect(body.results[0].error).toBe('Repository not found')
  })

  it('marks a repo as failed for an invalid slug', async () => {
    const response = await POST(makeRequest({ repos: ['invalid-slug'], token: 'ghp_test' }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.results[0].success).toBe(false)
    expect(body.results[0].error).toBe('Invalid repo slug')
  })

  it('proceeds with null landscape when landscape fetch fails', async () => {
    landscapeMock.mockRejectedValue(new Error('network error'))
    queryMock.mockResolvedValue(MINIMAL_CRITERIA_RESP)

    const response = await POST(makeRequest({ repos: ['facebook/react'], token: 'ghp_test' }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(scoreMock).toHaveBeenCalledWith('facebook/react', 0, expect.anything(), null)
  })

  it('propagates stars from the request to scoreCandidacyRepo', async () => {
    queryMock.mockResolvedValue(MINIMAL_CRITERIA_RESP)

    await POST(makeRequest({ repos: ['facebook/react'], token: 'ghp_test', stars: { 'facebook/react': 200000 } }))

    expect(scoreMock).toHaveBeenCalledWith('facebook/react', 200000, expect.anything(), null)
  })
})
