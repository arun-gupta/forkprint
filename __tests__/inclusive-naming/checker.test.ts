import { describe, expect, it } from 'vitest'
import { checkBranchName, checkDescription, checkTopics, extractInclusiveNamingResult } from '@/lib/inclusive-naming/checker'

describe('checkBranchName', () => {
  it('flags "master" as failing', () => {
    const result = checkBranchName('master')
    expect(result.passed).toBe(false)
    expect(result.tier).toBe(1)
    expect(result.severity).toBe('Replace immediately')
    expect(result.replacements).toContain('main')
    expect(result.checkType).toBe('branch')
  })

  it('passes "main"', () => {
    const result = checkBranchName('main')
    expect(result.passed).toBe(true)
    expect(result.tier).toBeNull()
  })

  it('passes "develop"', () => {
    const result = checkBranchName('develop')
    expect(result.passed).toBe(true)
  })

  it('passes "trunk"', () => {
    const result = checkBranchName('trunk')
    expect(result.passed).toBe(true)
  })

  it('handles null branch name (empty repo)', () => {
    const result = checkBranchName(null)
    expect(result.passed).toBe(true)
    expect(result.tier).toBeNull()
    expect(result.checkType).toBe('branch')
  })
})

describe('checkDescription', () => {
  it('flags Tier 1 term "whitelist"', () => {
    const results = checkDescription('This tool manages a whitelist of IPs')
    const match = results.find((r) => r.term === 'whitelist')
    expect(match).toBeDefined()
    expect(match!.tier).toBe(1)
    expect(match!.severity).toBe('Replace immediately')
    expect(match!.replacements).toContain('allowlist')
  })

  it('flags Tier 2 term "sanity-check"', () => {
    const results = checkDescription('Run a sanity-check before deploying')
    const match = results.find((r) => r.term === 'sanity-check')
    expect(match).toBeDefined()
    expect(match!.tier).toBe(2)
    expect(match!.severity).toBe('Recommended to replace')
  })

  it('flags Tier 3 term "blast-radius"', () => {
    const results = checkDescription('Limit the blast-radius of changes')
    const match = results.find((r) => r.term === 'blast-radius')
    expect(match).toBeDefined()
    expect(match!.tier).toBe(3)
    expect(match!.severity).toBe('Consider replacing')
  })

  it('does NOT flag Tier 0 term "blackbox"', () => {
    const results = checkDescription('A blackbox testing framework')
    expect(results.length).toBe(0)
  })

  it('does NOT flag "mastery" (substring of "master")', () => {
    const results = checkDescription('Achieve mastery in programming')
    expect(results.length).toBe(0)
  })

  it('does NOT flag "mastermind" (Tier 0)', () => {
    const results = checkDescription('The mastermind behind the project')
    expect(results.length).toBe(0)
  })

  it('performs case-insensitive matching', () => {
    const results = checkDescription('WHITELIST of allowed domains')
    expect(results.some((r) => r.term === 'whitelist')).toBe(true)
  })

  it('returns empty array for null description', () => {
    const results = checkDescription(null)
    expect(results).toEqual([])
  })

  it('returns empty array for description with no flagged terms', () => {
    const results = checkDescription('A modern web framework for building APIs')
    expect(results).toEqual([])
  })

  it('flags multiple terms in one description', () => {
    const results = checkDescription('This whitelist and blacklist manager')
    expect(results.length).toBe(2)
    expect(results.some((r) => r.term === 'whitelist')).toBe(true)
    expect(results.some((r) => r.term === 'blacklist')).toBe(true)
  })
})

describe('checkTopics', () => {
  it('flags "master-slave" topic', () => {
    const results = checkTopics(['master-slave', 'database'])
    expect(results.length).toBe(1)
    expect(results[0].term).toBe('master-slave')
    expect(results[0].tier).toBe(1)
    expect(results[0].checkType).toBe('topic')
  })

  it('does NOT flag "machine-learning"', () => {
    const results = checkTopics(['machine-learning', 'python'])
    expect(results.length).toBe(0)
  })

  it('does NOT flag legitimate topics', () => {
    const results = checkTopics(['react', 'typescript', 'api', 'testing'])
    expect(results.length).toBe(0)
  })

  it('flags "whitelist" topic', () => {
    const results = checkTopics(['whitelist'])
    expect(results.length).toBe(1)
    expect(results[0].term).toBe('whitelist')
  })

  it('returns empty for empty topics array', () => {
    const results = checkTopics([])
    expect(results).toEqual([])
  })
})

describe('extractInclusiveNamingResult', () => {
  it('combines branch and metadata checks', () => {
    const result = extractInclusiveNamingResult('master', 'A whitelist manager', ['database'])
    expect(result.defaultBranchName).toBe('master')
    expect(result.branchCheck.passed).toBe(false)
    expect(result.metadataChecks.length).toBe(1)
    expect(result.metadataChecks[0].term).toBe('whitelist')
  })

  it('returns all passing for clean repo', () => {
    const result = extractInclusiveNamingResult('main', 'A modern web framework', ['typescript'])
    expect(result.branchCheck.passed).toBe(true)
    expect(result.metadataChecks.length).toBe(0)
  })

  it('handles null branch and null description', () => {
    const result = extractInclusiveNamingResult(null, null, [])
    expect(result.defaultBranchName).toBeNull()
    expect(result.branchCheck.passed).toBe(true)
    expect(result.metadataChecks.length).toBe(0)
  })
})
