# Manual Testing Checklist: Contributors (P1-F09)

**Purpose**: Verify Contributors-tab behavior manually before feature signoff  
**Feature**: [spec.md](../spec.md)

## Setup

- [x] Confirm an available token source exists (`.env.local` with `GITHUB_TOKEN` or a valid PAT entered in the UI)
- [x] Run `npm run dev` and confirm the app starts
- [x] Open `http://localhost:3000` in a browser

## Core Pane

- [x] Submit one valid public repository and confirm the `Contributors` tab appears immediately after `Overview`
- [x] Confirm the `Recent activity window` control shows `30d`, `60d`, `90d`, `180d`, and `365d`, with `90d` selected by default
- [x] Switch between multiple window presets and confirm the contributor-derived metrics update without rerunning analysis
- [x] Open `Contributors` for `facebook/react` and confirm the full-width `Contributor composition` card renders without triggering another analysis request
- [x] Confirm the `Contributor composition` card shows the `GitHub API contributors` label, the total contributor count, and the repeat / one-time / inactive breakdown in a single stacked graphic
- [x] Confirm the person-level contribution heatmap renders as compact bubbles and the `Show names` / `Show numbers` toggles work
- [x] Confirm the `Include bots in heatmap` toggle only affects the heatmap view and does not require rerunning analysis

## Sustainability Pane

- [x] Confirm the `Sustainability` pane shows a real score and threshold guidance for a repository with sufficient contributor-distribution data
- [x] Confirm the `Missing data` panel is hidden when no rendered Sustainability fields are missing
- [x] Confirm the `Top 20% contributor share` card consolidates the metric label, percentage, and supporting text like `47 of 234 active contributors`
- [x] Confirm `Maintainer count` and `Types of contributions` render when publicly verifiable
- [x] Hover `Maintainer count` and confirm the native tooltip explains how the metric was derived

## Experimental Metrics

- [x] Confirm the `Experimental` section shows `Elephant Factor` and `Single-vendor dependency ratio` with the warning copy intact
- [x] Confirm the Elephant Factor tooltip explains that higher is generally healthier and includes the attributed / unattributed author counts
- [x] Confirm the `CHAOSS Elephant Factor reference` link opens the CHAOSS metric page in a new tab
- [x] Confirm `Show heatmap` reveals the attributed-organization heatmap and that the darker bubbles correspond to the most attributed recent commits

## Repo Coverage

- [x] Test a normal repo such as `facebook/react` and confirm the Contributors tab remains readable end-to-end
- [x] Test a bot-heavy repo such as `kubernetes/kubernetes` and confirm the default view excludes detected bot accounts while `Include bots` reintroduces them
- [x] Test a repo with owner or maintainer files and confirm `Maintainer count` can be derived from supported sources such as `OWNERS`, `CODEOWNERS`, or `GOVERNANCE.md`

## Notes

_Sign off below when all items are verified manually:_

**Tested by**: arun-gupta  **Date**: 2026-04-02
