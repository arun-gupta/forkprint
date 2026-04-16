export const ORG_INVENTORY_CONFIG = {
  defaultBulkSelectionLimit: 5,
  maxBulkSelectionLimit: 5,
  defaultPageSize: 25,
  pageSizeOptions: [10, 25, 50, 100],
} as const

export function clampBulkSelectionLimit(requested: number) {
  const safeRequested = Number.isFinite(requested) ? Math.trunc(requested) : ORG_INVENTORY_CONFIG.defaultBulkSelectionLimit
  return Math.min(Math.max(safeRequested, 1), ORG_INVENTORY_CONFIG.maxBulkSelectionLimit)
}

export function clampOrgInventoryPageSize(requested: number) {
  if (ORG_INVENTORY_CONFIG.pageSizeOptions.includes(requested as (typeof ORG_INVENTORY_CONFIG.pageSizeOptions)[number])) {
    return requested as (typeof ORG_INVENTORY_CONFIG.pageSizeOptions)[number]
  }

  return ORG_INVENTORY_CONFIG.defaultPageSize
}
