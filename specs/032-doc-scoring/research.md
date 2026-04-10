# Research: Documentation Scoring

## Decision 1: All-GraphQL approach for file checks and README content

**Decision**: Use GraphQL `repository.object(expression: "HEAD:filename")` aliases to check all 6 documentation files and fetch README content in a single GraphQL query — **zero additional API calls**.

**Rationale**: GraphQL aliases allow checking multiple file paths in one query. Each alias returns `null` (absent) or a `Blob` object (present). For README, we request `... on Blob { text }` to get content for section heading detection. For other files, `... on Blob { oid }` is sufficient (existence only). This is bundled into the existing overview query, adding no extra API calls or rate limit consumption.

**Query structure**:
```graphql
repository(owner: $owner, name: $name) {
  # README variants (with content for section detection)
  readmeMd: object(expression: "HEAD:README.md") { ... on Blob { text } }
  readmeLower: object(expression: "HEAD:readme.md") { ... on Blob { text } }
  readmeRst: object(expression: "HEAD:README.rst") { ... on Blob { text } }
  readmeTxt: object(expression: "HEAD:README.txt") { ... on Blob { text } }
  readmePlain: object(expression: "HEAD:README") { ... on Blob { text } }

  # LICENSE variants (existence only)
  license: object(expression: "HEAD:LICENSE") { ... on Blob { oid } }
  licenseMd: object(expression: "HEAD:LICENSE.md") { ... on Blob { oid } }
  licenseTxt: object(expression: "HEAD:LICENSE.txt") { ... on Blob { oid } }
  copying: object(expression: "HEAD:COPYING") { ... on Blob { oid } }

  # CONTRIBUTING variants
  contributing: object(expression: "HEAD:CONTRIBUTING.md") { ... on Blob { oid } }
  contributingRst: object(expression: "HEAD:CONTRIBUTING.rst") { ... on Blob { oid } }
  contributingTxt: object(expression: "HEAD:CONTRIBUTING.txt") { ... on Blob { oid } }

  # Single-name files
  codeOfConduct: object(expression: "HEAD:CODE_OF_CONDUCT.md") { ... on Blob { oid } }
  security: object(expression: "HEAD:SECURITY.md") { ... on Blob { oid } }

  # CHANGELOG variants
  changelog: object(expression: "HEAD:CHANGELOG.md") { ... on Blob { oid } }
  changelogPlain: object(expression: "HEAD:CHANGELOG") { ... on Blob { oid } }
  changes: object(expression: "HEAD:CHANGES.md") { ... on Blob { oid } }
  history: object(expression: "HEAD:HISTORY.md") { ... on Blob { oid } }
  news: object(expression: "HEAD:NEWS.md") { ... on Blob { oid } }

  # License type (built-in GitHub detection)
  licenseInfo { spdxId name }
}
```

**Alternatives considered**:
- Community Profile REST endpoint (`GET /repos/{owner}/{repo}/community/profile`) — covers 5 files in 1 REST call but still needs a 2nd REST call for README content. 2 extra calls vs 0.
- Individual Contents API calls — 6+ REST calls per repo, wasteful
- README REST API (`GET /repos/{owner}/{repo}/readme`) — handles variants automatically but costs 1 REST call

## Decision 2: License type recognition

**Decision**: Use the built-in GraphQL `licenseInfo { spdxId name }` field.

**Rationale**: GitHub already detects license types (MIT, Apache-2.0, GPL-3.0, etc.) and exposes the SPDX identifier via GraphQL. No need for REST or file content parsing.

## Decision 3: Rate limit impact

**Decision**: Zero additional API calls per repo.

**Rationale**: All documentation checks are bundled into the existing GraphQL overview query via aliases. The `object()` lookups and `licenseInfo` field add minimal query complexity. No REST calls needed.
