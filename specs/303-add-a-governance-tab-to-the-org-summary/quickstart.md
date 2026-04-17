# Quickstart: Verify the Governance tab

These steps are the manual verification path that backs the PR Test Plan. The dev server is assumed to be running on port 3010 (from the worktree spawn).

## Prerequisites

- `npm install` has run in the worktree.
- The dev server is up: `lsof -iTCP:3010 -sTCP:LISTEN` shows a `node` process.
- You have a GitHub OAuth session active in the browser (or `DEV_GITHUB_PAT` is set in `.env.local`).
- A test organization with at least a few public repos. `kubernetes`, `kubernetes-sigs`, or any small org with maintainers and varied licensing works well.

## Steps

### 1 — Verify the tab strip

1. Open `http://localhost:3010`.
2. Switch to the **Organization** input mode.
3. Enter the test org and submit. Wait for analysis to complete (status: complete).
4. **Expect**: the org-summary tab strip shows, in order: Overview · Contributors · Activity · Responsiveness · Documentation · **Governance** · Security.

### 2 — Verify the Governance tab body

1. Click **Governance**.
2. **Expect**: the tab body renders, top-to-bottom:
   - Org admin activity (Stale admins panel) *(if owner is an Organization)*
   - Maintainers
   - Governance file presence
   - License consistency
3. If the owner is a User account (not an Organization), the Stale admins panel shows its existing N/A state; the other three panels render normally.

### 3 — Verify migrations out of Documentation

1. Click **Documentation**.
2. **Expect**: the tab body renders Documentation coverage, Inclusive naming, Adopters. **No** Governance file presence panel. **No** License consistency panel. **No** Stale admins panel.

### 4 — Verify migration out of Contributors

1. Click **Contributors**.
2. **Expect**: the tab body renders Contributor diversity, Org affiliations, Bus factor. **No** Maintainers panel.

### 5 — Verify Security is unchanged

1. Click **Security**.
2. **Expect**: the tab body renders the OpenSSF Scorecard rollup only. None of the four migrated panels appear here.

### 6 — Verify per-repo view is unchanged

1. Reset / navigate back to the input form.
2. Switch to **Repos** input mode and enter one of the same repos.
3. **Expect**: the per-repo result has the same tab strip as before this change (Overview · Contributors · Activity · Responsiveness · Documentation · Security · Recommendations · Comparison). **No** Governance tab on the per-repo view.

### 7 — Verify the per-repo Governance lens is unchanged

1. On the per-repo metric card for any analyzed repo, scroll to the lens readouts.
2. **Expect**: the Governance lens (cross-cutting completeness readout, "X of 8 governance signals present") still appears with its existing tooltip copy. This feature does not move it, recolor it, or change its underlying numbers.

### 8 — Verify the composite OSS Health Score is unchanged

1. Note the OSS Health Score for any analyzed repo (per-repo view). It should be identical to what the same analysis produced before this change. (For PR review, a screenshot before/after the change on the same repo set is sufficient.)

## Automated checks

Before opening the PR:

```bash
npm run lint
npm test
npm run build         # ensure DEV_GITHUB_PAT is unset for the build step
npm run test:e2e -- governance-tab
```

All four commands must exit zero. The e2e test (`e2e/governance-tab.spec.ts`) covers the navigation flow in steps 1–5 automatically.
