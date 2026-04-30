import { describe, expect, it } from 'vitest'
import { applyDateFilter, applyNumericFilter, parseOrgInventorySearchQuery } from './search-parser'

describe('parseOrgInventorySearchQuery', () => {
  it('returns empty/null fields for an empty query', () => {
    const result = parseOrgInventorySearchQuery('')
    expect(result.freeText).toBe('')
    expect(result.lang).toBeNull()
    expect(result.archived).toBeNull()
    expect(result.fork).toBeNull()
    expect(result.stars).toBeNull()
    expect(result.forks).toBeNull()
    expect(result.watchers).toBeNull()
    expect(result.issues).toBeNull()
    expect(result.pushed).toBeNull()
  })

  it('passes plain text through as freeText', () => {
    expect(parseOrgInventorySearchQuery('react hooks').freeText).toBe('react hooks')
  })

  it('extracts lang: prefix and removes it from freeText', () => {
    const result = parseOrgInventorySearchQuery('lang:go')
    expect(result.lang).toBe('go')
    expect(result.freeText).toBe('')
  })

  it('extracts lang: prefix alongside free text', () => {
    const result = parseOrgInventorySearchQuery('kubernetes lang:go')
    expect(result.lang).toBe('go')
    expect(result.freeText).toBe('kubernetes')
  })

  it('extracts archived:true and archived:false', () => {
    expect(parseOrgInventorySearchQuery('archived:true').archived).toBe(true)
    expect(parseOrgInventorySearchQuery('archived:false').archived).toBe(false)
    expect(parseOrgInventorySearchQuery('archived:invalid').archived).toBeNull()
  })

  it('extracts fork:true and fork:false', () => {
    expect(parseOrgInventorySearchQuery('fork:true').fork).toBe(true)
    expect(parseOrgInventorySearchQuery('fork:false').fork).toBe(false)
  })

  it('extracts stars: with > operator', () => {
    const result = parseOrgInventorySearchQuery('stars:>1000')
    expect(result.stars).toEqual({ op: '>', value: 1000 })
  })

  it('extracts stars: with >= operator', () => {
    const result = parseOrgInventorySearchQuery('stars:>=500')
    expect(result.stars).toEqual({ op: '>=', value: 500 })
  })

  it('extracts stars: with < operator', () => {
    const result = parseOrgInventorySearchQuery('stars:<100')
    expect(result.stars).toEqual({ op: '<', value: 100 })
  })

  it('extracts stars: with <= operator', () => {
    const result = parseOrgInventorySearchQuery('stars:<=50')
    expect(result.stars).toEqual({ op: '<=', value: 50 })
  })

  it('extracts forks: prefix', () => {
    expect(parseOrgInventorySearchQuery('forks:>50').forks).toEqual({ op: '>', value: 50 })
  })

  it('extracts watchers: prefix', () => {
    expect(parseOrgInventorySearchQuery('watchers:>100').watchers).toEqual({ op: '>', value: 100 })
  })

  it('extracts issues: prefix', () => {
    expect(parseOrgInventorySearchQuery('issues:>20').issues).toEqual({ op: '>', value: 20 })
  })

  it('extracts pushed: prefix with a date value', () => {
    const result = parseOrgInventorySearchQuery('pushed:>2024-01-01')
    expect(result.pushed).toEqual({ op: '>', value: '2024-01-01' })
  })

  it('ignores pushed: with an invalid date', () => {
    expect(parseOrgInventorySearchQuery('pushed:>not-a-date').pushed).toBeNull()
  })

  it('ignores stars: with a non-numeric value', () => {
    expect(parseOrgInventorySearchQuery('stars:>abc').stars).toBeNull()
  })

  it('composes multiple prefixes and leaves remaining text as freeText', () => {
    const result = parseOrgInventorySearchQuery('lang:go archived:false stars:>100 kubernetes')
    expect(result.lang).toBe('go')
    expect(result.archived).toBe(false)
    expect(result.stars).toEqual({ op: '>', value: 100 })
    expect(result.freeText).toBe('kubernetes')
  })

  it('is case-insensitive for prefix names', () => {
    expect(parseOrgInventorySearchQuery('LANG:Go').lang).toBe('Go')
    expect(parseOrgInventorySearchQuery('Archived:True').archived).toBe(true)
  })
})

describe('applyNumericFilter', () => {
  it('returns false for unavailable values', () => {
    expect(applyNumericFilter('unavailable', { op: '>', value: 0 })).toBe(false)
  })

  it('applies > correctly', () => {
    expect(applyNumericFilter(100, { op: '>', value: 50 })).toBe(true)
    expect(applyNumericFilter(50, { op: '>', value: 50 })).toBe(false)
  })

  it('applies >= correctly', () => {
    expect(applyNumericFilter(50, { op: '>=', value: 50 })).toBe(true)
    expect(applyNumericFilter(49, { op: '>=', value: 50 })).toBe(false)
  })

  it('applies < correctly', () => {
    expect(applyNumericFilter(49, { op: '<', value: 50 })).toBe(true)
    expect(applyNumericFilter(50, { op: '<', value: 50 })).toBe(false)
  })

  it('applies <= correctly', () => {
    expect(applyNumericFilter(50, { op: '<=', value: 50 })).toBe(true)
    expect(applyNumericFilter(51, { op: '<=', value: 50 })).toBe(false)
  })
})

describe('applyDateFilter', () => {
  it('returns false for unavailable values', () => {
    expect(applyDateFilter('unavailable', { op: '>', value: '2024-01-01' })).toBe(false)
  })

  it('applies > correctly', () => {
    expect(applyDateFilter('2025-01-01T00:00:00Z', { op: '>', value: '2024-01-01' })).toBe(true)
    expect(applyDateFilter('2023-01-01T00:00:00Z', { op: '>', value: '2024-01-01' })).toBe(false)
  })

  it('applies < correctly', () => {
    expect(applyDateFilter('2023-01-01T00:00:00Z', { op: '<', value: '2024-01-01' })).toBe(true)
    expect(applyDateFilter('2025-01-01T00:00:00Z', { op: '<', value: '2024-01-01' })).toBe(false)
  })
})
