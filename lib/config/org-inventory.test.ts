import { describe, expect, it } from 'vitest'
import { clampOrgInventoryPageSize, ORG_INVENTORY_CONFIG } from './org-inventory'

describe('org-inventory config', () => {
  it('exposes the Phase 1 page-size defaults and options', () => {
    expect(ORG_INVENTORY_CONFIG.defaultPageSize).toBe(10)
    expect(ORG_INVENTORY_CONFIG.pageSizeOptions).toEqual([10, 25, 50, 100])
  })

  it('clamps page-size values to the configured options', () => {
    expect(clampOrgInventoryPageSize(25)).toBe(25)
    expect(clampOrgInventoryPageSize(50)).toBe(50)
    expect(clampOrgInventoryPageSize(10)).toBe(10)
    expect(clampOrgInventoryPageSize(15)).toBe(10)
  })
})
