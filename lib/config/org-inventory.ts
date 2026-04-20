export const ORG_INVENTORY_CONFIG = {
  defaultPageSize: 10,
  pageSizeOptions: [10, 25, 50, 100],
} as const

export function clampOrgInventoryPageSize(requested: number) {
  if (ORG_INVENTORY_CONFIG.pageSizeOptions.includes(requested as (typeof ORG_INVENTORY_CONFIG.pageSizeOptions)[number])) {
    return requested as (typeof ORG_INVENTORY_CONFIG.pageSizeOptions)[number]
  }

  return ORG_INVENTORY_CONFIG.defaultPageSize
}
