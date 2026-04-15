# Quickstart: Org-Level Aggregation

How to validate the feature locally end-to-end. Steps 1–4 verify the happy path on a small org; step 5 is the manual signoff scenario for the PR Test Plan.

---

## Prerequisites

- Repo cloned, on branch `231-org-aggregation`.
- `npm install` complete.
- One of:
  - GitHub OAuth set up locally (`GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` in `.env.local`), OR
  - `DEV_GITHUB_PAT=ghp_...` in `.env.local` for multi-worktree use (per `docs/DEVELOPMENT.md`)
- Dev server already running (port 3011 in this worktree per the kickoff).

---

## 1. Sign in

1. Open `http://localhost:3011`.
2. Click "Sign in with GitHub". You should land back on the home page authenticated.

**Pass criteria**: Header shows your GitHub login.

---

## 2. Open Org Inventory and pre-filter

1. Navigate to Org Inventory.
2. Enter an org with ~10 active repos (e.g. `vercel`, `nextauthjs`, or similar).
3. Verify the pre-filter checkboxes appear (FR-036): "Exclude archived repos" and "Exclude forks", both **checked by default**.
4. Toggle "Include archived" off and on; verify the repo count updates accordingly.

**Pass criteria**: Pre-filters visible, defaults correct, repo count reflects filter state.

---

## 3. Trigger an aggregation run

1. Click "Analyze all active repos".
2. **If the org has < 25 repos** (configurable threshold — `largeOrgWarningThreshold` in `lib/config/org-aggregation.ts`): the run starts immediately.
3. **If ≥ 25 repos**: the pre-run warning dialog appears (FR-017c) showing repo count, ETA, the tab-open requirement, the concurrency control (1–10, default 3), and the completion-notification opt-in. Confirm to proceed.
4. The UI auto-navigates to the Org Summary view (FR-016).

**Pass criteria**: Auto-navigation works; for large orgs the dialog appears and lets you choose concurrency before starting.

---

## 4. Watch the live run

In the Org Summary view, verify simultaneously:

- **Run-status header (FR-017a)** shows total / succeeded / failed / in-progress / queued counts that update as repos complete.
- **Per-repo status list (FR-005a)** is sorted alphabetically with status badges; entries flip from `queued` → `in-progress` → `done` (or `failed`) in alphabetical position, NOT in completion order.
- **Progress indicators (FR-017d)** — the bar, the elapsed/remaining timer, and the rotating quote (FR-017b, sourced from `lib/loading-quotes.ts`) all update on a wall-clock tick (≥ 1Hz), even between repo completions.
- **Aggregate panels** populate live per the configured cadence (default per-completion). Each panel that's mid-run shows "in progress (X of N)" (FR-017a / FR-016b).
- **Empty-state (FR-034)**: very early in the run, before any repo is `done`, every panel shows "Waiting for first result" — not "0", not skeleton bars.
- **Cancel button** (FR-031) is visible during the run.

If a repo fails, verify it appears in the per-repo list with its error reason (FR-005), the failed count in the header increments, and the run continues for the rest.

**Pass criteria**: All five bullets behave as described.

---

## 5. PR Test Plan signoff scenario (large org)

This is the manual test that fulfills SC-001. Per constitution v1.2 amendment, the signoff lives in the PR's `## Test plan` section, not in any in-repo file.

1. Pick a CNCF-sized org with ~50–70 repos. Konveyor (`konveyor`) is the canonical target from issue #212.
2. Trigger "Analyze all active repos". The pre-run warning appears (since N ≥ 25); proceed.
3. Let the run complete. Expect multi-minute duration.
4. If a rate-limit pause occurs (FR-032), verify the pause panel shows the correct kind (primary vs. secondary), a live countdown, and the auto-resume reduces effective concurrency (for secondary limits per FR-003e). Verify the "pauses so far: K" counter increments.
5. After completion, verify each of the 16 aggregate panels has either a final value or an explicit "unavailable" treatment (no zeros). Spot-check 2–3 against the per-repo data.
6. Click "Export → JSON" and "Export → Markdown" (FR-030). Open both; verify they include the run-status header, every panel, the consolidated missing-data panel, and the per-repo status list.
7. Verify the consolidated missing-data panel (FR-033) shows each `(repo, signal)` pair exactly once, with a reason.
8. Trigger Retry (FR-035) on any failed repo; verify it re-enters the queue and on success contributes to the aggregates.

**Pass criteria**: All eight steps complete. Record the org, repo count, total duration, pause count, and any failures in the PR Test Plan.

---

## Validation commands

Before opening the PR:

```bash
npm test               # Vitest unit + integration
npm run test:e2e       # Playwright E2E (one happy-path scenario for this feature)
npm run lint
DEV_GITHUB_PAT= npm run build   # production build (DEV_GITHUB_PAT must be unset)
```

All four must pass.
