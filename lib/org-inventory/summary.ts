import type { OrgRepoSummary } from '@/lib/analyzer/org-inventory'

export interface OrgInventorySummary {
  totalPublicRepos: number
  totalStars: number | 'unavailable'
  mostStarredRepos: Array<{ repo: string; stars: number | 'unavailable' }>
  mostRecentlyActiveRepos: Array<{ repo: string; pushedAt: string | 'unavailable' }>
  languageDistribution: Array<{ language: string; repoCount: number }>
  archivedRepoCount: number
  activeRepoCount: number
}

export function buildOrgInventorySummary(results: OrgRepoSummary[]): OrgInventorySummary {
  const starValues = results.flatMap((result) => (typeof result.stars === 'number' ? [result.stars] : []))
  const totalStars = starValues.length > 0 ? starValues.reduce((sum, value) => sum + value, 0) : 'unavailable'

  const languageCounts = new Map<string, number>()
  for (const result of results) {
    const language = result.primaryLanguage === 'unavailable' ? 'Unavailable' : result.primaryLanguage
    languageCounts.set(language, (languageCounts.get(language) ?? 0) + 1)
  }

  return {
    totalPublicRepos: results.length,
    totalStars,
    mostStarredRepos: [...results]
      .sort((left, right) => compareNumeric(right.stars, left.stars) || left.repo.localeCompare(right.repo))
      .slice(0, 5)
      .map((result) => ({ repo: result.repo, stars: result.stars })),
    mostRecentlyActiveRepos: [...results]
      .sort((left, right) => compareDate(right.pushedAt, left.pushedAt) || left.repo.localeCompare(right.repo))
      .slice(0, 5)
      .map((result) => ({ repo: result.repo, pushedAt: result.pushedAt })),
    languageDistribution: [...languageCounts.entries()]
      .map(([language, repoCount]) => ({ language, repoCount }))
      .sort((left, right) => right.repoCount - left.repoCount || left.language.localeCompare(right.language)),
    archivedRepoCount: results.filter((result) => result.archived).length,
    activeRepoCount: results.filter((result) => !result.archived).length,
  }
}

function compareNumeric(left: number | 'unavailable', right: number | 'unavailable') {
  if (typeof left !== 'number' && typeof right !== 'number') {
    return 0
  }
  if (typeof left !== 'number') {
    return -1
  }
  if (typeof right !== 'number') {
    return 1
  }
  return left - right
}

function compareDate(left: string | 'unavailable', right: string | 'unavailable') {
  if (left === 'unavailable' && right === 'unavailable') {
    return 0
  }
  if (left === 'unavailable') {
    return -1
  }
  if (right === 'unavailable') {
    return 1
  }
  return new Date(left).getTime() - new Date(right).getTime()
}
