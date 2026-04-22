import type {
  CandidacyGap,
  CandidacyRepoResult,
  CandidacyTier,
  CandidacyTrack1,
  CandidacyTrack2,
  CNCFLandscapeData,
  LandscapeProjectStatus,
} from './types'
import { getLandscapeProjectStatus } from './landscape'
import { getCatalogEntryByKey } from '@/lib/recommendations/catalog'

// CNCF-approved license SPDX IDs (same set as aspirant evaluator)
const CNCF_ALLOWED_SPDX_IDS = new Set([
  'Apache-2.0', 'MIT', 'BSD-2-Clause', 'BSD-3-Clause', 'ISC', 'MPL-2.0',
])

// CNCF project names used for cloud-native integration heuristic
const CNCF_PROJECT_NAMES = [
  'kubernetes', 'prometheus', 'envoy', 'containerd', 'fluentd', 'jaeger',
  'vitess', 'coredns', 'harbor', 'rook', 'open policy agent', 'opa',
  'opentelemetry', 'argo', 'flux', 'falco', 'spiffe', 'spire', 'contour',
  'crossplane', 'dapr', 'thanos', 'keda', 'cert-manager', 'keptn',
]

// TAG keywords for TAG review heuristic
const TAG_KEYWORDS = [
  'tag-security', 'tag-runtime', 'tag-network', 'tag-storage', 'tag-app-delivery',
  'technical advisory', 'sig-', 'cncf tag', 'cncf sig',
]

export interface CandidacyRawData {
  spdxId: string | null
  hasLicenseFile: boolean
  hasContributing: boolean
  hasCodeOfConduct: boolean
  hasMaintainers: boolean
  hasSecurity: boolean
  hasRoadmapFile: boolean
  hasReadmeRoadmapSection: boolean
  hasWebsite: boolean
  hasAdopters: boolean
  description: string | null
  topics: string[]
  readmeContent: string | null
}

function scoreTrack1(
  repo: string,
  data: CandidacyRawData,
  landscapeData: CNCFLandscapeData | null,
): CandidacyTrack1 {
  const landscapeStatus = landscapeData
    ? getLandscapeProjectStatus(repo, landscapeData)
    : null

  return {
    license: data.hasLicenseFile && data.spdxId != null && CNCF_ALLOWED_SPDX_IDS.has(data.spdxId),
    contributing: data.hasContributing,
    codeOfConduct: data.hasCodeOfConduct,
    maintainers: data.hasMaintainers,
    security: data.hasSecurity,
    roadmap: data.hasRoadmapFile || data.hasReadmeRoadmapSection,
    website: data.hasWebsite,
    adopters: data.hasAdopters,
    landscape: landscapeStatus != null,
  }
}

function scoreTrack2(data: CandidacyRawData, landscapeData: CNCFLandscapeData | null): CandidacyTrack2 {
  const readme = (data.readmeContent ?? '').toLowerCase()
  const descAndReadme = `${(data.description ?? '').toLowerCase()} ${readme}`

  const cloudNativeIntegration = CNCF_PROJECT_NAMES.some((name) =>
    descAndReadme.includes(name.toLowerCase()),
  )

  const specOrStandard = /\b(spec|rfc|specification|standard|protocol)\b/i.test(descAndReadme)

  const tagReview = TAG_KEYWORDS.some((kw) => descAndReadme.includes(kw))

  // Cloud native overlap: check if landscape has categories with multiple projects
  const cloudNativeOverlap = (landscapeData?.categories.length ?? 0) > 0

  // Similar projects: landscape has > 1 project in any category
  const similarProjects = (landscapeData?.categories.some((c) => c.projectRepos.length > 1)) ?? false

  // Business/product separation: too complex to automate — mark as false
  const businessSeparation = false

  return {
    lfxInsights: false, // always manual
    projectSummary: !!(data.description && data.description.trim().length > 10),
    roadmapContext: data.hasRoadmapFile,
    specOrStandard,
    businessSeparation,
    cloudNativeIntegration,
    cloudNativeOverlap,
    similarProjects,
    tagReview,
  }
}

function getTier(track1Score: number): CandidacyTier {
  if (track1Score >= 7) return 'strong'
  if (track1Score >= 4) return 'needs-work'
  return 'not-ready'
}

// Order matches Track 1 criterion list in the issue spec
const TRACK1_GAP_CATALOG_KEYS: Array<{ field: keyof CandidacyTrack1; catalogKey: string }> = [
  { field: 'license', catalogKey: 'file:license' },
  { field: 'contributing', catalogKey: 'file:contributing' },
  { field: 'codeOfConduct', catalogKey: 'file:code_of_conduct' },
  { field: 'maintainers', catalogKey: 'no_maintainers' },
  { field: 'security', catalogKey: 'file:security' },
  { field: 'roadmap', catalogKey: 'file:roadmap' },
  { field: 'website', catalogKey: 'file:website' },
  { field: 'adopters', catalogKey: 'file:adopters' },
  { field: 'landscape', catalogKey: 'cncf:landscape' },
]

function getTopGaps(track1: CandidacyTrack1): CandidacyGap[] {
  const gaps: CandidacyGap[] = []
  for (const { field, catalogKey } of TRACK1_GAP_CATALOG_KEYS) {
    if (!track1[field]) {
      const entry = getCatalogEntryByKey(catalogKey)
      if (entry) {
        gaps.push({ catalogId: entry.id, title: entry.title })
      }
    }
    if (gaps.length === 3) break
  }
  return gaps
}

function extractReadmeFirstParagraph(content: string | null): string | null {
  if (!content) return null
  const lines = content.split('\n')
  const para: string[] = []
  let inParagraph = false
  for (const line of lines) {
    const trimmed = line.trim()
    if (!inParagraph) {
      if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('!') && !trimmed.startsWith('<')) {
        inParagraph = true
        para.push(trimmed)
      }
    } else {
      if (!trimmed) break
      para.push(trimmed)
    }
  }
  const result = para.join(' ').slice(0, 500)
  return result || null
}

export function scoreCandidacyRepo(
  repo: string,
  stars: number,
  rawData: CandidacyRawData,
  landscapeData: CNCFLandscapeData | null,
): CandidacyRepoResult {
  const landscapeStatus: LandscapeProjectStatus = landscapeData
    ? getLandscapeProjectStatus(repo, landscapeData)
    : null

  const track1 = scoreTrack1(repo, rawData, landscapeData)
  const track2 = scoreTrack2(rawData, landscapeData)

  const track1Score = Object.values(track1).filter(Boolean).length
  const track2Score = Object.values(track2).filter(Boolean).length

  const tier = getTier(track1Score)
  const topGaps = getTopGaps(track1)
  const readmeFirstParagraph = extractReadmeFirstParagraph(rawData.readmeContent)

  return {
    repo,
    stars,
    landscapeStatus,
    track1Score,
    track1,
    track2Score,
    track2,
    tier,
    topGaps,
    readmeFirstParagraph,
  }
}

