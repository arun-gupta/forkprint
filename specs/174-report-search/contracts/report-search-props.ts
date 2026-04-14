import type { ResultTabId } from '@/specs/006-results-shell/contracts/results-shell-props'

/**
 * Props for the ReportSearchBar component.
 * Renders a search input with match summary in the toolbar area.
 */
export interface ReportSearchBarProps {
  /** Current raw query string (controlled input) */
  query: string
  /** Callback when user types in the search input */
  onQueryChange: (query: string) => void
  /** Total number of matches across all tabs */
  totalMatches: number
  /** Number of tabs that contain at least one match */
  matchedTabCount: number
}

/**
 * Match counts passed to ResultsTabs for badge display.
 */
export type TabMatchCounts = Partial<Record<ResultTabId, number>>

/**
 * Props for the SearchHighlighter component.
 * Wraps text content and highlights matching substrings.
 */
export interface SearchHighlighterProps {
  /** The text content to search within */
  text: string
  /** The search query to highlight (case-insensitive substring match) */
  query: string
}

/**
 * Search index entry: an array of searchable text strings per tab.
 */
export type SearchIndex = Record<ResultTabId, string[]>

/**
 * Result of executing a search query against the index.
 */
export interface SearchResult {
  /** Number of matches per tab */
  matchCounts: Record<ResultTabId, number>
  /** Sum of all tab match counts */
  totalMatches: number
  /** Number of tabs with at least one match */
  matchedTabCount: number
}
