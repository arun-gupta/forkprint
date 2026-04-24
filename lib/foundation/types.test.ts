import { describe, it, expect } from 'vitest'
import { FOUNDATION_REGISTRY } from './types'

describe('FOUNDATION_REGISTRY', () => {
  it('has exactly 4 entries', () => {
    expect(FOUNDATION_REGISTRY).toHaveLength(4)
  })

  it('has only cncf-sandbox as active', () => {
    const active = FOUNDATION_REGISTRY.filter((f) => f.active)
    expect(active).toHaveLength(1)
    expect(active[0].target).toBe('cncf-sandbox')
  })

  it('lists targets in spec order', () => {
    expect(FOUNDATION_REGISTRY.map((f) => f.target)).toEqual([
      'cncf-sandbox',
      'cncf-incubating',
      'cncf-graduation',
      'apache-incubator',
    ])
  })

  it('all entries have non-empty labels', () => {
    for (const entry of FOUNDATION_REGISTRY) {
      expect(entry.label).toBeTruthy()
    }
  })

  it('inactive entries have active: false', () => {
    const inactive = FOUNDATION_REGISTRY.filter((f) => !f.active)
    expect(inactive).toHaveLength(3)
    for (const entry of inactive) {
      expect(entry.active).toBe(false)
    }
  })
})
