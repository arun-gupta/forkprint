import { describe, expect, it } from 'vitest'
import { resultTabs } from './tabs'

describe('resultTabs', () => {
  it('contains the expected tab ids', () => {
    const ids = resultTabs.map((t) => t.id)
    expect(ids).toContain('overview')
    expect(ids).toContain('contributors')
    expect(ids).toContain('activity')
    expect(ids).toContain('responsiveness')
    expect(ids).toContain('documentation')
    expect(ids).toContain('security')
    expect(ids).toContain('recommendations')
    expect(ids).toContain('comparison')
  })

  it('has no duplicate ids', () => {
    const ids = resultTabs.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('marks every tab as implemented', () => {
    for (const tab of resultTabs) {
      expect(tab.status).toBe('implemented')
    }
  })

  it('every tab has a non-empty label and description', () => {
    for (const tab of resultTabs) {
      expect(tab.label.trim().length).toBeGreaterThan(0)
      expect(tab.description.trim().length).toBeGreaterThan(0)
    }
  })
})
