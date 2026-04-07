# Manual Testing Checklist: Missing Data & Accuracy (P1-F12)

**Purpose**: Sign-off before opening the PR  
**Feature**: [spec.md](../spec.md)  
**Signed off by**: <!-- GitHub username -->  
**Date**: <!-- YYYY-MM-DD -->

---

## Setup

- [ ] App is running locally (`npm run dev`)
- [ ] Signed in via GitHub OAuth

---

## US1 — Inline Unavailable Marking on MetricCard

Analyze a repo known to have missing fields (e.g. a private-fork repo where releases are unavailable).

- [ ] Stars, forks, or watchers that are unavailable display `"—"` (not the word "unavailable")
- [ ] The `"—"` is visually muted compared to numeric values (lighter color)
- [ ] A metric with value `0` displays `"0"` and is visually distinct from `"—"`
- [ ] No bold `"unavailable"` string appears anywhere in the metric card

---

## US2 — Consistent `"—"` Across All Views

Using the same repo result, check each tab:

### Overview tab
- [ ] All unavailable metric card stats show muted `"—"`
- [ ] No amber "Missing data" callout panel appears anywhere on the overview

### Activity tab
- [ ] Unavailable metric rows show `"—"` inline at the field
- [ ] No amber "Unavailable in selected window" callout panel appears
- [ ] Score tooltip (ActivityScoreHelp) still works if score inputs are missing

### Responsiveness tab
- [ ] Unavailable metric rows show `"—"` inline
- [ ] No amber "Unavailable responsiveness inputs" callout panel appears
- [ ] Score tooltip (ResponsivenessScoreHelp) still works

### Contributors tab
- [ ] Empty bar chart state shows `"—"` in muted style (not "unavailable" prose)
- [ ] No amber "Missing data" panel at the bottom of SustainabilityPane

### Health Ratios tab
- [ ] Unavailable ratio cells display `"—"` in muted slate color (not white/default)
- [ ] Non-unavailable cells display normally

### Comparison tab
- [ ] Unavailable comparison cells display `"—"` in muted slate color
- [ ] Non-unavailable cells display normally

---

## US3 — Analyzer Enforcement

- [ ] `npm test` passes with zero failures
- [ ] No field in `AnalysisResult` is set to a numeric value when the API response was missing that field (verified via test output)

---

## Build & Quality

- [ ] `npm test` passes
- [ ] `npm run test:e2e` passes
- [ ] `npm run lint` is clean
- [ ] `npm run build` succeeds with no errors
