export interface NumericFilter {
  op: '>' | '<' | '>=' | '<='
  value: number
}

export interface DateFilter {
  op: '>' | '<' | '>=' | '<='
  value: string
}

export interface ParsedInventoryQuery {
  /** Free-text portion after removing all recognised prefix tokens. */
  freeText: string
  /** `lang:go` — case-insensitive match against primaryLanguage */
  lang: string | null
  /** `archived:true/false` */
  archived: boolean | null
  /** `fork:true/false` */
  fork: boolean | null
  /** `stars:>1000` */
  stars: NumericFilter | null
  /** `forks:>50` */
  forks: NumericFilter | null
  /** `watchers:>100` */
  watchers: NumericFilter | null
  /** `issues:>20` — filters on openIssues */
  issues: NumericFilter | null
  /** `pushed:>2024-01-01` — filters on pushedAt (ISO date string) */
  pushed: DateFilter | null
}

const NUMERIC_OPS = ['>=', '<=', '>', '<'] as const
type NumericOp = (typeof NUMERIC_OPS)[number]

function parseBoolean(value: string): boolean | null {
  const lower = value.toLowerCase()
  if (lower === 'true') return true
  if (lower === 'false') return false
  return null
}

function parseNumericFilter(op: string | undefined, value: string): NumericFilter | null {
  const num = Number(value)
  if (Number.isNaN(num)) return null
  const resolvedOp = (op ?? '>') as NumericOp
  if (!(NUMERIC_OPS as readonly string[]).includes(resolvedOp)) return null
  return { op: resolvedOp, value: num }
}

function parseDateFilter(op: string | undefined, value: string): DateFilter | null {
  if (Number.isNaN(Date.parse(value))) return null
  const resolvedOp = (op ?? '>') as NumericOp
  if (!(NUMERIC_OPS as readonly string[]).includes(resolvedOp)) return null
  return { op: resolvedOp, value }
}

/**
 * Parse a raw query string from the org-inventory search bar into structured
 * filter tokens plus any remaining free-text.
 *
 * Supported prefixes:
 *   lang:go           — primaryLanguage (case-insensitive)
 *   archived:false    — boolean
 *   fork:true         — boolean
 *   stars:>1000       — numeric with >, <, >=, <=
 *   forks:>50         — numeric
 *   watchers:>100     — numeric
 *   issues:>20        — openIssues numeric
 *   pushed:>2024-01-01 — ISO date
 *
 * Multiple prefixes compose (AND semantics).
 * Prefixes are case-insensitive.
 */
export function parseOrgInventorySearchQuery(raw: string): ParsedInventoryQuery {
  const result: ParsedInventoryQuery = {
    freeText: raw,
    lang: null,
    archived: null,
    fork: null,
    stars: null,
    forks: null,
    watchers: null,
    issues: null,
    pushed: null,
  }

  let freeText = raw
  const regex = /(?:^|\s)(lang|archived|fork|stars|forks|watchers|issues|pushed):(>=|<=|>|<)?(\S+)/gi
  let match: RegExpExecArray | null

  while ((match = regex.exec(raw)) !== null) {
    const [fullMatch, prefix, op, value] = match
    // Remove the matched token (and any leading whitespace captured) from freeText
    freeText = freeText.replace(fullMatch.trim(), '')

    switch (prefix.toLowerCase()) {
      case 'lang':
        result.lang = value
        break
      case 'archived':
        result.archived = parseBoolean(value)
        break
      case 'fork':
        result.fork = parseBoolean(value)
        break
      case 'stars':
        result.stars = parseNumericFilter(op, value)
        break
      case 'forks':
        result.forks = parseNumericFilter(op, value)
        break
      case 'watchers':
        result.watchers = parseNumericFilter(op, value)
        break
      case 'issues':
        result.issues = parseNumericFilter(op, value)
        break
      case 'pushed':
        result.pushed = parseDateFilter(op, value)
        break
    }
  }

  result.freeText = freeText.replace(/\s+/g, ' ').trim()
  return result
}

export function applyNumericFilter(value: number | 'unavailable', filter: NumericFilter): boolean {
  if (typeof value !== 'number') return false
  switch (filter.op) {
    case '>': return value > filter.value
    case '<': return value < filter.value
    case '>=': return value >= filter.value
    case '<=': return value <= filter.value
  }
}

export function applyDateFilter(value: string | 'unavailable', filter: DateFilter): boolean {
  if (value === 'unavailable') return false
  const rowMs = new Date(value).getTime()
  const filterMs = new Date(filter.value).getTime()
  if (Number.isNaN(rowMs) || Number.isNaN(filterMs)) return false
  switch (filter.op) {
    case '>': return rowMs > filterMs
    case '<': return rowMs < filterMs
    case '>=': return rowMs >= filterMs
    case '<=': return rowMs <= filterMs
  }
}
