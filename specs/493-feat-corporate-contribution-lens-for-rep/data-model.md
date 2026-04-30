# Data Model: Corporate Contribution Lens (493)

## Existing types extended

### `ContributorWindowMetrics` (lib/analyzer/analysis-result.ts)

Three new optional fields added:

```typescript
// Per GitHub-org: unique actor keys (login-based only) that contributed
// at least one commit in this window attributed to that org.
// Array capped at 500 entries per org.
commitAuthorsByExperimentalOrg?: Record<string, string[]> | Unavailable

// Per email domain: commit count from email-based actors (no linked GitHub
// login) in this window whose author email ends with @<domain>.
commitCountsByEmailDomain?: Record<string, number> | Unavailable

// Per email domain: unique actor keys (email-based only) that committed in
// this window with a matching email domain.
// Array capped at 500 entries per domain.
commitAuthorsByEmailDomain?: Record<string, string[]> | Unavailable
```

Fields are optional (`?`) for backwards-compatibility with existing fixtures and serialised results.

---

## New types

### `CorporateCompanyInput` (lib/corporate/compute-corporate-metrics.ts)

```typescript
export interface CorporateCompanyInput {
  /** Raw value entered by the user, e.g. "microsoft" or "microsoft.com" */
  companyName: string
  /** Derived GitHub org handle (lowercased, TLD stripped) */
  orgHandle: string
  /** Derived email domain (lowercased; ".com" appended if no dot in input) */
  emailDomain: string
}
```

### `CorporateRepoMetrics` (lib/corporate/compute-corporate-metrics.ts)

```typescript
export interface CorporateRepoMetrics {
  repo: string
  /** Commits from org signal + email signal (no overlap by construction) */
  corporateCommits: number | 'unavailable'
  /** Unique actor keys from org signal + email signal */
  corporateAuthors: number | 'unavailable'
  /** corporateCommits / totalCommits × 100, rounded to 1 dp */
  corporatePct: number | 'unavailable'
}
```

### `CorporateLensResult` (lib/corporate/compute-corporate-metrics.ts)

```typescript
export interface CorporateLensResult {
  company: CorporateCompanyInput
  windowDays: ContributorWindowDays
  perRepo: CorporateRepoMetrics[]
  summary: {
    /** Sum of per-repo corporate commits */
    totalCorporateCommits: number
    /** De-duplicated unique actor keys across all repos */
    totalCorporateAuthors: number
    /** totalCorporateCommits / totalCommits × 100, rounded to 1 dp */
    overallCorporatePct: number | 'unavailable'
  }
}
```

---

## Derivation rules

### Company name → signals

```
function deriveCompanyInput(companyName: string): CorporateCompanyInput
  raw = companyName.trim().toLowerCase()
  // strip known TLDs
  orgHandle = raw.replace(/\.(com|io|org|net|dev)$/, '')
  emailDomain = raw.includes('.') ? raw : raw + '.com'
  return { companyName, orgHandle, emailDomain }
```

### Corporate commits per repo (org signal)

```
orgCommits = contributorMetricsByWindow[w].commitCountsByExperimentalOrg[orgHandle] ?? 0
```

Returns `'unavailable'` if `commitCountsByExperimentalOrg` is `'unavailable'`.

### Corporate commits per repo (email signal)

```
emailCommits = contributorMetricsByWindow[w].commitCountsByEmailDomain?.[emailDomain] ?? 0
```

Returns `0` (not `'unavailable'`) if field absent — email signal being absent means no email-based actors were found, not a data error.

### Corporate authors per repo

```
orgAuthors  = new Set(contributorMetricsByWindow[w].commitAuthorsByExperimentalOrg?.[orgHandle] ?? [])
emailAuthors = new Set(contributorMetricsByWindow[w].commitAuthorsByEmailDomain?.[emailDomain] ?? [])
// Sets are disjoint (login: vs email: prefixes); no union de-dup needed per repo
corporateAuthors = orgAuthors.size + emailAuthors.size
```

### Corporate % per repo

```
totalCommits = activityMetricsByWindow[w].commits  // or fallback
corporatePct = totalCommits === 'unavailable'
  ? 'unavailable'
  : round((corporateCommits / totalCommits) * 100, 1)
```

### Summary totals (across repos)

```
totalCorporateCommits = sum(perRepo[i].corporateCommits where !== 'unavailable')
totalCorporateAuthors = size(union of all actor-key arrays across repos)
overallCorporatePct   = totalCommitsAcrossRepos === 0
  ? 'unavailable'
  : round((totalCorporateCommits / totalCommitsAcrossRepos) * 100, 1)
```

Note: cross-repo author de-duplication requires the full actor-key arrays from all repos, not just counts.
