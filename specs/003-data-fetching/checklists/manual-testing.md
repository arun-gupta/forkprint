# Manual Testing Checklist: Data Fetching (P1-F04)

**Purpose**: Verify feature behaviour manually before PR submission
**Feature**: [spec.md](../spec.md)

## Setup

- [X] Confirm an available token source exists (`.env.local` with `GITHUB_TOKEN` or a valid PAT entered in the UI)
- [X] Run `npm run dev` and confirm the app starts
- [X] Open `http://localhost:3000` in a browser

Use one of these methods to inspect `/api/analyze` during the checks below:

- Browser Network tab: open DevTools, switch to `Network`, filter to `Fetch/XHR`, submit the form, then inspect the `POST /api/analyze` `Response` or `Preview`
- Terminal fallback: run

```bash
curl -s http://localhost:3000/api/analyze \
  -H 'Content-Type: application/json' \
  -d '{"repos":["facebook/react"],"token":"YOUR_TOKEN"}' | jq
```

## US1 — Fetch verified repo data

- [X] Submit one valid public repository and confirm analysis data returns
- [X] Submit multiple valid public repositories and confirm one result appears per successful repository
- [X] Confirm each successful `/api/analyze` result includes the required placeholders: `repo`, `name`, `description`, `createdAt`, `primaryLanguage`, `stars`, `forks`, `watchers`, `commits30d`, `commits90d`, `releases12mo`, `prsOpened90d`, `prsMerged90d`, `issuesOpen`, `issuesClosed90d`, `uniqueCommitAuthors90d`, `totalContributors`, `commitCountsByAuthor`, `issueFirstResponseTimestamps`, `issueCloseTimestamps`, `prMergeTimestamps`, and `missingFields`
- [X] Confirm unverifiable fields are surfaced as `"unavailable"` rather than omitted or guessed

## US2 — Partial failures do not block other results

- [X] Submit a mix of valid and invalid repositories and confirm successful repositories still return
- [X] Confirm the failed repository is surfaced separately with a repository-specific error
- [X] Confirm one failed repository does not corrupt or remove successful repository results

## US3 — Loading and rate-limit state

- [X] Confirm loading state is visible while analysis is in progress
- [X] Confirm remaining rate-limit information is visible when available
- [X] Confirm retry timing is visible when the request is rate limited and GitHub supplies it

## Notes

_Sign off below when all items are verified:_

**Tested by**: Arun Gupta  **Date**: 2026-03-31
