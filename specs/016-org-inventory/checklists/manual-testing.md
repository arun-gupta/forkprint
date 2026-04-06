# Manual Testing Checklist: Org-Level Repo Inventory (P1-F16)

**Purpose**: Verify organization-inventory behavior manually before feature signoff  
**Feature**: [spec.md](../spec.md)

## Setup

- [x] Confirm an available token source exists (`.env.local` with `GITHUB_TOKEN` or a valid PAT entered in the UI)
- [x] Run `npm run dev` and confirm the app starts
- [x] Open the local app in a browser

## Organization Mode

- [x] Confirm the top input workspace lets the user switch between `Repositories` and `Organization`
- [x] Switch to `Organization` and confirm the lower workspace also changes to an org-specific empty state instead of showing repo-analysis tabs
- [x] Confirm the primary action reads consistently for the selected workflow

## Org Submission

- [x] Submit a valid org slug such as `facebook` and confirm the inventory loads
- [x] Submit a valid org URL such as `https://github.com/facebook` and confirm it normalizes and loads the same org
- [x] Submit a bare GitHub host path such as `github.com/facebook` and confirm it normalizes and loads the same org
- [x] Confirm the `Organization` input mode remains selected after a successful org browse
- [x] Confirm the lower workspace uses the single `Overview` tab for org inventory results

## Summary Area

- [x] Confirm the org summary shows `Total public repos`, `Total stars`, `Active repos`, and `Archived repos`
- [x] Confirm the summary also shows `Most starred repos`, `Most recently active`, and `Language distribution`
- [x] Confirm the language-distribution card shows a compact top set by default and can expand/collapse with `Show more languages` / `Show fewer languages`

## Table Controls

- [x] Confirm repo-name filtering works locally without rerunning the org request
- [x] Confirm language filtering works locally without rerunning the org request
- [x] Confirm archived-status filtering works locally without rerunning the org request
- [x] Confirm `Rows per page` updates the table locally and resets to page 1
- [x] Confirm the visible-column chooser updates the table locally while keeping `Repository` visible

## Sorting And Pagination

- [x] Confirm every visible sortable column supports ascending and descending sort
- [x] Confirm sorting happens locally without rerunning the org request
- [x] Confirm `Previous` / `Next` navigation updates the current page locally
- [x] Confirm the table shows `Showing X-Y of Z matching repositories`
- [x] Confirm pagination still works correctly after filters or sorting change

## Selection And Analysis Handoff

- [x] Confirm row checkboxes allow selecting repositories for bulk analysis
- [x] Confirm the bulk-selection slider enforces the configured cap
- [x] Confirm lowering the slider below the current selected count trims selection deterministically and explains what happened
- [x] Confirm `Analyze` on a single row launches the existing repo-analysis flow for that repository
- [x] Confirm `Analyze selected` launches the existing repo-analysis flow for the chosen repositories

## Empty And Error States

- [x] Confirm an invalid organization shows a clear error state instead of a fake table
- [x] Confirm an organization with no public repositories shows the explicit empty state
- [x] Confirm filter combinations that remove every row show `No matching repositories`
- [x] Confirm missing per-row fields remain explicit instead of showing fabricated values

## Rate Limit And Mode Switching

- [x] Confirm remaining API-call information is visible at the bottom of the org inventory view
- [x] Confirm switching from `Organization` back to `Repositories` immediately hides the org inventory workspace
- [x] Confirm switching back to `Organization` restores the org-specific empty or loaded workspace without stale repo-analysis content

## Mobile And Readability

- [x] Confirm the org summary cards remain readable on a mobile-width viewport
- [x] Confirm the table remains scannable on mobile, including pagination and action controls
- [x] Confirm the action column does not waste excessive horizontal space relative to the data columns

## Repo Coverage

- [x] Test a large public org such as `nvidia` and confirm the inventory shows more than the first 100 repositories
- [x] Confirm a large org remains usable with filtering, pagination, and language-distribution expansion

## Notes

_Sign off below when all items are verified manually:_

**Tested by**: Arun Gupta  **Date**: 2026-04-05
