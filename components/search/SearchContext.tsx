'use client'

import { createContext, useContext } from 'react'

const SearchContext = createContext('')

export function SearchProvider({ query, children }: { query: string; children: React.ReactNode }) {
  return <SearchContext value={query}>{children}</SearchContext>
}

export function useSearchQuery(): string {
  return useContext(SearchContext)
}
