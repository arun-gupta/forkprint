# Quickstart — Selected-only filter toggle (issue #315)

Exercise the feature end-to-end on a running dev server.

## Preconditions

- `next dev` is running on an available port (this worktree uses **3010**).
- You are signed in (OAuth or `DEV_GITHUB_PAT`) so the org-inventory fetch succeeds.

## Happy path — audit a multi-page selection

1. Open `http://localhost:3010/` and enter an org slug that has more than one page of repos (e.g. `nvidia`, `microsoft`, `google`).
2. Click **Analyze org** and wait for the org-inventory view to render.
3. In the **Repositories** table, check four rows across at least two different pages (navigate pages with **Next** between checks).
4. Observe the header: `4 selected · N after filters`.
5. Turn on the new **Selected only** checkbox in the filter row.
6. **Expect**: the table collapses to exactly those 4 rows. Pagination shows page 1 of 1 (or however many pages the rows-per-page yields for 4 rows). The counter still reads `4 selected · ...`.
7. Uncheck one of the visible rows.
8. **Expect**: that row disappears immediately; counter drops to `3 selected`; the remaining 3 rows are still visible in sorted order.
9. Turn off **Selected only**.
10. **Expect**: the full (filtered + sorted) table reappears; the 3 still-selected rows remain checked wherever they appear.
11. Click **Analyze selected (3)**.
12. **Expect**: the org aggregation runs against the 3 repos.

## Empty-state — nothing selected

1. From the same inventory view, click **Clear** (or uncheck every row).
2. Turn on **Selected only**.
3. **Expect**: the table area shows the "no repositories are currently selected" message with an inline "turn off *Selected only*" affordance that restores the default view on click.

## Empty-state — all selections hidden by other filters

1. Select three repos; make sure at least one is archived and at least one is a non-archived Python repo.
2. Turn on **Selected only** — all three are visible.
3. Turn on the **No archived** checkbox AND set the **Language** dropdown to a language that none of your three selections use.
4. **Expect**: the table shows the "your current filters hide every selected repository" message with an inline "turn off *Selected only*" affordance.
5. Click the affordance.
6. **Expect**: filters stay as-is; `selectedOnly` becomes off; the table shows all matching repos under the other filters.

## Keyboard accessibility

1. With the filter row in focus, Tab to the **Selected only** checkbox.
2. Press Space.
3. **Expect**: the toggle changes state; assistive technology announces it as a checkbox with its new state.

## Regression checks

- With `selectedOnly` off: **Analyze all**, per-row "Analyze", **Analyze selected**, sort on every column, pagination, rows-per-page, and existing `No archived` / `No forks` all behave exactly as they did before the change.
