# Manual Testing Checklist: Missing Data & Accuracy (P1-F12)

**Purpose**: Sign-off before opening the PR  
**Feature**: [spec.md](../spec.md)  
**Signed off by**: arun-gupta  
**Date**: 2026-04-06

---

## Setup

- [X] App is running locally (`npm run dev`)
- [X] Signed in via GitHub OAuth

---

## Visual Spot-Check (real browser, real data)

Analyze any public repository with real data (e.g. `nvidia/topograph` or `facebook/react`).

### Overview tab
- [X] The word "unavailable" does not appear anywhere on screen

### Activity tab
- [X] The word "unavailable" does not appear anywhere on screen
- [X] Expanding the score help tooltip (ActivityScoreHelp) works and closes cleanly

### Responsiveness tab
- [X] The word "unavailable" does not appear anywhere on screen
- [X] Expanding the score help tooltip (ResponsivenessScoreHelp) works and closes cleanly

### Contributors tab
- [X] Elephant Factor and Single-vendor dependency ratio show `"—"` (not "unavailable") when org attribution has no data (e.g. `nvidia/topograph`)

---

> Inline `"—"` rendering, muted styling, absence of amber callout panels, zero vs dash distinction,
> and all build/lint/test gates are covered by automated tests and do not require manual verification.
