import { describe, expect, it } from 'vitest'
import {
  STALE_ADMIN_ALLOWED_THRESHOLDS_DAYS,
  STALE_ADMIN_THRESHOLD_DAYS,
  isValidStaleAdminThreshold,
} from './governance'

describe('governance config — stale admin threshold', () => {
  it('defaults the stale-admin threshold to 90 days', () => {
    expect(STALE_ADMIN_THRESHOLD_DAYS).toBe(90)
  })

  it('constrains the allowed threshold set to the 30/60/90/180/365 windows', () => {
    expect([...STALE_ADMIN_ALLOWED_THRESHOLDS_DAYS]).toEqual([30, 60, 90, 180, 365])
  })

  it.each([30, 60, 90, 180, 365])('accepts %i as a valid threshold', (n) => {
    expect(isValidStaleAdminThreshold(n)).toBe(true)
  })

  it.each([0, -1, 1, 45, 77, 120, 365.5, Infinity, NaN])(
    'rejects %s as an invalid threshold',
    (n) => {
      expect(isValidStaleAdminThreshold(n)).toBe(false)
    },
  )

  it.each(['90', null, undefined, {}, [], true, false])(
    'rejects non-number input %s as invalid',
    (value) => {
      expect(isValidStaleAdminThreshold(value)).toBe(false)
    },
  )
})
