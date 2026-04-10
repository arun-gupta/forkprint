# Research: Documentation Scoring

## Decision 1: Data source for file presence checks

**Decision**: Use GitHub Community Profile endpoint (`GET /repos/{owner}/{repo}/community/profile`) for 5 of 6 files, plus GraphQL `repository.object()` for CHANGELOG variants.

**Rationale**: The community/profile endpoint returns presence data for README, LICENSE, CONTRIBUTING, CODE_OF_CONDUCT, and SECURITY in a single REST call — 5 files for the cost of 1 API call. CHANGELOG is not included in community/profile, so we check it via GraphQL `object(expression: "HEAD:CHANGELOG.md")` which can be bundled into the existing overview query at zero extra cost.

**Alternatives considered**:
- Individual Contents API calls (`GET /repos/{owner}/{repo}/contents/{path}`) — 6 REST calls per repo, wasteful
- All via GraphQL `object()` — works for existence but doesn't give license type or file metadata that community/profile provides
- GitHub Search API — too slow, not designed for per-file checks

## Decision 2: README content for section detection

**Decision**: Use GitHub README API (`GET /repos/{owner}/{repo}/readme`) to fetch base64-encoded README content, decode it, and scan for section headings via regex.

**Rationale**: The community/profile endpoint confirms README exists but doesn't return content. The README API returns the rendered content with proper encoding handling for all README variants (md, rst, txt). Section detection uses heading patterns (`## Installation`, `# Usage`, etc.).

**Alternatives considered**:
- GraphQL `object(expression: "HEAD:README.md")` — returns raw content but only for exact filename match, misses variants
- Contents API — equivalent to README API but requires knowing the exact filename

## Decision 3: Rate limit impact

**Decision**: 2 additional REST calls per repo (community/profile + readme content).

**Rationale**: With 5 tokens and round-robin, this adds negligible load. The community/profile call replaces what would be 5 individual file checks. CHANGELOG check is bundled into existing GraphQL at zero cost.

## Decision 4: CHANGELOG variant detection

**Decision**: Check multiple CHANGELOG variants via GraphQL `object()` aliases in the existing overview query:
- `CHANGELOG.md`, `CHANGELOG`, `CHANGES.md`, `HISTORY.md`, `NEWS.md`

**Rationale**: GraphQL aliases allow checking multiple paths in a single query. If any variant returns a non-null object, the file is considered present.

## Decision 5: License type recognition

**Decision**: Use the `license.spdx_id` field from the community/profile response to identify recognized licenses.

**Rationale**: GitHub already detects license types (MIT, Apache-2.0, GPL-3.0, etc.) and returns the SPDX identifier. No need to parse LICENSE file content ourselves.
