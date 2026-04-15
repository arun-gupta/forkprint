# Contract: `GET /api/org/pinned`

Stateless GraphQL passthrough that returns the org's pinned repositories from its GitHub profile page. Used to identify flagship repos (FR-011a).

## Request

```
GET /api/org/pinned?org=<slug>
```

| Param | Type | Required | Notes |
|---|---|---|---|
| `org` | string | yes | GitHub org login, e.g. `konveyor` |

Authentication: standard session OAuth (per constitution §III.4). No body.

## Response — 200

```json
{
  "pinned": [
    { "owner": "konveyor", "name": "konveyor", "stars": 4321, "rank": 0 },
    { "owner": "konveyor", "name": "tackle2-ui", "stars": 312, "rank": 1 }
  ]
}
```

| Field | Type | Notes |
|---|---|---|
| `pinned` | array | 0 to 6 entries; empty array means the org pins nothing or pins only gists |
| `pinned[].owner` | string | repo owner login (typically equal to `org` but can differ for re-org transitions) |
| `pinned[].name` | string | repo name |
| `pinned[].stars` | number \| `"unavailable"` | star count from `stargazerCount`; `"unavailable"` if the GraphQL field returns null |
| `pinned[].rank` | number | 0-based pin order from `Organization.pinnedItems` (preserved from the API) |

## Response — 4xx / 5xx

Standard error envelope used elsewhere in `app/api/`:

```json
{ "error": { "message": "…", "code": "…" } }
```

| Status | Meaning |
|---|---|
| 400 | `org` query param missing or empty |
| 401 | session not authenticated |
| 404 | org does not exist |
| 429 / 403 | rate-limited; client surfaces this through the standard rate-limit pause flow (FR-032) |
| 5xx | upstream GitHub error; client treats the run as unable to determine flagships and falls back to most-stars-in-run (FR-011a.b) |

## Backing GraphQL query

```graphql
query OrgPinnedRepos($login: String!) {
  organization(login: $login) {
    pinnedItems(first: 6, types: [REPOSITORY]) {
      nodes {
        ... on Repository {
          owner { login }
          name
          stargazerCount
        }
      }
    }
  }
}
```

`first: 6` matches the GitHub UI cap. `types: [REPOSITORY]` filters out pinned gists at the API layer — no client-side filtering required. Single GraphQL request per run; rate-budget impact is negligible (~1 point against the 5000/hr budget).

## Caching

None. Each run fetches fresh; pinned items can change between runs and the result is small (a few hundred bytes).

## Constitution alignment

- **§I stateless**: the route holds no state; it is a stateless passthrough.
- **§II accuracy**: `stars: "unavailable"` is honored explicitly when the GraphQL field is null.
- **§III data sources**: GraphQL primary source per §III.1.
