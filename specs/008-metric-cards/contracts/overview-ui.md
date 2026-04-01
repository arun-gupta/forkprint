# Overview UI Contract: Metric Cards

## Overview tab

When one or more successful repositories exist:

- render one summary card per successful repository
- keep failed repositories in the existing failure section outside the cards
- do not fabricate cards for failures

When no successful repositories exist:

- show the existing overview empty/error state
- do not render placeholder repo cards

## Summary card content

Each collapsed card shows:

- repository slug/name
- exact stars
- exact forks
- exact watches/watchers
- created date
- ecosystem profile summary:
  - Reach
  - Builder Engagement
  - Attention
- three CHAOSS score badges:
  - Evolution
  - Contribution Dynamics
  - Responsiveness

## Score badge behavior

- badges must always show category label + score value
- badge colors remain consistent across all cards
- if a real category score is not yet available, the badge shows `Not scored yet`

## Expansion behavior

Clicking the card or its expand control:

- reveals fuller metric detail in place
- does not rerun analysis
- does not change tabs
- keeps unavailable values explicit

Expanded detail should prefer existing `AnalysisResult` fields such as:

- description
- primary language
- created date
- commit counts
- PR counts
- issue counts
- contributor counts
- missing-field list when helpful
