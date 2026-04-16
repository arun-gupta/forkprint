import type { AnalysisResult } from '@/lib/analyzer/analysis-result'
import type { AggregatePanel } from '../types'
import type { Aggregator, LanguagesValue } from './types'

/**
 * FR-025: Primary language distribution across all repos in the org run.
 *
 * Groups repos by `primaryLanguage`, counting repos per language.
 * Repos where primaryLanguage is 'unavailable' are excluded.
 * Null or empty primaryLanguage is mapped to "Unknown".
 *
 * Pure function. No I/O.
 */
export const languagesAggregator: Aggregator<LanguagesValue> = (
  results,
  context,
): AggregatePanel<LanguagesValue> => {
  if (results.length === 0) {
    return {
      panelId: 'languages',
      contributingReposCount: 0,
      totalReposInRun: context.totalReposInRun,
      status: 'in-progress',
      value: null,
    }
  }

  // language -> repo count
  const langCounts = new Map<string, number>()
  let contributingReposCount = 0

  for (const r of results) {
    const lang = (r as AnalysisResult).primaryLanguage
    if (lang === 'unavailable') continue

    contributingReposCount++
    const key = lang && lang.trim() !== '' ? lang : 'Unknown'
    langCounts.set(key, (langCounts.get(key) ?? 0) + 1)
  }

  if (contributingReposCount === 0) {
    return {
      panelId: 'languages',
      contributingReposCount: 0,
      totalReposInRun: context.totalReposInRun,
      status: 'unavailable',
      value: null,
    }
  }

  const perLanguage: LanguagesValue['perLanguage'] = Array.from(langCounts.entries())
    .map(([language, repoCount]) => ({ language, repoCount }))
    .sort((a, b) => b.repoCount - a.repoCount || a.language.localeCompare(b.language))

  return {
    panelId: 'languages',
    contributingReposCount,
    totalReposInRun: context.totalReposInRun,
    status: 'final',
    value: { perLanguage },
  }
}
