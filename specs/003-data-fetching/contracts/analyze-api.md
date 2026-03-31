# Contract: `POST /api/analyze`

## Request

```json
{
  "repos": ["owner/repo", "owner/repo"],
  "token": "ghp_example_optional"
}
```

### Rules

- `repos` is required and contains validated repository slugs
- `token` is optional in the request body
- server-side `GITHUB_TOKEN` takes precedence over `token` when configured
- token values are never returned in the response

## Response

```json
{
  "results": [
    {
      "repo": "owner/repo",
      "name": "repo",
      "description": "example",
      "createdAt": "2024-01-01T00:00:00Z",
      "primaryLanguage": "TypeScript",
      "stars": 10,
      "forks": 5,
      "watchers": 3,
      "commits30d": 7,
      "commits90d": 20,
      "releases12mo": 2,
      "prsOpened90d": 6,
      "prsMerged90d": 5,
      "issuesOpen": 4,
      "issuesClosed90d": 9,
      "uniqueCommitAuthors90d": 3,
      "totalContributors": 12,
      "commitCountsByAuthor": {
        "alice": 5,
        "bob": 2
      },
      "issueFirstResponseTimestamps": ["2026-03-01T00:00:00Z"],
      "issueCloseTimestamps": ["2026-03-02T00:00:00Z"],
      "prMergeTimestamps": ["2026-03-03T00:00:00Z"],
      "missingFields": []
    }
  ],
  "failures": [
    {
      "repo": "owner/missing-repo",
      "reason": "Repository could not be analyzed",
      "code": "NOT_FOUND"
    }
  ],
  "rateLimit": {
    "remaining": 1234,
    "resetAt": "2026-03-31T23:59:59Z",
    "retryAfter": "unavailable"
  }
}
```

### Rules

- `results` includes only successfully analyzed repositories
- `failures` includes only repository-specific failures
- `rateLimit` is surfaced when GitHub provides the data
- unverifiable fields inside `results` are the literal string `"unavailable"`
