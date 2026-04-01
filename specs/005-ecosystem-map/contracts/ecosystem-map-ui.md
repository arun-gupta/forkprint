# UI Contract: Ecosystem Map

## Inputs

- Uses `AnalyzeResponse.results` from the existing client analysis state
- Uses no new API calls

## Required UI States

### No successful repos

- The ecosystem map section is hidden or replaced with a concise empty-state message
- Failed repositories remain displayed by earlier feature behavior

### Single successful repo

- Visible stars, forks, and watchers are shown for the repo
- The repo still receives a spectrum profile when verified ecosystem metrics exist

### Multiple successful repos

- Visible stars, forks, and watchers are shown for each successful repo
- Show one profile card per successful repo
- Show a config-driven ecosystem profile for each repo
- Show a legend explaining the Reach, Builder Engagement, and Attention bands from shared config

## Repository Detail Content

- Repo name
- Exact stars
- Exact forks
- Exact watchers
- Derived fork rate
- Derived watcher rate

## Unavailable Ecosystem Metrics

- If stars, forks, or watchers are `"unavailable"`, the visible metric row keeps the `"unavailable"` value explicit
- The spectrum profile does not invent a derived rate or tier for that repo
- The UI provides a concise note that the repo could not receive a full derived profile because ecosystem metrics were incomplete
