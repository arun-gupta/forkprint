# Manual Testing Checklist: Activity (P1-F08)

**Purpose**: Verify Activity-tab behavior manually before feature signoff  
**Feature**: [spec.md](../spec.md)

## Setup

- [x] Confirm an available token source exists (`.env.local` with `GITHUB_TOKEN` or a valid PAT entered in the UI)
- [x] Run `npm run dev` and confirm the app starts
- [x] Open `http://localhost:3000` in a browser

## Activity Workspace

- [x] Submit one valid public repository and confirm the `Activity` tab appears alongside `Overview` and `Contributors`
- [x] Confirm the top of the `Activity` tab shows `Commits`, `Pull requests`, `Issues`, and `Releases` before score-derived detail
- [x] Confirm grouped `Pull requests` and `Issues` cards do not repeat the same numbers in footer rows
- [x] Confirm the `Stale issue ratio` hover text explains the metric without hiding the primary value

## Recent Activity Window

- [x] Confirm the `Recent activity window` control shows `30d`, `60d`, `90d`, `180d`, and `12 months`, with `90d` selected by default
- [x] Switch between multiple window presets and confirm the displayed counts update locally without rerunning analysis
- [x] Confirm `Stale issue ratio`, `Median time to merge`, and `Median time to close` all change with the selected window
- [x] Confirm the `Activity` score in the `Activity` tab also changes with the selected window

## Activity Score

- [x] Confirm the `Activity` badge renders a real score when sufficient verified data exists
- [x] Confirm `How is Activity scored?` explains the selected window and does not repeat the live numbers already shown in the cards
- [x] Confirm the threshold help can be expanded and collapsed without affecting analysis state
- [x] Confirm the overview card still shows an Activity badge for the repository summary

## Missing Data

- [x] Confirm repos with partial activity data still show all available values instead of hiding the section
- [x] Confirm unavailable derived values remain explicitly marked as `unavailable`
- [x] Confirm the `Missing data` panel explains what is unavailable in the selected window
- [x] Confirm the missing-data callout also explains what inputs block the Activity score when scoring is insufficient

## Repo Coverage

- [x] Test a high-activity repo such as `facebook/react` and confirm the Activity tab remains readable end-to-end
- [x] Test a repo with partial publicly verifiable activity data and confirm the missing-data callout is shown without fabricating metrics

## Notes

_Sign off below when all items are verified manually:_

**Tested by**: arun-gupta  **Date**: 2026-04-02
