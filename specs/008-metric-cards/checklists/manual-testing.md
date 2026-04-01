# Manual Testing Checklist: Metric Cards (P1-F07)

**Purpose**: Verify metric-card behaviour manually before PR submission  
**Feature**: [spec.md](../spec.md)

## Setup

- [x] Confirm an available token source exists (`.env.local` with `GITHUB_TOKEN` or a valid PAT entered in the UI)
- [x] Run `npm run dev` and confirm the app starts
- [x] Open `http://localhost:3000` in a browser

## US1 — Summary cards

- [x] Submit one valid public repository and confirm one overview card appears with stars, forks, watchers, created date, and ecosystem profile summary
- [x] Submit multiple valid public repositories and confirm one overview card appears per successful repository
- [x] Confirm failed repositories do not produce fabricated overview cards

## US2 — CHAOSS score badges

- [x] Confirm each overview card shows one placeholder badge for Evolution, Contribution Dynamics, and Responsiveness
- [x] Confirm each placeholder badge shows the CHAOSS category label along with the interim value `Not scored yet`
- [x] Confirm placeholder badge styling stays consistent across the three CHAOSS categories

## US3 — Expandable repo detail

- [x] Confirm a repo card can be expanded in place without leaving the `Overview` tab
- [x] Confirm expanding or collapsing a card does not rerun analysis or trigger a new request
- [x] Confirm expanded detail reveals fuller repo-specific metrics while preserving the rest of the workspace

## US4 — Explicit unavailable values

- [x] Confirm unavailable values remain explicitly marked in the summary card or expanded detail rather than hidden or guessed
- [x] Confirm ecosystem profile tiers reuse the same Reach / Builder Engagement / Attention semantics already shown in the overview spectrum section
- [x] Confirm multiple expanded cards remain usable in the current layout without breaking the shell

## Notes

_Sign off below when all items are verified:_

**Tested by**: Arun Gupta  **Date**: 2026-04-01
