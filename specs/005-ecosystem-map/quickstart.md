# Quickstart: Ecosystem Map

## Goal

Verify that successful analysis results now render visible ecosystem metrics and the spectrum/profile visualization without additional fetching.

## Scenarios

### 1. Single successful repo

1. Run `npm run dev`
2. Analyze one public repository with a valid token source
3. Confirm:
   - stars, forks, and watchers are visible in the repo card
   - the UI shows a Reach / Builder Engagement / Attention spectrum profile for the repo

### 2. Multiple successful repos

1. Analyze two or more public repositories
2. Confirm:
   - each successful repo has visible ecosystem metrics
   - each successful repo appears as its own profile card
   - the spectrum legend is shown using config-defined bands
   - each repo surfaces a Reach / Builder Engagement / Attention profile

### 3. Incomplete ecosystem metrics

1. Simulate or mock a successful result with `"unavailable"` for stars, forks, or watchers
2. Confirm:
   - the visible metric row keeps `"unavailable"` explicit
   - the spectrum profile does not fabricate a derived rate or tier for that repo
   - the UI explains why the repo could not receive a full derived profile
