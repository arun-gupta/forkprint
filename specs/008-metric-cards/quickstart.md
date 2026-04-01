# Quickstart: Metric Cards

## Goal

Verify that the `Overview` tab renders one expandable metric card per successful repository and reuses the current ecosystem spectrum profile consistently.

## Local verification flow

1. Start the app:

   ```bash
   npm run dev
   ```

2. Open `http://localhost:3000`
3. Provide a valid token source:
   - set `GITHUB_TOKEN` in `.env.local`, or
   - enter a valid PAT in the UI
4. Submit one or more public repositories such as:

   ```text
   facebook/react
   kubernetes/kubernetes
   ```

## Expected behavior

- the `Overview` tab shows one card per successful repository
- each card shows exact stars, forks, watchers, created date, and the ecosystem profile summary
- each card shows three CHAOSS score badges with consistent color semantics
- expanding a card reveals fuller metric detail without rerunning analysis
- unavailable values remain explicit

## Verification commands

```bash
npm test
npm run lint
npm run test:e2e
```
