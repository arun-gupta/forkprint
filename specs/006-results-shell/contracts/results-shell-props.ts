import type { AnalyzeResponse } from '@/lib/analyzer/analysis-result'

export type ResultTabId = 'overview' | 'ecosystem-map' | 'comparison' | 'metrics'

export interface ResultsShellProps {
  hasServerToken: boolean
  analysisResponse: AnalyzeResponse | null
  submissionError: string | null
  loadingRepos: string[]
}

export interface ResultTabDefinition {
  id: ResultTabId
  label: string
  status: 'implemented' | 'placeholder'
  description: string
}
