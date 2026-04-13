# Research: Inclusive Naming Analysis

**Feature**: 129-inclusive-naming
**Date**: 2026-04-12

## R1: GraphQL Fields Availability

**Decision**: Add `defaultBranchRef { name }` and `repositoryTopics(first: 20) { nodes { topic { name } } }` to the existing `REPO_OVERVIEW_QUERY`.

**Rationale**: Both fields are part of the GitHub GraphQL `Repository` type and can be fetched in the same overview query that already runs. No additional API call needed. The `defaultBranchRef` selection already exists in `REPO_COMMIT_AND_RELEASES_QUERY` for commit history — we just need the `name` field added to the overview query. Topics are capped at 20 (GitHub's own UI limit) which is sufficient.

**Alternatives considered**:
- Fetching topics via REST API: Rejected — would add an extra HTTP call and violate the "GraphQL first" principle (Constitution III.3).
- Reading branch name from the commit query: Possible but fragile — the overview query is the natural place for repo metadata.

## R2: Whole-Word Matching Strategy

**Decision**: Use word-boundary regex (`\b`) for scanning descriptions. Use exact match for topics (topics are discrete labels, not free text).

**Rationale**: Word-boundary matching prevents false positives like "mastery" matching "master" or "tribal" matching "tribe". Topics are already tokenized labels so exact match is correct. Case-insensitive matching for descriptions since terms may appear in any case.

**Alternatives considered**:
- Substring matching: Rejected — too many false positives.
- NLP tokenization: Rejected — over-engineering for the current scope (Constitution IX.7).
- Exact match for descriptions: Rejected — terms may appear with surrounding punctuation.

## R3: Tier-Based Penalty Weights

**Decision**: Within the metadata check (30% of inclusive naming sub-score), each flagged term applies a penalty proportional to its tier severity. Score starts at 1.0 and is reduced per term:
- Tier 1: -0.25 per term (full penalty)
- Tier 2: -0.15 per term (moderate penalty)
- Tier 3: -0.10 per term (minor penalty)

Floor at 0.0. The branch name check (70% of sub-score) is binary: 1.0 if not `master`, 0.0 if `master`.

**Rationale**: Tier 1 terms carry the INI's strongest recommendation ("adopt immediately") and should have the most impact. Multiple flagged terms accumulate but cannot go below 0. The 70/30 split between branch name and metadata reflects that the branch name is the single most visible and impactful signal.

**Alternatives considered**:
- Equal weights across tiers: Rejected — doesn't reflect the INI's own urgency hierarchy.
- Multiplicative scoring: Rejected — harder to reason about and explain in tooltips.
- Binary pass/fail for all tiers: Rejected — loses granularity between a repo with one Tier 3 term vs. multiple Tier 1 terms.

## R4: Fallback When Inclusive Naming Data Unavailable

**Decision**: When `defaultBranchRef` is null (empty repo) or data is unavailable, fall back to the three-part Documentation composite (40/30/30 — current weights). Do not penalize repositories where inclusive naming cannot be assessed.

**Rationale**: Mirrors the existing fallback pattern in `score-config.ts` where licensing data unavailability triggers a two-part fallback (60/40). Empty repos shouldn't be penalized for a check that can't run.

**Alternatives considered**:
- Treat unavailable as failing: Rejected — violates Constitution II.2 (no fabrication, missing data is first-class).
- Always include with neutral score: Rejected — inflates scores for repos where the check didn't actually run.
