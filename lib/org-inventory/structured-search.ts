import type { OrgRepoSummary } from '@/lib/analyzer/org-inventory'

export type StructuredSearchKey =
  | 'company'
  | 'lang'
  | 'archived'
  | 'stars'
  | 'forks'
  | 'watchers'
  | 'issues'
  | 'pushed'
  | 'fork'
  | 'topic'
  | 'size'
  | 'visibility'
  | 'license'

export interface StructuredSearchToken {
  key: StructuredSearchKey
  raw: string
}

export interface StructuredSearchParseResult {
  freeTextTerms: string[]
  tokens: StructuredSearchToken[]
  invalidTokens: string[]
  hasArchivedToken: boolean
  hasForkToken: boolean
}

type Comparator = 'eq' | 'gt' | 'gte' | 'lt' | 'lte'

const NUMERIC_KEYS = new Set<StructuredSearchKey>(['stars', 'forks', 'watchers', 'issues', 'size'])
const BOOLEAN_KEYS = new Set<StructuredSearchKey>(['archived', 'fork'])
const TEXT_KEYS = new Set<StructuredSearchKey>(['company', 'lang', 'topic', 'visibility', 'license'])

export function parseStructuredSearchQuery(query: string): StructuredSearchParseResult {
  const parts = query.trim().split(/\s+/).filter(Boolean)
  const freeTextTerms: string[] = []
  const tokens: StructuredSearchToken[] = []
  const invalidTokens: string[] = []
  let hasArchivedToken = false
  let hasForkToken = false

  for (const part of parts) {
    const match = part.match(/^([a-z]+):(.*)$/i)
    if (!match) {
      freeTextTerms.push(part.toLowerCase())
      continue
    }

    const key = match[1].toLowerCase() as StructuredSearchKey
    const value = match[2].trim()

    if (!value || !isSupportedKey(key)) {
      invalidTokens.push(part)
      continue
    }

    if (BOOLEAN_KEYS.has(key) && parseBooleanValue(value) == null) {
      invalidTokens.push(part)
      continue
    }

    if (NUMERIC_KEYS.has(key) && parseNumericCondition(value) == null) {
      invalidTokens.push(part)
      continue
    }

    if (key === 'pushed' && parseDateCondition(value) == null) {
      invalidTokens.push(part)
      continue
    }

    if (key === 'visibility' && !['public', 'private', 'internal'].includes(value.toLowerCase())) {
      invalidTokens.push(part)
      continue
    }

    tokens.push({ key, raw: value })
    if (key === 'archived') hasArchivedToken = true
    if (key === 'fork') hasForkToken = true
  }

  return { freeTextTerms, tokens, invalidTokens, hasArchivedToken, hasForkToken }
}

export function matchesStructuredSearch(row: OrgRepoSummary, parsed: StructuredSearchParseResult): boolean {
  const searchableText = `${row.repo} ${row.name}`.toLowerCase()

  if (parsed.freeTextTerms.some((term) => !searchableText.includes(term))) {
    return false
  }

  for (const token of parsed.tokens) {
    if (!matchesToken(row, token)) {
      return false
    }
  }

  return true
}

function matchesToken(row: OrgRepoSummary, token: StructuredSearchToken): boolean {
  switch (token.key) {
    case 'company':
      return row.repo.split('/')[0]?.toLowerCase() === token.raw.toLowerCase()
    case 'lang':
      return row.primaryLanguage !== 'unavailable' && row.primaryLanguage.toLowerCase() === token.raw.toLowerCase()
    case 'archived':
      return row.archived === parseBooleanValue(token.raw)
    case 'fork':
      return row.isFork === parseBooleanValue(token.raw)
    case 'topic':
      return (row.topics ?? []).some((topic) => topic.toLowerCase() === token.raw.toLowerCase())
    case 'visibility':
      return row.visibility != null && row.visibility !== 'unavailable' && row.visibility.toLowerCase() === token.raw.toLowerCase()
    case 'license':
      if (row.licenseSpdxId != null && row.licenseSpdxId !== 'unavailable' && row.licenseSpdxId.toLowerCase() === token.raw.toLowerCase()) {
        return true
      }
      return row.licenseName != null && row.licenseName !== 'unavailable' && row.licenseName.toLowerCase() === token.raw.toLowerCase()
    case 'stars':
      return matchesNumericValue(row.stars, token.raw)
    case 'forks':
      return matchesNumericValue(row.forks, token.raw)
    case 'watchers':
      return matchesNumericValue(row.watchers, token.raw)
    case 'issues':
      return matchesNumericValue(row.openIssues, token.raw)
    case 'size':
      return matchesNumericValue(row.sizeKb ?? 'unavailable', token.raw)
    case 'pushed':
      return matchesDateValue(row.pushedAt, token.raw)
  }
}

function isSupportedKey(key: string): key is StructuredSearchKey {
  return [
    'company',
    'lang',
    'archived',
    'stars',
    'forks',
    'watchers',
    'issues',
    'pushed',
    'fork',
    'topic',
    'size',
    'visibility',
    'license',
  ].includes(key)
}

function parseBooleanValue(value: string): boolean | null {
  const normalized = value.trim().toLowerCase()
  if (['true', 'yes', '1'].includes(normalized)) return true
  if (['false', 'no', '0'].includes(normalized)) return false
  return null
}

function parseNumericCondition(raw: string): { comparator: Comparator; value: number } | null {
  const match = raw.match(/^(>=|<=|>|<|=)?(\d+)$/)
  if (!match) return null

  return {
    comparator: toComparator(match[1]),
    value: Number(match[2]),
  }
}

function parseDateCondition(raw: string): { comparator: Comparator; value: number } | null {
  const match = raw.match(/^(>=|<=|>|<|=)?(\d{4}-\d{2}-\d{2})$/)
  if (!match) return null

  const timestamp = Date.parse(`${match[2]}T00:00:00Z`)
  if (Number.isNaN(timestamp)) return null

  return {
    comparator: toComparator(match[1]),
    value: timestamp,
  }
}

function toComparator(raw: string | undefined): Comparator {
  switch (raw) {
    case '>':
      return 'gt'
    case '>=':
      return 'gte'
    case '<':
      return 'lt'
    case '<=':
      return 'lte'
    case '=':
    case undefined:
      return 'eq'
    default:
      return 'eq'
  }
}

function matchesNumericValue(rawValue: number | 'unavailable', rawCondition: string): boolean {
  if (typeof rawValue !== 'number') return false
  const condition = parseNumericCondition(rawCondition)
  if (!condition) return false
  return compare(rawValue, condition.comparator, condition.value)
}

function matchesDateValue(rawValue: string | 'unavailable', rawCondition: string): boolean {
  if (rawValue === 'unavailable') return false
  const actual = Date.parse(rawValue)
  const condition = parseDateCondition(rawCondition)
  if (Number.isNaN(actual) || !condition) return false
  return compare(actual, condition.comparator, condition.value)
}

function compare(actual: number, comparator: Comparator, expected: number): boolean {
  switch (comparator) {
    case 'eq':
      return actual === expected
    case 'gt':
      return actual > expected
    case 'gte':
      return actual >= expected
    case 'lt':
      return actual < expected
    case 'lte':
      return actual <= expected
  }
}
