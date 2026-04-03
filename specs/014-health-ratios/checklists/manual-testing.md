# Manual Testing Checklist: Health Ratios (P1-F11)

**Purpose**: Verify Health Ratios behavior manually before feature signoff  
**Feature**: [spec.md](../spec.md)

## Setup

- [ ] Confirm an available token source exists (`.env.local` with `GITHUB_TOKEN` or a valid PAT entered in the UI)
- [ ] Run `npm run dev` and confirm the app starts
- [ ] Open `http://localhost:3000` in a browser

## Contributors Home View

- [ ] Submit one valid public repository and confirm the `Contributors` tab shows `Repeat contributor ratio` and `New contributor ratio`
- [ ] Confirm those two ratios appear in the contributor workspace without rerunning analysis
- [ ] Confirm unavailable contributor-composition ratios render explicitly as `unavailable` instead of `0%`

## Health Ratios Workspace

- [ ] Confirm the `Health Ratios` tab appears alongside the other top-level tabs after a successful analysis
- [ ] Confirm one grouped ratio section renders for each category:
- [ ] `Overview`
- [ ] `Contributors`
- [ ] `Activity`
- [ ] Confirm failed repositories remain in the existing failure surface and do not render fake Health Ratios rows

## Grouping And Sorting

- [ ] Confirm the `Overview` section appears before `Contributors`, and `Contributors` appears before `Activity`
- [ ] Confirm each section shows repository rows plus the expected ratio columns for that category
- [ ] Click at least one ratio header and confirm rows reorder locally without rerunning analysis
- [ ] Click the same ratio header again and confirm the sort direction reverses

## Tooltips And Definitions

- [ ] Confirm derived ratio headers show the visible info cue
- [ ] Confirm hovering or focusing the help affordance explains the ratio formula and meaning
- [ ] Confirm the contributor-ratio wording matches between the `Contributors` tab and the `Health Ratios` tab

## Unavailable Values

- [ ] Test a repository or result set with missing ratio inputs and confirm unavailable values render as `—` in `Health Ratios`
- [ ] Confirm unavailable values stay explicit in all three sections instead of disappearing or showing fabricated numbers

## Mobile And Readability

- [ ] Confirm the `Health Ratios` sections remain readable on a mobile-width viewport
- [ ] Confirm the tables can still be scanned horizontally without overlapping labels or clipped cells
- [ ] Confirm section descriptions and sort/help affordances remain readable on smaller screens

## Repo Coverage

- [ ] Test a high-activity public repo such as `facebook/react` and confirm all three sections remain readable end-to-end
- [ ] Test at least two repositories together and confirm sorting works meaningfully across repository rows

## Notes

_Sign off below when all items are verified manually:_

**Tested by**:   **Date**: 
