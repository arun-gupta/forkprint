import type { ResultTabId } from '@/specs/006-results-shell/contracts/results-shell-props'

/** Pre-computed searchable text extracted from analysis results, keyed by tab ID. */
export type SearchIndex = Record<ResultTabId, string[]>

/** Result of executing a search query against the index. */
export interface SearchResult {
  matchCounts: Record<ResultTabId, number>
  totalMatches: number
  matchedTabCount: number
}

/** Match counts passed to ResultsTabs for badge display. */
export type TabMatchCounts = Partial<Record<ResultTabId, number>>
