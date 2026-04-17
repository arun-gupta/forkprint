import type { AnalyzeResponse } from '@/lib/analyzer/analysis-result'

export type ResultTabId = 'overview' | 'contributors' | 'activity' | 'responsiveness' | 'documentation' | 'governance' | 'security' | 'recommendations' | 'comparison'

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
