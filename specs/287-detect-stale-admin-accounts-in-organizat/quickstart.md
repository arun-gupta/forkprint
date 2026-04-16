# Quickstart — Stale Admin Detection (#287)

How to develop, run, and verify the feature in under 10 minutes.

## Prerequisites

- Repo cloned; on branch `287-detect-stale-admin-accounts-in-organizat`.
- Node + npm installed; deps already via `npm install`.
- Dev server is already running on **port 3010** (claude-worktree managed).
- `.env.local` contains `GITHUB_CLIENT_ID` + `GITHUB_CLIENT_SECRET`, or `DEV_GITHUB_PAT` for the multi-worktree bypass (see `docs/DEVELOPMENT.md`).

## Run the feature locally

1. Confirm the dev server is listening:
   ```bash
   lsof -iTCP:3010 -sTCP:LISTEN
   ```
2. Open `http://localhost:3010/`.
3. **Baseline path** — sign in with the opt-in checkbox **unchecked**. Analyze an org (e.g. `kubernetes`, `nodejs`, `vercel`). On the org-summary view, scroll to the Governance bucket and verify:
   - "Org admin activity" panel renders.
   - Mode indicator reads **"Baseline — public admins only"**.
   - Admin rows show classifications: `active`, `stale`, `no public activity`, or `unavailable`.
   - Tooltip / affordance discloses the active threshold (e.g. "90 days"), public-only scope, and eventual-consistency note.
4. **Elevated path** — sign out, check the opt-in checkbox on the landing page, sign in (GitHub will re-prompt for broader scope). Analyze the **same** org (ideally one you belong to):
   - Mode indicator reads **"Elevated — includes concealed admins"** when you are a member.
   - Mode indicator reads **"Elevated — grant did not widen this view"** when you are not a member (FR-017).
5. **N/A path** — analyze a repo owned by a user account (e.g. `arun-gupta/repo-pulse`). Verify the panel renders a clear "not applicable for non-organization targets" state.

## Run tests

```bash
# Unit (classifier, config validator, aggregator, panel rendering)
npx vitest run lib/governance/stale-admins.test.ts \
               lib/config/governance.test.ts \
               lib/org-aggregation/aggregators/stale-admins.test.ts \
               components/org-summary/panels/StaleAdminsPanel.test.tsx

# Full unit suite (regression)
npm test

# E2E (landing page checkbox + org view rendering)
npx playwright test e2e/stale-admins.spec.ts

# Lint + build
npm run lint
DEV_GITHUB_PAT= npm run build
```

`DEV_GITHUB_PAT= npm run build` is required because `next build` runs in `NODE_ENV=production` and the app asserts `DEV_GITHUB_PAT` is unset in production contexts.

## Definition of Done (copy into PR body Test plan)

- [ ] Baseline path: publicly-listed admins render with classifications and threshold tooltip
- [ ] Baseline path: "no public activity" is visually distinct from "stale"
- [ ] Elevated path: checkbox appears on landing page, OAuth request includes `read:org`
- [ ] Elevated-effective path: concealed admins visible when analyzing an org you belong to
- [ ] Elevated-ineffective path: disclosure text renders when grant did not widen the view
- [ ] Non-org target: panel shows N/A state
- [ ] Admin-list fetch failure: panel shows unavailable state with reason
- [ ] Per-admin activity-fetch failure does not block other admins
- [ ] Threshold is read from `lib/config/governance.ts` — no literals in logic or render
- [ ] Tooltip reflects threshold value when it changes in config
- [ ] Scoring: feature does NOT change the composite OSS Health Score
- [ ] `npm test` green
- [ ] `npx playwright test` green
- [ ] `npm run lint` clean
- [ ] `DEV_GITHUB_PAT= npm run build` succeeds
- [ ] `docs/DEVELOPMENT.md` Phase 2 table updated

## Troubleshooting

- **GitHub re-prompts on every sign-in with checkbox**: expected the first time scope expands. On subsequent sign-ins with the box checked, GitHub remembers the previous consent.
- **Elevated mode but still no concealed admins**: confirm the signed-in user is a member of the target org. Non-members cannot see concealed members regardless of scope (GitHub-side constraint; disclosed in the UI).
- **Rate-limit (403) on commit search**: the fallback uses `/search/commits` (30 req/min). Reduce concurrency or wait 1 minute. The feature renders `unavailable` with reason `rate-limited` — no silent retries.
- **Threshold configuration rejected**: value must be exactly one of `30, 60, 90, 180, 365`. The build fails at compile time if the constant is set to any other value; runtime validation in `isValidStaleAdminThreshold` catches dynamic inputs.
