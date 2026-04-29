import type { AnalysisResult } from '@/lib/analyzer/analysis-result'
import type {
  CorporateLensResult,
  CorporateRepoMetrics,
} from '@/specs/493-feat-corporate-contribution-lens-for-rep/contracts/corporate-metrics'
import type { ContributorWindowDays } from '@/lib/analyzer/analysis-result'
import { deriveCompanyInput } from './derive-company-input'

export { deriveCompanyInput }

function round1dp(n: number): number {
  return Math.round(n * 10) / 10
}

export function computeCorporateMetrics(
  results: AnalysisResult[],
  companyName: string,
  windowDays: ContributorWindowDays,
): CorporateLensResult {
  const company = deriveCompanyInput(companyName)
  const { orgHandle, emailDomain } = company

  const allOrgAuthorArrays: string[][] = []
  const allEmailAuthorArrays: string[][] = []

  const perRepo: CorporateRepoMetrics[] = results.map((result) => {
    const cwm = result.contributorMetricsByWindow?.[windowDays]
    const awm = result.activityMetricsByWindow?.[windowDays]

    // --- Org signal ---
    const orgCountsField = cwm?.commitCountsByExperimentalOrg
    const orgAuthorsField = cwm?.commitAuthorsByExperimentalOrg

    const orgSignalUnavailable = orgCountsField === 'unavailable' || orgAuthorsField === 'unavailable'
    const orgCommits = orgSignalUnavailable
      ? 0
      : ((orgCountsField as Record<string, number> | undefined)?.[orgHandle] ?? 0)
    const orgAuthors: string[] = orgSignalUnavailable
      ? []
      : ((orgAuthorsField as Record<string, string[]> | undefined)?.[orgHandle] ?? [])

    // --- Email signal ---
    const emailCountsField = cwm?.commitCountsByEmailDomain
    const emailAuthorsField = cwm?.commitAuthorsByEmailDomain

    const emailSignalUnavailable = emailCountsField === 'unavailable' || emailAuthorsField === 'unavailable'
    const emailCommits = emailSignalUnavailable
      ? 0
      : ((emailCountsField as Record<string, number> | undefined)?.[emailDomain] ?? 0)
    const emailAuthors: string[] = emailSignalUnavailable
      ? []
      : ((emailAuthorsField as Record<string, string[]> | undefined)?.[emailDomain] ?? [])

    // Both signals unavailable → 'unavailable' in all columns
    if (orgSignalUnavailable && emailSignalUnavailable) {
      return {
        repo: result.repo,
        corporateCommits: 'unavailable',
        corporateAuthors: 'unavailable',
        corporatePct: 'unavailable',
      }
    }

    const corporateCommits = orgCommits + emailCommits
    const corporateAuthors = orgAuthors.length + emailAuthors.length

    if (orgAuthors.length > 0) allOrgAuthorArrays.push(orgAuthors)
    if (emailAuthors.length > 0) allEmailAuthorArrays.push(emailAuthors)

    // --- Corporate % ---
    const totalCommits = awm?.commits
    const corporatePct: number | 'unavailable' =
      totalCommits === undefined || totalCommits === 'unavailable'
        ? 'unavailable'
        : totalCommits === 0
          ? 0
          : round1dp((corporateCommits / totalCommits) * 100)

    return { repo: result.repo, corporateCommits, corporateAuthors, corporatePct }
  })

  // --- Summary ---
  const availableRepos = perRepo.filter((r) => r.corporateCommits !== 'unavailable')
  const totalCorporateCommits = availableRepos.reduce(
    (sum, r) => sum + (r.corporateCommits as number),
    0,
  )

  const allActorKeys = new Set<string>()
  for (const arr of allOrgAuthorArrays) for (const k of arr) allActorKeys.add(k)
  for (const arr of allEmailAuthorArrays) for (const k of arr) allActorKeys.add(k)
  const totalCorporateAuthors = allActorKeys.size

  let overallCorporatePct: number | 'unavailable' = 'unavailable'
  let totalCommitsAcrossRepos = 0
  let anyTotalAvailable = false
  for (const result of results) {
    const awm = result.activityMetricsByWindow?.[windowDays]
    if (awm && awm.commits !== 'unavailable') {
      totalCommitsAcrossRepos += awm.commits
      anyTotalAvailable = true
    }
  }
  if (anyTotalAvailable) {
    overallCorporatePct =
      totalCommitsAcrossRepos === 0 ? 0 : round1dp((totalCorporateCommits / totalCommitsAcrossRepos) * 100)
  }

  return {
    company,
    windowDays,
    perRepo,
    summary: { totalCorporateCommits, totalCorporateAuthors, overallCorporatePct },
  }
}
