# Manual Testing Checklist: Responsiveness (P1-F10)

**Purpose**: Verify Responsiveness-tab behavior manually before feature signoff  
**Feature**: [spec.md](../spec.md)

## Setup

- [x] Confirm an available token source exists (`.env.local` with `GITHUB_TOKEN` or a valid PAT entered in the UI)
- [x] Run `npm run dev` and confirm the app starts
- [x] Open `http://localhost:3000` in a browser

## Responsiveness Workspace

- [x] Submit one valid public repository and confirm the `Responsiveness` tab appears alongside `Overview`, `Contributors`, and `Activity`
- [x] Confirm one Responsiveness section renders per successfully analyzed repository
- [x] Confirm failed repositories remain in the existing failure surface and do not render fake Responsiveness content
- [x] Confirm the top of the tab shows the `Recent responsiveness window` control before the per-repo sections

## Recent Responsiveness Window

- [x] Confirm the window control shows `30d`, `60d`, `90d`, `180d`, and `12 months`, with `90d` selected by default
- [x] Switch between multiple window presets and confirm the displayed Responsiveness metrics update locally without rerunning analysis
- [x] Confirm the `Responsiveness` score in the tab changes with the selected window
- [x] Confirm the missing-data callout updates with the selected window when some Responsiveness metrics are unavailable

## Pane Layout

- [x] Confirm the tab is organized into these panes:
- [x] `Issue & PR response time`
- [x] `Resolution metrics`
- [x] `Maintainer activity signals`
- [x] `Volume & backlog health`
- [x] `Engagement quality signals`
- [x] Confirm primary values remain visible directly in each pane without requiring tooltip interaction

## Tooltips And Derived Metrics

- [x] Confirm derived metrics such as `p90`, `issue resolution rate`, `contributor response rate`, `human first-response ratio`, `bot first-response ratio`, `stale issue ratio`, `stale PR ratio`, `PR review depth`, and `issues closed without comment` expose helpful tooltip text
- [x] Confirm tooltip text explains how the metric is calculated without hiding the primary value
- [x] Confirm simple counts such as `Open issues` and `Open PR backlog` remain readable without tooltip dependence

## Score And Help

- [x] Confirm the `Responsiveness` badge renders a real score when sufficient verified data exists
- [x] Confirm `How is Responsiveness scored?` explains the selected window and weighted categories
- [x] Confirm the threshold help can be expanded and collapsed without affecting analysis state
- [x] Confirm the overview card also shows a Responsiveness badge for the same repository

## Missing Data

- [x] Confirm repos with partial Responsiveness data still show all available values instead of hiding the section
- [x] Confirm unavailable derived values remain explicitly marked as `unavailable`
- [x] Confirm the `Missing data` panel explains what is unavailable in the selected window
- [x] Confirm the missing-data callout also explains what inputs block the Responsiveness score when scoring is insufficient

## Mobile And Readability

- [x] Confirm the Responsiveness panes remain readable on a mobile-width viewport
- [x] Confirm the window selector wraps cleanly on smaller screens
- [x] Confirm metric labels, tooltips, and the score/help panel remain readable without overlap or clipping

## Repo Coverage

- [x] Test a high-activity public repo such as `facebook/react` and confirm the tab remains readable end-to-end
- [x] Test a repo with partial publicly verifiable event data and confirm the missing-data callout is shown without fabricating metrics

## Notes

_Sign off below when all items are verified manually:_

**Tested by**: Arun Gupta  **Date**: 2026-04-03
