# Research: Foundation Input Mode (#413)

## Existing surfaces to migrate or remove

| Surface | Location | Action |
|---|---|---|
| Foundation target dropdown | `RepoInputForm.tsx` L154–169 | Remove |
| CNCF Readiness tab injection | `ResultsShell.tsx` — dynamic inject when `aspirantResult` set | Remove (Foundation-only) |
| CNCF Candidacy tab in org results | `RepoInputClient.tsx` `orgInventoryTabs` L434, L439 | Remove |
| "View full report" link | `CNCFCandidacyPanel.tsx` L1072 — routes to `/?repos=...&foundationTarget=cncf-sandbox&tab=cncf-readiness` | Update to Foundation URL |

## Reusable components (no changes needed)

| Component | Props | Reuse in Foundation |
|---|---|---|
| `CNCFCandidacyPanel` | `{ org, repos }` | Foundation org sub-path |
| `CNCFReadinessTab` | `{ aspirantResult, repoSlug }` | Foundation repos sub-path (per repo) |
| `CNCFFieldPill` | — | Carries through via CNCFReadinessTab |

## Reusable APIs (no new endpoints needed)

| Endpoint | Used by Foundation for |
|---|---|
| `/api/analyze` with `foundationTarget=cncf-sandbox` | Repos sub-path — returns `aspirantResult` per repo |
| `/api/analyze-org` | Org sub-path — returns `OrgInventoryResponse` for `CNCFCandidacyPanel` |
| `/api/cncf-candidacy` | Called internally by `CNCFCandidacyPanel` — no change |
| `/api/cncf-landscape` | Called internally by `CNCFCandidacyPanel` — no change |

## Smart input detection rules

Decision: auto-detect input kind from format — no explicit sub-mode picker.

| Input pattern | Detected kind | Rationale |
|---|---|---|
| Contains `/` and matches `owner/repo` — one or more | `repos` | Same patterns as existing `parseRepos()` utility |
| Bare slug (no `/`), `github.com/org`, or `https://github.com/org` | `org` | Same as existing `normalizeOrgInput()` |
| `https://github.com/orgs/org/projects/N` | `projects-board` | Reserved — shows "coming soon" |
| Anything else | `invalid` | Inline validation error |

Rationale: reuses two existing parsing utilities (`parseRepos`, `normalizeOrgInput`) with a thin detection layer on top. No new grammar needed.

## `FoundationTarget` type extension

Decision: extend to a union covering all known targets; disabled ones are present in the type but not actionable.

```ts
export type FoundationTarget =
  | 'none'
  | 'cncf-sandbox'
  | 'cncf-incubating'   // disabled — coming soon
  | 'cncf-graduation'   // disabled — coming soon
  | 'apache-incubator'  // disabled — coming soon
```

A `FOUNDATION_REGISTRY` constant maps each target to `{ label, active }` so the picker renders from data, not hardcoded JSX.

## URL encoding strategy

Decision: extend existing `shareable-url.ts` with Foundation-specific encode/decode helpers.

```
/?mode=foundation&foundation=cncf-sandbox&input=owner%2Frepo1%2Cowner%2Frepo2
/?mode=foundation&foundation=cncf-sandbox&input=my-org
```

`mode=foundation` distinguishes from the existing `?repos=` param used by Repositories mode. On load, `RepoInputClient` detects `mode=foundation`, sets `inputMode='foundation'`, pre-populates the Foundation input, and auto-triggers the scan.

The nudge callouts in Org and Repositories results generate these URLs.

## Component architecture decision

Decision: add `'foundation'` as a third mode to `RepoInputForm` (not a separate top-level component). Rationale: mode buttons are already in `RepoInputForm`; adding Foundation there requires the fewest file changes and keeps all input-mode logic co-located.

A new `FoundationResultsView` component handles Foundation output (either per-repo readiness cards or the candidacy panel), rendered by `RepoInputClient` when `inputMode === 'foundation'`. This keeps Foundation results isolated from `ResultsShell`.
