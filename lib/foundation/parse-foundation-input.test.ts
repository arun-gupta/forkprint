import { describe, it, expect } from 'vitest'
import { parseFoundationInput } from './parse-foundation-input'

describe('parseFoundationInput — repos path', () => {
  it('detects a single owner/repo slug', () => {
    expect(parseFoundationInput('owner/repo')).toEqual({ kind: 'repos', repos: ['owner/repo'] })
  })

  it('detects multiple slugs separated by newlines', () => {
    expect(parseFoundationInput('owner/repo\nother/project')).toEqual({
      kind: 'repos',
      repos: ['owner/repo', 'other/project'],
    })
  })

  it('detects multiple slugs separated by commas', () => {
    expect(parseFoundationInput('owner/repo, other/project')).toEqual({
      kind: 'repos',
      repos: ['owner/repo', 'other/project'],
    })
  })

  it('detects multiple slugs separated by spaces', () => {
    expect(parseFoundationInput('owner/repo other/project')).toEqual({
      kind: 'repos',
      repos: ['owner/repo', 'other/project'],
    })
  })

  it('detects a full https://github.com/owner/repo URL', () => {
    expect(parseFoundationInput('https://github.com/owner/repo')).toEqual({
      kind: 'repos',
      repos: ['owner/repo'],
    })
  })

  it('detects multiple repos as a mix of slugs and URLs', () => {
    expect(parseFoundationInput('owner/repo\nhttps://github.com/other/project')).toEqual({
      kind: 'repos',
      repos: ['owner/repo', 'other/project'],
    })
  })
})

describe('parseFoundationInput — org path', () => {
  it('detects a bare org slug (no slash)', () => {
    expect(parseFoundationInput('cncf')).toEqual({ kind: 'org', org: 'cncf' })
  })

  it('detects github.com/org', () => {
    expect(parseFoundationInput('github.com/cncf')).toEqual({ kind: 'org', org: 'cncf' })
  })

  it('detects https://github.com/org', () => {
    expect(parseFoundationInput('https://github.com/cncf')).toEqual({ kind: 'org', org: 'cncf' })
  })

  it('detects http://github.com/org', () => {
    expect(parseFoundationInput('http://github.com/cncf')).toEqual({ kind: 'org', org: 'cncf' })
  })
})

describe('parseFoundationInput — projects-board path', () => {
  it('detects https://github.com/orgs/org/projects/N', () => {
    expect(parseFoundationInput('https://github.com/orgs/cncf/projects/14')).toEqual({
      kind: 'projects-board',
      url: 'https://github.com/orgs/cncf/projects/14',
    })
  })

  it('detects github.com/orgs/org/projects/N without protocol', () => {
    expect(parseFoundationInput('github.com/orgs/cncf/projects/14')).toEqual({
      kind: 'projects-board',
      url: 'github.com/orgs/cncf/projects/14',
    })
  })
})

describe('parseFoundationInput — invalid path', () => {
  it('returns invalid for empty string', () => {
    const result = parseFoundationInput('')
    expect(result.kind).toBe('invalid')
    if (result.kind === 'invalid') expect(result.error).toBeTruthy()
  })

  it('returns invalid for whitespace-only string', () => {
    const result = parseFoundationInput('   ')
    expect(result.kind).toBe('invalid')
  })

  it('returns invalid for an unrecognised pattern', () => {
    const result = parseFoundationInput('not-a-valid-input!!!')
    expect(result.kind).toBe('invalid')
    if (result.kind === 'invalid') expect(result.error).toBeTruthy()
  })
})
