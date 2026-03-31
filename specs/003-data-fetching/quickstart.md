# Quickstart: P1-F04 Data Fetching

## What's being built

The first real analysis pipeline for ForkPrint:
- submit validated repos from the home page
- fetch verified GitHub GraphQL data through `POST /api/analyze`
- return flat per-repo results plus isolated failures and rate-limit metadata

## Expected files

| File | Purpose |
|------|---------|
| `app/api/analyze/route.ts` | Server-side analysis endpoint |
| `lib/analyzer/analyze.ts` | Framework-agnostic analysis entry point |
| `lib/analyzer/github-graphql.ts` | GitHub GraphQL request helper |
| `lib/analyzer/queries.ts` | GraphQL query definitions |
| `lib/analyzer/analysis-result.ts` | Shared result types |
| `e2e/data-fetching.spec.ts` | End-to-end fetch scenarios |

## Verification

```bash
npm test
npm run lint
npm run test:e2e
```

## Manual verification

1. Start the app with a valid PAT or server-side `GITHUB_TOKEN`
2. Submit one valid public repo and confirm analysis results return
3. Submit multiple repos including one invalid repo and confirm successful repos still return
4. Confirm missing fields surface as `"unavailable"` where public data cannot verify them
5. Confirm loading state appears while analysis is running
6. Confirm rate-limit state is visible when supplied by the GitHub response
