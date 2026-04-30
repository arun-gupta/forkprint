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

    // Treat undefined (pre-feature or old serialised results) as unavailable,
    // distinct from an explicitly empty {} which means "known zero".
    // Commit-count and author-array availability are tracked independently so
    // older results that have counts but no author arrays can still contribute
    // corporate-commit and corporate-% values.
    const orgCountsUnavailable = orgCountsField === undefined || orgCountsField === 'unavailable'
    const orgAuthorsUnavailable = orgAuthorsField === undefined || orgAuthorsField === 'unavailable'
    const orgCommits = orgCountsUnavailable
      ? 0
      : ((orgCountsField as Record<string, number>)[orgHandle] ?? 0)
    const orgAuthors: string[] = orgAuthorsUnavailable
      ? []
      : ((orgAuthorsField as Record<string, string[]>)[orgHandle] ?? [])

    // --- Email signal ---
    const emailCountsField = cwm?.commitCountsByEmailDomain
    const emailAuthorsField = cwm?.commitAuthorsByEmailDomain

    // Same decoupling for email signal: counts and author arrays are independent.
    const emailCountsUnavailable = emailCountsField === undefined || emailCountsField === 'unavailable'
    const emailAuthorsUnavailable = emailAuthorsField === undefined || emailAuthorsField === 'unavailable'
    const emailCommits = emailCountsUnavailable
      ? 0
      : ((emailCountsField as Record<string, number>)[emailDomain] ?? 0)
    const emailAuthors: string[] = emailAuthorsUnavailable
      ? []
      : ((emailAuthorsField as Record<string, string[]>)[emailDomain] ?? [])

    // Both commit-count signals unavailable → can't compute corporate commits.
    // Special case: if totalCommits is 0 the result is deterministically 0.
    if (orgCountsUnavailable && emailCountsUnavailable) {
      const totalCommits = awm?.commits
      if (totalCommits === 0) {
        return { repo: result.repo, corporateCommits: 0, corporateAuthors: 0, corporatePct: 0 }
      }
      return {
        repo: result.repo,
        corporateCommits: 'unavailable',
        corporateAuthors: 'unavailable',
        corporatePct: 'unavailable',
      }
    }

    // Author count: 'unavailable' when both author-array fields are missing
    // (e.g., older serialised result without author arrays), otherwise combine.
    let corporateAuthors: number | 'unavailable'
    if (orgAuthorsUnavailable && emailAuthorsUnavailable) {
      corporateAuthors = 'unavailable'
    } else {
      const authorSet = new Set(orgAuthors)
      for (const a of emailAuthors) authorSet.add(a)
      corporateAuthors = authorSet.size
    }

    // Sum commits from both signals. The org signal tracks org-member commits and
    // the email signal tracks corporate-email commits (which may include contributors
    // without public org membership). Potential double-counting when the same person
    // appears in both signals is a known heuristic limitation disclosed in the UI caveat.
    const corporateCommits = orgCommits + emailCommits

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
  // If no repo has available attribution data the total is unknown — not zero
  const totalCorporateCommits: number | 'unavailable' =
    availableRepos.length === 0
      ? 'unavailable'
      : availableRepos.reduce((sum, r) => sum + (r.corporateCommits as number), 0)

  const allActorKeys = new Set<string>()
  for (const arr of allOrgAuthorArrays) for (const k of arr) allActorKeys.add(k)
  for (const arr of allEmailAuthorArrays) for (const k of arr) allActorKeys.add(k)
  // If no repo has available author data the count is unknown — not zero
  const anyAuthorDataAvailable = perRepo.some((r) => r.corporateAuthors !== 'unavailable')
  const totalCorporateAuthors: number | 'unavailable' = anyAuthorDataAvailable
    ? allActorKeys.size
    : 'unavailable'

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
  if (anyTotalAvailable && totalCorporateCommits !== 'unavailable') {
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
