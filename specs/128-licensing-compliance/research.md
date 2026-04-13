# Research: Licensing & Compliance Scoring

## R1: How to detect OSI-approved licenses from SPDX ID

**Decision**: Maintain a static lookup set of OSI-approved SPDX identifiers.

**Rationale**: The SPDX license list is stable (updated ~2x/year). A static set avoids runtime API calls and is trivially testable. GitHub's `licenseInfo.spdxId` returns the SPDX short identifier (e.g., `MIT`, `Apache-2.0`, `GPL-3.0-only`). Cross-referencing against the OSI list is a simple `Set.has()` check.

**Alternatives considered**:
- Fetching from SPDX API at runtime: Unnecessary network dependency for a slowly-changing list.
- Using GitHub's `licenseInfo.isSpdxApproved` field: This field does not exist in the GitHub GraphQL API.

## R2: How to classify license permissiveness tiers

**Decision**: Static mapping from SPDX ID to tier: `Permissive`, `Weak Copyleft`, `Copyleft`.

**Rationale**: The permissiveness classification is well-established and stable. Common mappings:
- **Permissive**: MIT, Apache-2.0, BSD-2-Clause, BSD-3-Clause, ISC, Unlicense, 0BSD, Zlib, BSL-1.0
- **Weak Copyleft**: MPL-2.0, LGPL-2.1-only, LGPL-2.1-or-later, LGPL-3.0-only, LGPL-3.0-or-later, EPL-2.0, CDDL-1.0
- **Copyleft**: GPL-2.0-only, GPL-2.0-or-later, GPL-3.0-only, GPL-3.0-or-later, AGPL-3.0-only, AGPL-3.0-or-later, EUPL-1.2, OSL-3.0

Licenses not in any tier default to `null` (unclassified) — the system reports OSI status separately.

**Alternatives considered**:
- Binary permissive/copyleft split: Too coarse. Weak copyleft (MPL, LGPL) has meaningfully different enterprise implications than strong copyleft (GPL, AGPL).
- Granular 5-tier model: Over-engineering for the current need.

## R3: How to detect DCO/CLA enforcement

**Decision**: Two-signal approach — commit trailer analysis + workflow file inspection.

### Signal 1: Signed-off-by commit trailers

**Approach**: Add the `message` field to the existing commit history query nodes. Check recent commits (last 100, already fetched in `REPO_COMMIT_AND_RELEASES_QUERY`) for `Signed-off-by:` trailers.

**Metric**: Ratio of recent commits containing `Signed-off-by:` trailers. A ratio above a configurable threshold (e.g., 0.8) indicates DCO enforcement.

**Cost**: Adding `message` to existing commit nodes increases payload size but requires no additional API call.

### Signal 2: Workflow file inspection

**Approach**: Query `.github/workflows/` directory contents via GraphQL `object(expression: "HEAD:.github/workflows")` tree query. Check YAML filenames and, where feasible, file content for known DCO/CLA action references:
- `apps/dco` (GitHub App)
- `probot/dco` (legacy)
- `cla-assistant/cla-assistant`
- `contributor-assistant/github-action`
- `dco-action`

**Cost**: One additional GraphQL request to fetch workflow directory tree + selective blob reads. This stays within the constitution's 1-3 requests guideline (the workflow query can be bundled with the overview query or run as a lightweight supplementary request).

**Alternatives considered**:
- REST API for workflow files: Constitution prefers GraphQL. REST is supplementary only.
- Checking only commit trailers: Misses projects that use CLA bots but don't require Signed-off-by.
- Checking only workflow files: Misses projects that enforce DCO via git hooks or policy without a bot.

## R4: Documentation bucket weight redistribution

**Decision**: Three-part model with weights: file presence 40%, README quality 30%, licensing compliance 30%.

**Rationale**: 
- Currently: file presence 60% + README quality 40%.
- Licensing compliance is a substantial new signal dimension (4 sub-signals) — deserves equal or near-equal weight to README quality.
- File presence drops from 60% to 40% because the license file check moves out of it (it was 20% of file presence, so effective loss is 12 percentage points, partially compensated by the 5 remaining files redistributing weights).
- 40/30/30 gives licensing meaningful impact (~4.5% of overall score = 30% of 15%) vs the current ~3%.

**Alternatives considered**:
- 50/25/25: Under-weights licensing signals.
- 33/33/34: Over-weights file presence relative to the richer licensing analysis.
- Keeping 60/40 and nesting licensing inside file presence: Buries licensing signals; defeats the purpose of the feature.

## R5: Impact on existing calibration data

**Decision**: Re-calibrate the `documentationScore` percentile sets in `calibration-data.json` after implementation.

**Rationale**: The composite formula changes (three-part model instead of two-part). Existing percentile anchors (p25/p50/p75/p90) were calibrated against the old formula. New anchors must be derived from real repository data using the updated formula.

**Approach**: Use the existing calibration sampling script (from issue #52 work) to re-sample repositories and compute new percentile distributions. This is a post-implementation calibration step, not a blocking dependency.

## R6: GraphQL query cost analysis

**Decision**: Acceptable — adds `message` field to existing commit nodes + one new tree query for workflow files.

**Details**:
- `message` on commit nodes: Already fetching 100 commit nodes. Adding `message` field is a trivial payload increase, no extra API call.
- Workflow tree query: `object(expression: "HEAD:.github/workflows") { ... on Tree { entries { name, object { ... on Blob { text } } } }` — one query, fetches all workflow file names and content.
- Can be combined into the existing `REPO_OVERVIEW_QUERY` to stay within the 1-3 request budget.
- Total: 0-1 additional API calls (0 if bundled into overview query).
