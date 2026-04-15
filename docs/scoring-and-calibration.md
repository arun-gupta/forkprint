# Scoring and Calibration

This document explains how RepoPulse scores repositories, where the scoring thresholds come from, and how to reproduce or refresh the calibration data.

---

## Why calibrated thresholds?

Earlier versions of RepoPulse used hardcoded thresholds with no empirical basis — a repo with 10k stars was labeled "Growing" (a middle tier) when it is actually in the top 1–2% of all GitHub repositories. The distribution of stars, fork rates, and activity metrics across GitHub is extremely skewed, and arbitrary thresholds produce misleading scores.

Calibrated thresholds anchor scores to real observed distributions, so a "Strong" rating means the repository genuinely outperforms most comparable repositories — not just that it crossed an editorial guess.

---

## Scoring anchor: star brackets

All scores are computed relative to repositories in the same **star bracket**, not against the full GitHub population. Stars are used as the anchor because they are a reasonable proxy for project maturity and visibility — user expectations, contributor volume, and maintainer load differ meaningfully across star ranges.

| Bracket | Star range | Description |
|---|---|---|
| Solo Tiny | < 10 | Solo-maintained projects with minimal external visibility |
| Solo Small | 10 – 99 | Solo-maintained projects with modest external interest |
| Emerging | 10 – 99 | Early-stage or niche projects with some external interest |
| Growing | 100 – 999 | Projects with meaningful adoption |
| Established | 1,000 – 9,999 | Well-known projects with active communities |
| Popular | 10,000+ | Widely adopted, high-visibility projects |

**Solo brackets (issue #229):** When a repo is classified as solo by `detectSoloProjectProfile` (the 3-of-4 heuristic in `lib/scoring/solo-profile.ts`), it is routed to the matching solo bracket based on stars. Solo-classified repos with ≥ 100 stars fall back to the nearest community bracket — the population above that threshold is too sparse to calibrate independently. The scorecard bracket label carries a "limited solo sample" note in that case. The community-scoring override toggle always routes to the normal star-tier bracket, regardless of detection.

**Solo sampling:** `npm run calibrate:solo` samples only repos that satisfy a lightweight solo heuristic at fetch time (≤ 2 recent commit authors, ≤ 2 contributors, no GOVERNANCE file — 2-of-3 required). Results are written into `lib/scoring/calibration-data.json` alongside community brackets, not in place of them. Solo runs drop the org cap (solo repos are individual-account single-maintainers, so org concentration is a no-op) and relax the language cap to 40 per popular language / 20 per other (up from 15/8), so the solo cohort's natural language distribution is preserved.

**Known limitation:** Stars correlate with maturity but are also influenced by marketing and virality. A single anchor metric will never be perfect. This is a pragmatic simplification chosen for explainability. Future calibration may stratify by additional dimensions such as repo age or domain.

---

## Metrics collected

For each sampled repository, the following metrics are collected via the GitHub GraphQL API and the REST contributors endpoint. Percentile distributions (p25, p50, p75, p90) are then computed within each star bracket.

| Metric | Source | Derivation |
|---|---|---|
| Stars | GraphQL `stargazerCount` | Direct |
| Forks | GraphQL `forkCount` | Direct |
| Watchers | GraphQL `watchers.totalCount` | Direct |
| Fork rate | Stars, Forks | `forks / stars` |
| Watcher rate | Stars, Watchers | `watchers / stars` |
| PR merge rate | Merged + open PRs (90d window) | `merged / (merged + open)` |
| Issue closure rate | Closed + open issues (90d window) | `closed / (closed + open)` |
| Stale issue ratio | Open issues | `(open − recently active) / open` |
| Stale PR ratio | Open PRs (Search API) | `stale open PRs / total open PRs` |
| Median time to merge | Merged PRs (90d window) | Hours from open to merge |
| Median time to close issue | Closed issues (90d window) | Hours from open to close |
| Issue first response (median) | Closed issues (90d window) | Hours from open to first comment |
| Issue first response (p90) | Closed issues (90d window) | p90 of above |
| PR first review (median) | Merged PRs (90d window) | Hours from open to first review/comment |
| PR first review (p90) | Merged PRs (90d window) | p90 of above |
| PR review depth | Merged PRs (90d window) | Average reviews per merged PR |
| Issues closed without comment | Closed issues (90d window) | Fraction with zero comments |
| Human response ratio | Closed issues (90d window) | Fraction where first responder is human |
| Bot response ratio | Closed issues (90d window) | Fraction where first responder is a bot |
| Contributor response rate | Closed issues (90d window) | Fraction that received any comment |
| Top contributor share | REST contributors endpoint | `top author commits / total commits` |

**Activity window:** PR and issue metrics use a 90-day lookback. Stale issue ratio uses a 30-day recency threshold.

**Bot detection:** First responders on closed issues are classified as bots using two heuristics: login ends in `[bot]`, or login matches a known set (dependabot, renovate, github-actions, semantic-release-bot, etc.).

---

## Data source

Calibration data is generated by sampling GitHub repositories via the **GitHub Search API** and analyzing each one using a lightweight custom GraphQL query. This approach was chosen after investigating and ruling out alternative data sources — see [Appendix A](#appendix-a-why-not-bigquery-or-gh-archive).

The calibration script (`scripts/calibrate.ts`) makes three API calls per repo:

1. **GraphQL batch query** — fetches all metrics for 3 repos in a single aliased query, minimizing round trips. Only the fields needed for the metrics above are requested — no over-fetching. The batch size is kept at 3 to stay under GitHub's `RESOURCE_LIMITS_EXCEEDED` threshold.
2. **REST contributors endpoint** — `/repos/{owner}/{name}/stats/contributors` — for `topContributorShare`. This is a separate call because contributor stats are not available via GraphQL.
3. **Search API** — `is:pr is:open repo:{owner}/{name} updated:<DATE` with `per_page=1` — for `stalePrRatio`. Only `total_count` is needed; fetching a single result is sufficient.

**Multi-token round-robin:** The script round-robins across all configured tokens for every API call, multiplying effective rate limit capacity. Each additional token adds roughly one full token's worth of throughput. Tokens can be configured as numbered env vars (`GITHUB_TOKEN_1`, `GITHUB_TOKEN_2`, ...), comma-separated (`GITHUB_TOKENS`), or a single token (`GITHUB_TOKEN`).

**Retry and resilience:** All API calls are wrapped with automatic retry (up to 3 attempts with exponential backoff) for network errors (socket closures) and server errors (502, 503). Rate limit responses (403, 429) are handled by waiting for the `Retry-After` header. GraphQL responses with partial `RESOURCE_LIMITS_EXCEEDED` errors are handled gracefully — available fields are used, nulled-out fields are skipped.

---

## Sampling approach

### How repos are chosen

Repo selection is a three-stage pipeline: server-side API filters → client-side quality filters → diversity cap.

#### Stage 1 — Server-side filters (GitHub Search API query)

These are applied in the search query itself and enforced by GitHub before any results are returned.

| Filter | Rationale |
|---|---|
| `fork:false` | Forks inherit the parent's full commit history. Metrics like contributor count and commit frequency would reflect the upstream project, not the fork itself. Responsiveness metrics are also unreliable — contributors typically open PRs against upstream, not the fork. |
| `archived:false` | Archived repos have no ongoing activity. All responsiveness and activity metrics would be permanently stale. |
| `pushed:>DATE` | 12-month rolling window, computed at script runtime. Filters abandoned projects while accommodating repos with slower release cadences. The window is the same for all brackets. |
| `stars:MIN..MAX` | Bracket-specific star range. Keeps each bracket's sample within its intended population. |

#### Stage 2 — Client-side quality filters (applied after fetching)

The GitHub Search API index can be stale and does not support all necessary exclusion criteria. These filters are applied in code after results are returned. Description-based patterns are also checked against the repo name to catch cases where the intent is only expressed in the name (e.g. `otpbomber`).

**Language filters:**

| Filter | Rationale |
|---|---|
| Primary language must not be null | Repos with no detected language are almost always markdown-only list or resource repos |
| Excluded languages: `Jupyter Notebook`, `Adblock Filter List`, `TeX`, `YAML`, `Markdown`, `DIGITAL Command Language` | These indicate notebook collections, filter lists, document repos, config/data repos, pure-markdown collections, or administrative repos (e.g. DMCA notices) — not software projects with a meaningful PR and issue workflow |

**Identity filters:**

| Filter | Rationale |
|---|---|
| Star count re-validated against bracket bounds | Search index staleness can occasionally return repos outside the intended range |
| Repo name ≠ owner name | Eliminates GitHub profile README repos (e.g. `user/user`), which have no software activity |

**Name-based filters:**

| Filter | Rationale |
|---|---|
| Name does not end in `-docs`, `-documentation`, `-wiki`, `-website`, `-guidelines`, `-writers-toolkit` | Documentation and website repos are not software projects; their PR and issue activity reflects content editing, not software development |
| Name and description do not match index/registry pattern | Eliminates package index or registry repos whose issue and PR activity reflects package submissions, not software development |

**Description-based filters** (checked against both description and repo name):

| Filter | Pattern matched | Rationale |
|---|---|---|
| Mirror indicators | `mirrored from`, `mirror of`, `read-only mirror`, `do not open PRs here` | Read-only mirrors have no canonical PR or issue workflow — all activity happens upstream |
| Security bypass tools | `otp bypass/bomb/flood/spam`, `2fa bypass`, `account switcher/manager`, `activation scripts` | Credential tools, OTP flooding tools, and activation bypass repos have atypical activity patterns that would distort calibration |
| Collection/resource repos | `awesome`, `curated list`, `cheatsheet`, `roadmap`, `interview questions`, `study plan`, `learning path`, `public apis`, `system design primer`, `free-for-dev`, `curriculum`, `cookbook`, `recipes`, `style guide`, `self-taught`, `how-to-cook`, `word lists`, `sec lists` | These repos attract stars through content curation, educational value, or virality — not software quality. Their activity patterns are not representative of software projects |

#### Stage 3 — Diversity cap

| Rule | Value | Rationale |
|---|---|---|
| Max repos per primary language per bracket | 3 | Prevents any single language from dominating the calibration sample, which would skew percentiles toward that language's ecosystem norms |

---

### Stratified sampling within brackets

#### Why strata are needed

The GitHub star distribution is heavily right-skewed. Within any bracket, repos near the lower star boundary vastly outnumber repos near the upper boundary — e.g. in the Growing bracket (100–999 stars), there are far more 100-star repos than 900-star repos. Without strata, an unguided search would fill the sample almost entirely with low-end repos, making the percentile thresholds reflect the lower end of the bracket rather than the full range.

Strata force equal representation across the star range by splitting each bracket into sub-ranges and drawing a fixed number of repos from each independently.

#### Why 4 strata for most brackets, 3 for Emerging

Emerging (10–99) spans only 90 stars — a narrow absolute range where the population difference between low and high ends is smaller. Three equal strata (10–29, 30–59, 60–99) are sufficient to prevent clustering. Adding a fourth stratum would create unnecessarily small sub-ranges with minimal diversity benefit.

Growing, Established, and Popular each span one to several orders of magnitude. Four strata provide meaningful coverage without over-engineering the sampling process.

#### Stratum boundaries

Boundaries are chosen to divide each bracket into roughly equal-width sub-ranges on a **linear scale** for Emerging and Growing (where the population skew is moderate), and on a **log scale** for Established and Popular (where star counts span orders of magnitude and a linear split would place nearly all repos in the lowest stratum).

| Bracket | S1 | S2 | S3 | S4 | Target/stratum | Total |
|---|---|---|---|---|---|---|
| Emerging (10–99) | 10–29 | 30–59 | 60–99 | — | 17 | 51 |
| Growing (100–999) | 100–324 | 325–549 | 550–774 | 775–999 | 13 | 52 |
| Established (1k–10k) | 1k–3k | 3k–5.5k | 5.5k–7.5k | 7.5k–10k | 13 | 52 |
| Popular (10k+) | 10k–25k | 25k–65k | 65k–170k | 170k+ | 13 | 52 |

**Note:** The Popular S4 stratum (170k+) typically yields fewer than 13 repos because very few active software projects exist at that star level after quality filters are applied. This is expected — the script collects all qualifying repos in sparse strata.

#### Target per stratum

Emerging uses a higher per-stratum target (17 vs 13) because many Emerging repos lack issue and PR history — producing unavailable metrics — so a larger gross sample is needed to achieve stable percentile estimates on the metrics that do have data.

Growing, Established, and Popular use 13 per stratum. With 4 strata this yields 52 repos per bracket, comfortably above the 50-repo minimum for p90 stability (see [Appendix B](#appendix-b-why-percentiles-not-mean--sd)).

#### Sort strategy

Repos within each stratum are fetched across three sort orders (`updated`, `created`, `stars`) to diversify the sample beyond what any single ordering would produce. For the Popular bracket, `updated` is prioritised over `stars` to reduce the influence of repos with artificially inflated star counts.

**Minimum activity filter:** Repositories that pass all filters but have unavailable metrics (e.g., no issues or PRs in the analysis window) are not excluded — their available metrics still contribute to applicable percentiles.

---

## Calibration output

The calibration script writes a versioned JSON file to `lib/scoring/calibration-data.json`:

```json
{
  "generated": "2026-04-09",
  "source": "GitHub Search API + lightweight GraphQL",
  "sampleSizes": {
    "emerging": 51,
    "growing": 52,
    "established": 52,
    "popular": 47
  },
  "brackets": {
    "emerging": {
      "stars":    { "p25": 23,   "p50": 42,   "p75": 69,   "p90": 80   },
      "forkRate": { "p25": 0.091, "p50": 0.254, "p75": 0.538, "p90": 0.960 },
      "prMergeRate": { "p25": 0.730, "p50": 0.962, "p75": 1.000, "p90": 1.000 }
    }
  }
}
```

The `generated` date is the calibration cutoff date — analogous to an LLM training cutoff. Scores reflect the GitHub population as it existed on that date.

The full list of sampled repos is in [`docs/calibrate-repos.md`](calibrate-repos.md).

---

## Recommendation gate

Bucket sub-factor recommendations (Activity, Responsiveness, Contributors, Documentation, Security) are gated by percentile. A sub-factor recommendation is emitted only when the sub-factor's percentile is **strictly below** the gate. At or above the gate, the recommendation is suppressed — silent-when-good.

The threshold lives in configuration at `lib/scoring/config-loader.ts`:

```ts
export const RECOMMENDATION_PERCENTILE_GATE = 50
```

Documentation and Security recommendations are gated by the bucket percentile (since each rec is tied to a missing file/section). Activity, Responsiveness, and Contributors recommendations are gated per sub-factor (PR flow, Issue flow, etc.), so a repo with a strong PR flow won't be told to "reduce PR backlog" even if another Activity sub-factor is weak.

Presence-based community-lens signals (`FUNDING.yml`, Discussions disabled, missing `CODEOWNERS`) are not percentile-gated — they fire on verified absence of a specific artifact.

Rationale: issue #230. Top performers should not be scolded about the dimension they are already strong on.

---

## Staleness policy

Calibration data is refreshed **quarterly**. If the `generated` date in `calibration-data.json` is more than **6 months old**, the RepoPulse UI surfaces a visible staleness warning:

> *"Scores calibrated against GitHub data from [date]. A more recent calibration is recommended."*

---

## How to re-run calibration

### Dry run (preview repos without fetching metrics)

```bash
npm run calibrate:dry-run
```

This samples repos across all brackets and strata, writes the list to `scripts/calibrate-repos.md` for review, and saves the sampled repos to the checkpoint file. No metrics are fetched. The subsequent full run will use the same repos.

### Full run

```bash
npm run calibrate
```

**Requirements:** Node.js 18+, at least one GitHub PAT with `public_repo` read access in `.env.local`.

**Multi-token setup (recommended):** Add PATs to `.env.local`. Each additional token adds roughly one full token's worth of rate limit capacity. 5 tokens recommended for ~800 repo calibration runs.

```bash
# Numbered (recommended for 3+ tokens):
GITHUB_TOKEN_1=ghp_...
GITHUB_TOKEN_2=ghp_...
GITHUB_TOKEN_3=ghp_...
GITHUB_TOKEN_4=ghp_...
GITHUB_TOKEN_5=ghp_...

# Or comma-separated (single line):
# GITHUB_TOKENS=ghp_token1,ghp_token2,ghp_token3
```

The script checkpoints to `scripts/calibrate-checkpoint.json` after every batch. If interrupted (network errors, rate limits), re-running resumes from where it left off. Delete the checkpoint file to start fresh.

**Expected runtime:** ~20–30 minutes with 2 tokens. Socket errors from GitHub may require a few restarts — the checkpoint ensures no work is lost.

### Solo calibration run

```bash
npm run calibrate -- --profile=solo --dry-run  # preview
npm run calibrate -- --profile=solo            # full run
```

Solo runs use a separate checkpoint (`scripts/calibrate-solo-checkpoint.json`) but write their sampled repos into the same `docs/calibrate-repos.md` file alongside the community sections (bracket headers don't overlap). Results are **merged** into `lib/scoring/calibration-data.json`: only the `solo-tiny` and `solo-small` entries are updated; community brackets are left alone.

Each solo candidate is verified at sample time via three additional REST calls (contributors, recent commits, GOVERNANCE.md), so solo runs are slower per-candidate than community runs. Target sample size is 400 per bracket: `solo-tiny` uses 2 strata × 200 (1–4 stars, 5–9 stars); `solo-small` uses 160+140+100 across 10–29, 30–59, 60–99 stars. Expect ~3 hours with 5 tokens for a full run.

### Legacy script

The original calibration script (`scripts/calibrate-legacy.ts`) uses the full `analyze()` pipeline with paginated commit history — approximately 10 repos/hour. It is kept for reference but not recommended.

```bash
npm run calibrate:legacy
```

### Quarterly refresh process

1. Delete `scripts/calibrate-checkpoint.json` if one exists from a previous run
2. Add tokens to `.env.local`
3. Run `npm run calibrate:dry-run` to preview the sampled repos
4. Review `docs/calibrate-repos.md` for quality
5. Run `npm run calibrate` (resume if interrupted — checkpoint handles it)
6. Review `lib/scoring/calibration-data.json` — verify sample sizes are ≥ 50 per bracket and percentile values are plausible
7. Commit with a message such as: `chore: recalibrate scoring thresholds (2026-Q2, N=202 repos)`
8. The UI staleness warning clears automatically once the new `generated` date is within 6 months

---

## Appendix A: Why not BigQuery or GH Archive?

We investigated two public GitHub datasets as alternative calibration sources before settling on the GitHub Search API.

**`bigquery-public-data.github_repos`:** The `repos` table, which contained star and fork counts, has been retired. The remaining tables contain file contents and commit history but not the repo-level metrics needed for calibration.

**GH Archive:** Records GitHub event payloads but not repo state. Star counts, fork counts, and watcher counts do not appear in any event payload — only events (starring, forking) are recorded, not cumulative totals. Reconstructing current state from event history is impractical and error-prone.

**Chosen approach — GitHub Search API + custom GraphQL:** Each sampled repository is analyzed using the same GraphQL fields used for live RepoPulse analysis. This guarantees that calibration data and live scores are derived from identical API fields and parsing logic, with no cross-source mapping errors.

---

## Appendix B: Why percentiles, not mean ± SD?

### What we investigated

During calibration design we explored whether GitHub metrics follow a normal distribution — which would allow using mean ± standard deviation as scoring thresholds. We ran empirical rule checks (68%/95%/99.7%) on fork count data across stratified random samples in the Growing bracket (100–999 stars).

**Finding:** Fork counts — and GitHub metrics generally — follow a **log-normal distribution**, not a normal distribution. The raw data is heavily right-skewed with extreme outliers (e.g. a large org repo in the same star range as a personal project). Even with stratified sampling and balanced strata, one outlier can move the mean and SD dramatically.

### Transformations considered

| Transform | Skewness (example run) | Excess kurtosis | Notes |
|-----------|------------------------|-----------------|-------|
| None (raw) | 3.72 | 12.75 | Strongly right-skewed |
| sqrt(x) | 2.68 | 7.47 | Improved but still skewed |
| cbrt(x) | 2.03 | 4.84 | Better still |
| log(x) | 0.36 | 1.02 | Best — Box-Cox optimal λ=0 confirms this |

Log transformation brings skewness close to zero and dramatically reduces kurtosis. However, even log-transformed data does not reliably satisfy the empirical rule at 1σ because structural outliers (large org repos with atypically high fork counts for their star range) are an inherent feature of the GitHub population, not a sampling artifact.

### Why percentiles are the right choice

Percentiles are **distribution-agnostic** — they require no assumption of normality and are unaffected by the choice of transformation. They also degrade gracefully in the presence of outliers: an extreme outlier only affects the p90 estimate, leaving p25, p50, and p75 stable.

With mean ± SD thresholds, a single repo like `GoogleCloudPlatform/magic-modules` (2,236 forks in the Growing bracket) inflates the SD enough to make the 1σ band meaningless. With percentiles, it simply sits above p90 and does not distort the lower bands.

### Why not log-transform then compute percentiles?

Log-transforming before computing percentiles adds complexity with no benefit — percentiles on raw data and percentiles on log-transformed data produce equivalent threshold rankings once converted back. Raw percentiles are simpler, more interpretable, and directly usable in the scoring functions.

### Sample size per bracket

The minimum sample size is driven by p90 stability, since p90 is anchored by the top 10% of values:

| Sample size | Data points anchoring p90 | Assessment |
|-------------|--------------------------|------------|
| 20 | 2 | Too unstable |
| 30 | 3 | Borderline |
| 50 | 5 | Acceptable for quarterly-refreshed calibration |
| 100 | 10 | Good |

**Target: 50 repos minimum per bracket.** For the Emerging bracket, where many repos lack issue/PR history, a larger gross sample (51) is used to ensure stable estimates on the metrics that do have data.

### Strata granularity investigation

We investigated whether finer strata (more subdivisions of the star range) would produce more normally distributed samples within each stratum. Finding: strata granularity has diminishing returns because stars and fork counts are only loosely correlated — a 900-star org repo can have 10× the forks of a 900-star personal project. Finer strata reduce within-stratum star variance but do not meaningfully reduce fork count variance. The current 4-stratum design provides adequate diversity without over-engineering the sampling process.
