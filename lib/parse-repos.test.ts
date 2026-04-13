import { describe, it, expect } from 'vitest'
import { parseRepos } from './parse-repos'

describe('parseRepos — valid input (US1)', () => {
  it('parses a single slug on one line', () => {
    const result = parseRepos('facebook/react')
    expect(result).toEqual({ valid: true, repos: ['facebook/react'] })
  })

  it('parses multiple slugs on separate lines', () => {
    const result = parseRepos('facebook/react\ntorvalds/linux\nmicrosoft/typescript')
    expect(result).toEqual({
      valid: true,
      repos: ['facebook/react', 'torvalds/linux', 'microsoft/typescript'],
    })
  })

  it('parses comma-separated slugs on one line', () => {
    const result = parseRepos('facebook/react, torvalds/linux')
    expect(result).toEqual({ valid: true, repos: ['facebook/react', 'torvalds/linux'] })
  })

  it('parses space-separated slugs on one line', () => {
    const result = parseRepos('facebook/react torvalds/linux')
    expect(result).toEqual({ valid: true, repos: ['facebook/react', 'torvalds/linux'] })
  })

  it('extracts slug from a GitHub URL', () => {
    const result = parseRepos('https://github.com/facebook/react')
    expect(result).toEqual({ valid: true, repos: ['facebook/react'] })
  })

  it('handles mixed: slugs, URLs, and comma-separated', () => {
    const result = parseRepos('torvalds/linux\nhttps://github.com/facebook/react, microsoft/typescript')
    expect(result).toEqual({
      valid: true,
      repos: ['torvalds/linux', 'facebook/react', 'microsoft/typescript'],
    })
  })

  it('handles mixed whitespace, commas, newlines, and URLs', () => {
    const result = parseRepos('torvalds/linux https://github.com/facebook/react,\nmicrosoft/typescript')
    expect(result).toEqual({
      valid: true,
      repos: ['torvalds/linux', 'facebook/react', 'microsoft/typescript'],
    })
  })

  it('trims whitespace from slugs', () => {
    const result = parseRepos('  facebook/react  ')
    expect(result).toEqual({ valid: true, repos: ['facebook/react'] })
  })

  it('ignores blank lines', () => {
    const result = parseRepos('facebook/react\n\n   \ntorvalds/linux')
    expect(result).toEqual({ valid: true, repos: ['facebook/react', 'torvalds/linux'] })
  })

  it('deduplicates slugs (case-sensitive, preserves first occurrence)', () => {
    const result = parseRepos('facebook/react\nfacebook/react\nFacebook/React')
    expect(result).toEqual({ valid: true, repos: ['facebook/react', 'Facebook/React'] })
  })

  it('deduplicates when one is a URL and one is a slug', () => {
    const result = parseRepos('facebook/react\nhttps://github.com/facebook/react')
    expect(result).toEqual({ valid: true, repos: ['facebook/react'] })
  })

  it('extracts slug from a GitHub URL with .git suffix', () => {
    const result = parseRepos('https://github.com/facebook/react.git')
    expect(result).toEqual({ valid: true, repos: ['facebook/react'] })
  })

  it('extracts slug from a GitHub URL with .git suffix and trailing slash', () => {
    const result = parseRepos('https://github.com/facebook/react.git/')
    expect(result).toEqual({ valid: true, repos: ['facebook/react'] })
  })
})

describe('parseRepos — invalid input (US2)', () => {
  it('returns error for empty input', () => {
    const result = parseRepos('')
    expect(result.valid).toBe(false)
  })

  it('returns error for whitespace-only input', () => {
    const result = parseRepos('   \n  ')
    expect(result.valid).toBe(false)
  })

  it('returns error for slug with no owner (e.g. "react")', () => {
    const result = parseRepos('react')
    expect(result.valid).toBe(false)
  })

  it('returns error for slug with no repo name (e.g. "facebook/")', () => {
    const result = parseRepos('facebook/')
    expect(result.valid).toBe(false)
  })

  it('returns error for slug with no owner (e.g. "/react")', () => {
    const result = parseRepos('/react')
    expect(result.valid).toBe(false)
  })

  it('returns error when mix contains an invalid slug', () => {
    const result = parseRepos('facebook/react\nreact')
    expect(result.valid).toBe(false)
  })

  it('returns error for GitHub URL with missing repo segment', () => {
    const result = parseRepos('https://github.com/facebook')
    expect(result.valid).toBe(false)
  })
})
