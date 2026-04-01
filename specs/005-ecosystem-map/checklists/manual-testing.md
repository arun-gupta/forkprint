# Manual Testing Checklist: Ecosystem Map (P1-F05)

**Purpose**: Verify ecosystem-map behaviour manually before PR submission  
**Feature**: [spec.md](../spec.md)

## Setup

- [x] Confirm an available token source exists (`.env.local` with `GITHUB_TOKEN` or a valid PAT entered in the UI)
- [x] Run `npm run dev` and confirm the app starts
- [x] Open `http://localhost:3000` in a browser

## US1 — Visible ecosystem metrics

- [x] Submit one valid public repository and confirm stars, forks, and watchers are visible outside the tooltip
- [x] Submit multiple valid public repositories and confirm each successful repo has visible stars, forks, and watchers
- [x] Confirm failed repositories do not produce fabricated visible ecosystem metrics

## US2 — Spectrum view

- [x] Confirm the `Ecosystem Map` tab shows the spectrum-based view without the old chart or quadrant display
- [x] Confirm one successful repo still renders as a useful spectrum/profile view when ecosystem metrics are available
- [x] Confirm multiple successful repos render one profile card per successful repository

## US3 — Ecosystem spectrum profile

- [x] Confirm the UI shows Reach / Builder Engagement / Attention profile tiers for successful repositories
- [x] Confirm the spectrum legends match the shared config-driven bands shown in the UI
- [x] Confirm the UI presents the spectrum profile as a ForkPrint interpretation aligned to CHAOSS, not official CHAOSS terminology

## US4 — Tooltip and derived-rate behavior

- [x] Confirm each repo card shows exact stars, exact forks, exact watchers, fork rate, and watcher rate when available
- [x] Confirm single-repo analyses still show a full spectrum profile when verified ecosystem metrics exist
- [x] Confirm repos with unavailable ecosystem metrics do not show fabricated rates or derived profile values

## Notes

_Sign off below when all items are verified:_

**Tested by**: Arun Gupta  **Date**: 2026-03-31
