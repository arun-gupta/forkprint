import { parseRepos } from '@/lib/parse-repos'
import { normalizeOrgInput } from '@/lib/analyzer/org-inventory'

export type FoundationParseResult =
  | { kind: 'repos';          repos: string[] }
  | { kind: 'org';            org: string }
  | { kind: 'projects-board'; url: string }
  | { kind: 'invalid';        error: string }

const PROJECTS_BOARD_RE = /^(?:https?:\/\/)?github\.com\/orgs\/[^/]+\/projects\/\d+/i
const GITHUB_URL_PREFIX_RE = /^(?:https?:\/\/)?github\.com\//i
const ORG_SLUG_RE = /^[a-zA-Z0-9][a-zA-Z0-9.-]*$/

export function parseFoundationInput(input: string): FoundationParseResult {
  const trimmed = input.trim()

  if (!trimmed) {
    return { kind: 'invalid', error: 'Please enter one or more repo slugs or an org slug.' }
  }

  // Projects board — most specific pattern, check first
  if (PROJECTS_BOARD_RE.test(trimmed)) {
    return { kind: 'projects-board', url: trimmed }
  }

  // GitHub.com URL prefix → try org detection first, then repos
  if (GITHUB_URL_PREFIX_RE.test(trimmed)) {
    const orgResult = normalizeOrgInput(trimmed)
    if (orgResult.valid) return { kind: 'org', org: orgResult.org }

    const reposResult = parseRepos(trimmed)
    if (reposResult.valid) return { kind: 'repos', repos: reposResult.repos }

    return { kind: 'invalid', error: orgResult.error }
  }

  // Non-URL input: try as repo slug(s) first (contains slash → owner/repo)
  const reposResult = parseRepos(trimmed)
  if (reposResult.valid) return { kind: 'repos', repos: reposResult.repos }

  // No slash → try as bare org slug with basic validation
  if (!trimmed.includes('/') && ORG_SLUG_RE.test(trimmed)) {
    return { kind: 'org', org: trimmed }
  }

  return { kind: 'invalid', error: reposResult.error }
}
