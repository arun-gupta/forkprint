import { describe, expect, it } from 'vitest'
import { classifyAdmin, type AdminActivityInput } from './stale-admins'

const NOW = new Date('2026-04-16T00:00:00.000Z')
const NOW_MS = NOW.getTime()
const DAY_MS = 86_400_000

function iso(ms: number): string {
  return new Date(ms).toISOString()
}

describe('classifyAdmin', () => {
  it('marks an admin active when the age is strictly less than the threshold', () => {
    const input: AdminActivityInput = {
      username: 'alice',
      lastActivityAt: iso(NOW_MS - 10 * DAY_MS),
      lastActivitySource: 'public-events',
      error: null,
    }
    const record = classifyAdmin(input, 90, NOW)
    expect(record.classification).toBe('active')
    expect(record.lastActivityAt).toBe(input.lastActivityAt)
    expect(record.lastActivitySource).toBe('public-events')
    expect(record.unavailableReason).toBeNull()
  })

  it('treats the exact threshold boundary as active (boundary-inclusive in favor of active)', () => {
    const input: AdminActivityInput = {
      username: 'boundary',
      lastActivityAt: iso(NOW_MS - 90 * DAY_MS),
      lastActivitySource: 'public-events',
      error: null,
    }
    expect(classifyAdmin(input, 90, NOW).classification).toBe('active')
  })

  it('marks an admin stale when strictly older than the threshold', () => {
    const input: AdminActivityInput = {
      username: 'bob',
      lastActivityAt: iso(NOW_MS - 120 * DAY_MS),
      lastActivitySource: 'public-events',
      error: null,
    }
    const record = classifyAdmin(input, 90, NOW)
    expect(record.classification).toBe('stale')
    expect(record.lastActivityAt).toBe(input.lastActivityAt)
    expect(record.lastActivitySource).toBe('public-events')
  })

  it('uses the org-commit-search source when reported as such', () => {
    const input: AdminActivityInput = {
      username: 'carol',
      lastActivityAt: iso(NOW_MS - 200 * DAY_MS),
      lastActivitySource: 'org-commit-search',
      error: null,
    }
    const record = classifyAdmin(input, 90, NOW)
    expect(record.classification).toBe('stale')
    expect(record.lastActivitySource).toBe('org-commit-search')
  })

  it('classifies as no-public-activity when both sources are empty and there is no error', () => {
    const input: AdminActivityInput = {
      username: 'dave',
      lastActivityAt: null,
      lastActivitySource: null,
      error: null,
    }
    const record = classifyAdmin(input, 90, NOW)
    expect(record.classification).toBe('no-public-activity')
    expect(record.lastActivityAt).toBeNull()
    expect(record.lastActivitySource).toBeNull()
    expect(record.unavailableReason).toBeNull()
  })

  it('classifies as unavailable when error is set, even if a timestamp is also present (error wins)', () => {
    const input: AdminActivityInput = {
      username: 'eve',
      lastActivityAt: iso(NOW_MS - 10 * DAY_MS),
      lastActivitySource: 'public-events',
      error: 'rate-limited',
    }
    const record = classifyAdmin(input, 90, NOW)
    expect(record.classification).toBe('unavailable')
    expect(record.lastActivityAt).toBeNull()
    expect(record.lastActivitySource).toBeNull()
    expect(record.unavailableReason).toBe('rate-limited')
  })

  it('propagates admin-account-404 as unavailable', () => {
    const input: AdminActivityInput = {
      username: 'ghost',
      lastActivityAt: null,
      lastActivitySource: null,
      error: 'admin-account-404',
    }
    const record = classifyAdmin(input, 90, NOW)
    expect(record.classification).toBe('unavailable')
    expect(record.unavailableReason).toBe('admin-account-404')
  })

  it('preserves the username verbatim (no casing or suffix changes)', () => {
    const input: AdminActivityInput = {
      username: 'Dependabot[bot]',
      lastActivityAt: iso(NOW_MS - 1 * DAY_MS),
      lastActivitySource: 'public-events',
      error: null,
    }
    expect(classifyAdmin(input, 90, NOW).username).toBe('Dependabot[bot]')
  })

  it('enforces invariant: lastActivityAt is null iff classification is no-public-activity or unavailable', () => {
    const cases: AdminActivityInput[] = [
      {
        username: 'a',
        lastActivityAt: iso(NOW_MS - DAY_MS),
        lastActivitySource: 'public-events',
        error: null,
      },
      {
        username: 'b',
        lastActivityAt: iso(NOW_MS - 200 * DAY_MS),
        lastActivitySource: 'org-commit-search',
        error: null,
      },
      { username: 'c', lastActivityAt: null, lastActivitySource: null, error: null },
      { username: 'd', lastActivityAt: null, lastActivitySource: null, error: 'rate-limited' },
    ]
    for (const input of cases) {
      const r = classifyAdmin(input, 90, NOW)
      const terminal = r.classification === 'no-public-activity' || r.classification === 'unavailable'
      if (terminal) {
        expect(r.lastActivityAt).toBeNull()
        expect(r.lastActivitySource).toBeNull()
      } else {
        expect(r.lastActivityAt).not.toBeNull()
        expect(r.lastActivitySource).not.toBeNull()
      }
    }
  })

  it.each([30, 60, 90, 180, 365] as const)('respects the configured threshold window of %i days', (threshold) => {
    const justInside: AdminActivityInput = {
      username: 'inside',
      lastActivityAt: iso(NOW_MS - (threshold - 1) * DAY_MS),
      lastActivitySource: 'public-events',
      error: null,
    }
    const justOutside: AdminActivityInput = {
      username: 'outside',
      lastActivityAt: iso(NOW_MS - (threshold + 1) * DAY_MS),
      lastActivitySource: 'public-events',
      error: null,
    }
    expect(classifyAdmin(justInside, threshold, NOW).classification).toBe('active')
    expect(classifyAdmin(justOutside, threshold, NOW).classification).toBe('stale')
  })
})
