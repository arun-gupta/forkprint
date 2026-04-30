# Feature Specification: Structured Search Prefix Overhaul for Repos Tab

**Feature Branch**: `496-feat-structured-search-prefix-overhaul-f`  
**Created**: 2026-04-29  
**Status**: Draft  
**Input**: GitHub issue #496 — feat: structured search prefix overhaul for Repos tab

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Power user composes repo filters in one search bar (Priority: P1)

A user on the Repositories tab wants to narrow a large repo inventory quickly without opening several separate controls. They type composable structured filters such as `lang:go company:google stars:>500 archived:false` into the existing search bar and immediately see only matching repos.

**Why this priority**: This is the core value in issue #496. A single composable query surface replaces scattered one-off controls and enables combinations that the old UI cannot express cleanly.

**Independent Test**: Can be fully tested by loading the Repositories tab with mixed repo data, typing a multi-prefix query, and verifying that all included prefixes are applied simultaneously with correct matching results.

**Acceptance Scenarios**:

1. **Given** the Repositories tab contains repos with different languages, companies, and star counts, **When** the user enters `lang:go company:google stars:>500`, **Then** only repos matching all 3 filters remain visible
2. **Given** the user enters both structured prefixes and plain text, **When** the query is evaluated, **Then** the structured prefixes apply as filters and the remaining plain-text terms continue to match against the existing free-text search fields
3. **Given** the user clears the query, **When** the search resets, **Then** all repos become visible again and no prefix filter remains active
4. **Given** the existing `company:` prefix from issue #493, **When** this feature ships, **Then** `company:` continues to work unchanged as part of the generalized prefix parser

---

### User Story 2 - User replaces legacy filter controls with prefix syntax (Priority: P2)

A user who previously used separate controls for language, archived state, or fork inclusion now uses prefix syntax in the search bar instead, reducing permanent UI clutter while preserving the same filtering capability.

**Why this priority**: The UI simplification is the main product motivation behind the issue. The feature is incomplete if the old controls remain as parallel permanent chrome.

**Independent Test**: Can be fully tested by verifying that the designated legacy controls are removed from the Repositories tab and that equivalent behavior is available through the documented prefixes.

**Acceptance Scenarios**:

1. **Given** the Repositories tab previously exposed one-off language, archived, or fork-related controls, **When** this feature is enabled, **Then** those controls are removed from the permanent filter UI and their behavior is available via prefix syntax
2. **Given** a user needs to filter for non-archived repos, **When** they enter `archived:false`, **Then** the result matches the previous archived-state control behavior
3. **Given** a user needs to exclude forks, **When** they enter `fork:false`, **Then** only non-fork repos remain visible

---

### User Story 3 - User filters on repo metadata beyond the current zero-cost fields (Priority: P3)

A user needs to search on repository topics, license, visibility, size, or push recency using the same prefix grammar rather than waiting for a separate UI control for each field.

**Why this priority**: These prefixes are lower priority than the zero-cost replacements, but they prove the search syntax is a durable structured-query surface rather than a narrow patch for existing filters.

**Independent Test**: Can be fully tested by loading repo data that includes topics, license, visibility, size, and push dates, then verifying that each supported prefix filters correctly using the shared parser.

**Acceptance Scenarios**:

1. **Given** repo data includes topics, **When** the user enters `topic:kubernetes`, **Then** only repos with that topic remain visible
2. **Given** repo data includes license metadata, **When** the user enters `license:apache-2.0`, **Then** only repos with that license remain visible
3. **Given** repo data includes last-pushed timestamps, **When** the user enters `pushed:>2024-01-01`, **Then** only repos pushed after 2024-01-01 remain visible
4. **Given** repo data includes size and visibility, **When** the user enters `size:>10000 visibility:public`, **Then** only public repos larger than 10,000 KB remain visible

### Edge Cases

- What happens when a prefix key is unknown, misspelled, or unsupported? The query must not silently mis-filter repos; the UI should either ignore that token as plain text or surface it as invalid, but behavior must be deterministic and documented.
- What happens when a numeric prefix uses an invalid comparator or non-numeric value, such as `stars:abc` or `forks:>>10`? The invalid token must not produce fabricated matches.
- What happens when a date prefix uses a non-ISO or invalid date, such as `pushed:yesterday` or `pushed:2024-99-99`? The invalid token must not be treated as a successful date filter.
- What happens when a boolean prefix uses casing or synonyms, such as `archived:FALSE` or `fork:no`? Accepted forms must be explicitly defined and normalized consistently.
- What happens when a repo is missing optional metadata such as topic or license? That repo must not be treated as a positive match for the corresponding prefix.
- What happens when the query mixes several structured tokens and free text with extra whitespace? Parsing must remain stable and order-independent.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The Repositories tab MUST support a structured prefix query syntax in its existing search bar, where multiple `key:value` tokens can be combined in a single query and are applied conjunctively.
- **FR-002**: The generalized prefix parser MUST preserve support for the existing `company:` prefix introduced by issue #493.
- **FR-003**: The Repositories tab MUST continue to support plain-text search terms in the same query input; structured prefixes and free-text terms MUST work together in one query string.
- **FR-004**: The following zero-cost prefixes MUST be supported using already-fetched repo metadata: `lang:`, `archived:`, `stars:`, `forks:`, `watchers:`, `issues:`, `pushed:`, and `fork:`.
- **FR-005**: The following low-lift prefixes MUST be supported by extending the repo metadata fetch as needed: `topic:`, `size:`, `visibility:`, and `license:`.
- **FR-006**: Numeric prefixes (`stars:`, `forks:`, `watchers:`, `issues:`, `size:`) MUST support comparator syntax at minimum for exact match, greater-than, less-than, greater-than-or-equal, and less-than-or-equal.
- **FR-007**: Date prefixes (`pushed:`) MUST accept ISO date input (`YYYY-MM-DD`) and compare against the repo's verified last-pushed timestamp.
- **FR-008**: Boolean prefixes (`archived:`, `fork:`, `visibility:` if represented as a boolean-backed field) MUST define and document the accepted true/false values and normalize them case-insensitively.
- **FR-009**: Prefix matching MUST be composable and order-independent. `lang:go stars:>500` and `stars:>500 lang:go` MUST produce the same result set.
- **FR-010**: Repositories missing the underlying field for a given prefix MUST never be treated as positive matches for that prefix.
- **FR-011**: The Repositories tab MUST remove the one-off permanent filter controls that are superseded by the new structured prefixes, including the language dropdown and archived/fork-specific controls identified in the current UI.
- **FR-012**: The search UI MUST provide discoverability for the supported prefix syntax, including the list of available prefixes and enough examples for a user to compose a valid query without external documentation.
- **FR-013**: Invalid structured tokens MUST be handled deterministically without producing silent false matches or fabricated results.
- **FR-014**: The repo data layer MUST fetch any new GraphQL fields required for in-scope prefixes using verified GitHub metadata only, consistent with the constitution's accuracy policy.
- **FR-015**: Prefixes listed in issue #496 that require a separate new data pipeline (`contributors:`, `health:`, `cncf:`) are explicitly out of scope for this feature and MUST NOT be partially implemented behind fabricated or inferred values.

### Key Entities

- **Structured search token**: A parsed unit from the query bar representing either a prefixed filter (`key:value`) or a free-text term. Prefixed tokens map to a specific repo field and comparison rule.
- **Prefix definition**: A registry entry that declares a prefix key, the repo field it targets, the accepted value grammar, and the comparison behavior.
- **Repo search document**: The per-repo in-memory data shape used by the Repositories tab to evaluate free-text and structured filters against verified repo metadata.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can reproduce the current language, archived-state, and fork filtering behavior from the search bar alone, without using separate filter controls.
- **SC-002**: A multi-prefix query combining at least 3 prefixes and plain text returns the same result set regardless of token order.
- **SC-003**: All in-scope prefixes from issue #496 (`company`, zero-cost set, and low-lift GraphQL additions) have automated coverage for valid and invalid query forms.
- **SC-004**: No superseded Repositories-tab filter control remains permanently visible once equivalent structured-prefix behavior is available.
- **SC-005**: Repos with missing optional metadata are never incorrectly included in results for prefixes that depend on that metadata.

## Assumptions

- The Repositories tab already has a single search input and existing free-text matching behavior that this feature extends rather than replaces.
- Issue #493 has either already landed or its `company:` parser behavior will be folded into this feature as the baseline pattern to generalize.
- The feature applies only to the Repositories tab search experience; Organization, Foundation, and report-wide search surfaces are out of scope.
- The data fetch expansion needed for `topic:`, `size:`, `visibility:`, and `license:` remains lightweight and can be satisfied from verified GitHub metadata without introducing a new persistence layer or non-GitHub data source.
- Prefix discoverability can be satisfied in-product via placeholder text, helper text, tooltip, or an equivalent inline affordance; the exact presentation is a design choice for planning.
- Heavier prefixes proposed in the issue (`contributors:`, `health:`, `cncf:`) are intentionally deferred because they require new pipelines or external data beyond the scope of this issue.
