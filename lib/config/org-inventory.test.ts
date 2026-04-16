import { describe, expect, it } from 'vitest'
import { clampBulkSelectionLimit, clampOrgInventoryPageSize, ORG_INVENTORY_CONFIG } from './org-inventory'

describe('org-inventory config', () => {
  it('exposes the Phase 1 default and max bulk-selection limits', () => {
    expect(ORG_INVENTORY_CONFIG.defaultBulkSelectionLimit).toBe(5)
    expect(ORG_INVENTORY_CONFIG.maxBulkSelectionLimit).toBe(5)
    expect(ORG_INVENTORY_CONFIG.defaultPageSize).toBe(25)
    expect(ORG_INVENTORY_CONFIG.pageSizeOptions).toEqual([10, 25, 50, 100])
  })

  it('clamps requested slider values to the configured range', () => {
    expect(clampBulkSelectionLimit(0)).toBe(1)
    expect(clampBulkSelectionLimit(3)).toBe(3)
    expect(clampBulkSelectionLimit(10)).toBe(5)
  })

  it('clamps page-size values to the configured options', () => {
    expect(clampOrgInventoryPageSize(25)).toBe(25)
    expect(clampOrgInventoryPageSize(50)).toBe(50)
    expect(clampOrgInventoryPageSize(10)).toBe(10)
    expect(clampOrgInventoryPageSize(15)).toBe(25)
  })
})
