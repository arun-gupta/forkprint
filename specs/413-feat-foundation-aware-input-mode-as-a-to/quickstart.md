# Quickstart: Foundation Input Mode (#413)

## What this feature ships

A third top-level input mode — **Foundation** — alongside Repositories and Organization.
Users pick a foundation target, type repos or an org slug into a single smart input field,
and get foundation readiness results without running a full health analysis.

Simultaneously removes foundation elements from Repositories and Organization modes so
all foundation work lives in one place.

## Files changed / created

### New files
```
lib/foundation/types.ts                        — FoundationConfig registry, FoundationInputKind
lib/foundation/parse-foundation-input.ts       — smart input parser
components/foundation/FoundationInputSection.tsx  — picker + input field + tooltip
components/foundation/FoundationResultsView.tsx   — per-repo readiness or org candidacy panel
components/foundation/FoundationNudge.tsx         — callout in Org/Repos results
```

### Modified files
```
lib/cncf-sandbox/types.ts              — extend FoundationTarget union
lib/export/shareable-url.ts            — add Foundation URL encode/decode
components/repo-input/RepoInputForm.tsx — add Foundation mode button, remove dropdown
components/repo-input/RepoInputClient.tsx — add Foundation mode state & handlers,
                                            nudge wiring, remove CNCF Candidacy from org tabs
components/app-shell/ResultsShell.tsx  — remove aspirantResult CNCF Readiness tab injection
components/cncf-candidacy/CNCFCandidacyPanel.tsx — update "View full report" link to Foundation URL
docs/DEVELOPMENT.md                    — mark feature complete
```

## Key flows

### Flow 1 — Repos path
1. User clicks Foundation tab → picks CNCF Sandbox → types `owner/repo` slug(s)
2. `parse-foundation-input` detects `kind: 'repos'`
3. `RepoInputClient.handleFoundationSubmit` calls `/api/analyze` with `foundationTarget='cncf-sandbox'`
4. `FoundationResultsView` renders `CNCFReadinessTab` for each result (uses `result.aspirantResult`)

### Flow 2 — Org path
1. User clicks Foundation tab → picks CNCF Sandbox → types org slug
2. `parse-foundation-input` detects `kind: 'org'`
3. `RepoInputClient.handleFoundationSubmit` calls `/api/analyze-org` for the org's repo list
4. `FoundationResultsView` renders `CNCFCandidacyPanel` with `{ org, repos }`

### Flow 3 — Nudge
1. User finishes a Repositories or Organization analysis
2. `FoundationNudge` callout appears at bottom of results
3. Clicking nudge sets `inputMode='foundation'`, pre-populates Foundation input with repos/org,
   and scrolls to the input form

### Flow 4 — Deep-link
1. User shares URL: `/?mode=foundation&foundation=cncf-sandbox&input=owner%2Frepo`
2. `RepoInputClient` detects `mode=foundation` on load, pre-populates Foundation input,
   auto-triggers scan

### Flow 5 — Projects board (coming soon)
1. User pastes `https://github.com/orgs/org/projects/N`
2. `parse-foundation-input` detects `kind: 'projects-board'`
3. `FoundationResultsView` renders "Projects board support coming soon" message

## TDD order
1. `parse-foundation-input.test.ts` — all detection cases (repos, org, board, invalid)
2. `shareable-url.test.ts` — Foundation URL encode/decode round-trip
3. `FoundationInputSection.test.tsx` — picker renders active/disabled; tooltip content
4. `FoundationResultsView.test.tsx` — repos branch, org branch, loading, error states
5. `FoundationNudge.test.tsx` — renders, calls onActivate with correct prefill
6. `RepoInputClient` integration — Foundation tab visible; submit routes correctly; nudge appears
