import type { SearchIndex, SearchResult } from './types'
import type { ResultTabId } from '@/specs/006-results-shell/contracts/results-shell-props'

const ALL_TABS: ResultTabId[] = [
  'overview', 'contributors', 'activity', 'responsiveness',
  'documentation', 'security', 'recommendations', 'comparison',
]

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function executeSearch(index: SearchIndex, query: string): SearchResult {
  const trimmed = query.trim()
  if (!trimmed) {
    const matchCounts = {} as Record<ResultTabId, number>
    for (const tab of ALL_TABS) matchCounts[tab] = 0
    return { matchCounts, totalMatches: 0, matchedTabCount: 0 }
  }

  const pattern = new RegExp(escapeRegex(trimmed), 'gi')
  const matchCounts = {} as Record<ResultTabId, number>
  let totalMatches = 0
  let matchedTabCount = 0

  for (const tab of ALL_TABS) {
    let tabCount = 0
    for (const entry of index[tab]) {
      const matches = entry.match(pattern)
      if (matches) tabCount += matches.length
    }
    matchCounts[tab] = tabCount
    totalMatches += tabCount
    if (tabCount > 0) matchedTabCount++
  }

  return { matchCounts, totalMatches, matchedTabCount }
}
