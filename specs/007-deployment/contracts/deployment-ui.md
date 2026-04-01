# Contract: Deployment UI Behavior

## Shared Deployment with `GITHUB_TOKEN`

- The repo input and Analyze flow remain visible
- The PAT input field is hidden
- The rest of the results shell continues to behave normally
- Analysis requests continue through the server-side token path without extra client setup

## Deployment without `GITHUB_TOKEN`

- The existing PAT flow remains available
- Missing-token validation still works as implemented in `P1-F02`

## Deployment Safety Rules

- No UI state reveals the actual token value
- No shareable URL or browser-visible field includes `GITHUB_TOKEN`
- Deployment-specific messaging must not imply a database or auth system exists
