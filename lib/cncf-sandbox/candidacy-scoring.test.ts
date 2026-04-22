import { describe, it, expect } from 'vitest'
import { scoreCandidacyRepo } from './candidacy-scoring'
import type { CNCFLandscapeData } from './types'

function makeData(overrides: Partial<import('./candidacy-scoring').CandidacyRawData> = {}): import('./candidacy-scoring').CandidacyRawData {
  return {
    spdxId: 'Apache-2.0',
    hasLicenseFile: true,
    hasContributing: true,
    hasCodeOfConduct: true,
    hasMaintainers: true,
    hasSecurity: true,
    hasRoadmapFile: true,
    hasReadmeRoadmapSection: false,
    hasWebsite: true,
    hasAdopters: true,
    description: 'A great cloud-native project',
    topics: ['kubernetes'],
    readmeContent: '# My Project\n\nA cloud-native tool using prometheus and kubernetes.',
    ...overrides,
  }
}

function makeLandscape(
  repoUrls: string[] = [],
  projectStatusMap: Map<string, 'sandbox' | 'incubating' | 'graduated'> = new Map(),
): CNCFLandscapeData {
  return {
    repoUrls: new Set(repoUrls),
    homepageUrls: new Set(),
    fetchedAt: Date.now(),
    categories: [],
    projectStatusMap,
  }
}

describe('T400 — scoreCandidacyRepo', () => {
  describe('Track 1 scoring', () => {
    it('T400-1: all 9 criteria met → track1Score=9, tier=strong', () => {
      const landscape = makeLandscape(['https://github.com/org/repo'])
      const result = scoreCandidacyRepo('org/repo', 100, makeData(), landscape)
      expect(result.track1Score).toBe(9)
      expect(result.tier).toBe('strong')
    })

    it('T400-2: 0 criteria met → track1Score=0, tier=not-ready', () => {
      const result = scoreCandidacyRepo(
        'org/repo',
        0,
        makeData({
          spdxId: null,
          hasLicenseFile: false,
          hasContributing: false,
          hasCodeOfConduct: false,
          hasMaintainers: false,
          hasSecurity: false,
          hasRoadmapFile: false,
          hasReadmeRoadmapSection: false,
          hasWebsite: false,
          hasAdopters: false,
        }),
        null,
      )
      expect(result.track1Score).toBe(0)
      expect(result.tier).toBe('not-ready')
    })

    it('T400-3: license missing SPDX → license criterion false even if file exists', () => {
      const result = scoreCandidacyRepo('org/repo', 0, makeData({ spdxId: null, hasLicenseFile: true }), null)
      expect(result.track1.license).toBe(false)
    })

    it('T400-4: non-CNCF SPDX → license criterion false', () => {
      const result = scoreCandidacyRepo('org/repo', 0, makeData({ spdxId: 'GPL-3.0', hasLicenseFile: true }), null)
      expect(result.track1.license).toBe(false)
    })

    it('T400-5: roadmap via README section, no file → roadmap criterion true', () => {
      const result = scoreCandidacyRepo(
        'org/repo',
        0,
        makeData({ hasRoadmapFile: false, hasReadmeRoadmapSection: true }),
        null,
      )
      expect(result.track1.roadmap).toBe(true)
    })

    it('T400-6: listed in landscape → landscape criterion true', () => {
      const landscape = makeLandscape(['https://github.com/org/repo'])
      const result = scoreCandidacyRepo('org/repo', 0, makeData({ hasWebsite: false, hasAdopters: false }), landscape)
      expect(result.track1.landscape).toBe(true)
      expect(result.landscapeStatus).toBe('landscape')
    })

    it('T400-7: listed as sandbox → landscapeStatus=sandbox, landscape criterion true', () => {
      const landscape = makeLandscape(
        ['https://github.com/org/repo'],
        new Map([['https://github.com/org/repo', 'sandbox']]),
      )
      const result = scoreCandidacyRepo('org/repo', 0, makeData(), landscape)
      expect(result.landscapeStatus).toBe('sandbox')
      expect(result.track1.landscape).toBe(true)
    })
  })

  describe('Tier thresholds', () => {
    it('T400-8: 7/9 → strong', () => {
      // license✅ contributing✅ coc✅ maintainers✅ security✅ roadmap✅ website✅ adopters❌ landscape❌ = 7/9
      const result = scoreCandidacyRepo(
        'org/repo',
        0,
        makeData({ hasAdopters: false }),
        null,
      )
      expect(result.track1Score).toBe(7)
      expect(result.tier).toBe('strong')
    })

    it('T400-9: 4/9 → needs-work', () => {
      // license✅ contributing❌ coc❌ maintainers❌ security❌ roadmap✅ website✅ adopters✅ landscape❌ = 4/9
      const result = scoreCandidacyRepo(
        'org/repo',
        0,
        makeData({
          hasContributing: false,
          hasCodeOfConduct: false,
          hasMaintainers: false,
          hasSecurity: false,
        }),
        null,
      )
      expect(result.track1Score).toBe(4)
      expect(result.tier).toBe('needs-work')
    })

    it('T400-10: 3/9 → not-ready', () => {
      // license✅ contributing❌ coc❌ maintainers❌ security❌ roadmap❌ website✅ adopters✅ landscape❌ = 3/9
      const result = scoreCandidacyRepo(
        'org/repo',
        0,
        makeData({
          hasContributing: false,
          hasCodeOfConduct: false,
          hasMaintainers: false,
          hasSecurity: false,
          hasRoadmapFile: false,
          hasReadmeRoadmapSection: false,
        }),
        null,
      )
      expect(result.track1Score).toBe(3)
      expect(result.tier).toBe('not-ready')
    })
  })

  describe('Top gaps', () => {
    it('T400-11: missing license → DOC-2 in topGaps', () => {
      const result = scoreCandidacyRepo(
        'org/repo',
        0,
        makeData({ spdxId: null, hasLicenseFile: false }),
        null,
      )
      expect(result.topGaps.some((g) => g.catalogId === 'DOC-2')).toBe(true)
    })

    it('T400-12: returns at most 3 gaps', () => {
      const result = scoreCandidacyRepo(
        'org/repo',
        0,
        makeData({
          spdxId: null,
          hasLicenseFile: false,
          hasContributing: false,
          hasCodeOfConduct: false,
          hasMaintainers: false,
        }),
        null,
      )
      expect(result.topGaps.length).toBeLessThanOrEqual(3)
    })

    it('T400-13: no gaps when all criteria met', () => {
      const landscape = makeLandscape(['https://github.com/org/repo'])
      const result = scoreCandidacyRepo('org/repo', 0, makeData(), landscape)
      expect(result.topGaps).toHaveLength(0)
    })
  })

  describe('Track 2 scoring', () => {
    it('T400-14: has description → projectSummary=true', () => {
      const result = scoreCandidacyRepo('org/repo', 0, makeData({ description: 'A great project' }), null)
      expect(result.track2.projectSummary).toBe(true)
    })

    it('T400-15: no description → projectSummary=false', () => {
      const result = scoreCandidacyRepo('org/repo', 0, makeData({ description: null }), null)
      expect(result.track2.projectSummary).toBe(false)
    })

    it('T400-16: README mentions kubernetes → cloudNativeIntegration=true', () => {
      const result = scoreCandidacyRepo(
        'org/repo',
        0,
        makeData({ readmeContent: 'Works with kubernetes clusters' }),
        null,
      )
      expect(result.track2.cloudNativeIntegration).toBe(true)
    })

    it('T400-17: README contains "spec" → specOrStandard=true', () => {
      const result = scoreCandidacyRepo(
        'org/repo',
        0,
        makeData({ readmeContent: 'This implements the OpenAPI spec' }),
        null,
      )
      expect(result.track2.specOrStandard).toBe(true)
    })

    it('T400-18: lfxInsights always false', () => {
      const result = scoreCandidacyRepo('org/repo', 0, makeData(), null)
      expect(result.track2.lfxInsights).toBe(false)
    })
  })

  describe('README first paragraph', () => {
    it('T400-19: extracts first paragraph from README', () => {
      const result = scoreCandidacyRepo(
        'org/repo',
        0,
        makeData({ readmeContent: '# Title\n\nFirst paragraph here.\n\nSecond paragraph.' }),
        null,
      )
      expect(result.readmeFirstParagraph).toBe('First paragraph here.')
    })

    it('T400-20: null README → null first paragraph', () => {
      const result = scoreCandidacyRepo('org/repo', 0, makeData({ readmeContent: null }), null)
      expect(result.readmeFirstParagraph).toBeNull()
    })
  })
})

// ---------------------------------------------------------------------------
// T401 — getLandscapeProjectStatus
// ---------------------------------------------------------------------------

import { getLandscapeProjectStatus } from './landscape'

describe('T401 — getLandscapeProjectStatus', () => {
  const landscapeData: CNCFLandscapeData = {
    repoUrls: new Set([
      'https://github.com/org/sandbox-project',
      'https://github.com/org/incubating-project',
      'https://github.com/org/graduated-project',
      'https://github.com/org/landscape-only',
    ]),
    homepageUrls: new Set(),
    fetchedAt: Date.now(),
    categories: [],
    projectStatusMap: new Map([
      ['https://github.com/org/sandbox-project', 'sandbox'],
      ['https://github.com/org/incubating-project', 'incubating'],
      ['https://github.com/org/graduated-project', 'graduated'],
    ]),
  }

  it('T401-1: sandbox project → returns sandbox', () => {
    expect(getLandscapeProjectStatus('org/sandbox-project', landscapeData)).toBe('sandbox')
  })

  it('T401-2: incubating project → returns incubating', () => {
    expect(getLandscapeProjectStatus('org/incubating-project', landscapeData)).toBe('incubating')
  })

  it('T401-3: graduated project → returns graduated', () => {
    expect(getLandscapeProjectStatus('org/graduated-project', landscapeData)).toBe('graduated')
  })

  it('T401-4: landscape-only (no project field) → returns landscape', () => {
    expect(getLandscapeProjectStatus('org/landscape-only', landscapeData)).toBe('landscape')
  })

  it('T401-5: not in landscape → returns null', () => {
    expect(getLandscapeProjectStatus('org/unknown-project', landscapeData)).toBeNull()
  })

  it('T401-6: case-insensitive matching', () => {
    expect(getLandscapeProjectStatus('Org/Sandbox-Project', landscapeData)).toBe('sandbox')
  })
})
