import { describe, expect, it } from 'vitest'
import { PANEL_BUCKETS } from './registry'

describe('PANEL_BUCKETS — Governance bucket (#303)', () => {
  it('contains a governance bucket', () => {
    const ids = PANEL_BUCKETS.map((b) => b.id)
    expect(ids).toContain('governance')
  })

  it('positions governance immediately after documentation and before security', () => {
    const ids = PANEL_BUCKETS.map((b) => b.id)
    const docIdx = ids.indexOf('documentation')
    const govIdx = ids.indexOf('governance')
    const secIdx = ids.indexOf('security')
    expect(govIdx).toBe(docIdx + 1)
    expect(secIdx).toBe(govIdx + 1)
  })

  it('renders governance with the risk-first registry-driven panel order', () => {
    const gov = PANEL_BUCKETS.find((b) => b.id === 'governance')!
    expect(gov.label).toBe('Governance')
    // Panel order top-to-bottom (registry-driven, excluding the StaleAdminsPanel
    // extra-panel injection which is handled in OrgBucketContent):
    //   1. maintainers
    //   2. governance (file presence)
    //   3. license-consistency
    expect(gov.panels).toEqual(['maintainers', 'governance', 'license-consistency'])
  })
})

describe('PANEL_BUCKETS — neighboring buckets after migration (#303)', () => {
  it('removes maintainers from contributors', () => {
    const contributors = PANEL_BUCKETS.find((b) => b.id === 'contributors')!
    expect(contributors.panels).not.toContain('maintainers')
    expect(contributors.panels).toEqual(['contributor-diversity', 'org-affiliations', 'bus-factor'])
  })

  it('removes governance and license-consistency from documentation', () => {
    const docs = PANEL_BUCKETS.find((b) => b.id === 'documentation')!
    expect(docs.panels).not.toContain('governance')
    expect(docs.panels).not.toContain('license-consistency')
    expect(docs.panels).toEqual(['documentation-coverage', 'inclusive-naming-rollup', 'adopters'])
  })

  it('leaves security unchanged', () => {
    const security = PANEL_BUCKETS.find((b) => b.id === 'security')!
    expect(security.panels).toEqual(['security-rollup'])
  })
})

describe('PANEL_BUCKETS — no panel appears in two buckets (#303)', () => {
  it('every panel id is unique across buckets', () => {
    const allPanelIds = PANEL_BUCKETS.flatMap((b) => b.panels)
    const seen = new Set<string>()
    const duplicates: string[] = []
    for (const id of allPanelIds) {
      if (seen.has(id)) duplicates.push(id)
      seen.add(id)
    }
    expect(duplicates).toEqual([])
  })
})
