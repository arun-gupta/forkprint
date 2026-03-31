# Feature Specification: Repo Input

**Feature ID**: `P1-F01`
**Feature Branch**: `001-repo-input`
**Created**: 2026-03-31
**Status**: Draft

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Enter repos and submit for analysis (Priority: P1)

A user arrives at the ForkPrint home page and wants to analyze one or more GitHub repositories. They type or paste repo slugs (or full GitHub URLs) into a textarea and submit.

**Why this priority**: This is the entry point to the entire application. Nothing else works without it.

**Independent Test**: Open the home page, enter a valid `owner/repo` slug or a full GitHub URL, submit — the input is accepted and passed to the data fetching layer.

**Acceptance Scenarios**:

1. **Given** the home page is loaded, **When** the user enters `facebook/react` on one line and submits, **Then** the value `facebook/react` is passed to the data fetching layer unchanged.
2. **Given** the home page is loaded, **When** the user enters `facebook/react, torvalds/linux` (comma-separated), **Then** both slugs are parsed and passed to the data fetching layer unchanged.
3. **Given** the home page is loaded, **When** the user enters three repos on separate lines, **Then** all three slugs are passed to the data fetching layer unchanged.
4. **Given** the home page is loaded, **When** the user pastes `https://github.com/facebook/react`, **Then** the slug `facebook/react` is extracted and passed to the data fetching layer.

---

### User Story 2 — Invalid input is caught before submission (Priority: P2)

A user enters a malformed slug (e.g., `react`, `facebook/`, `/react`) or submits an empty textarea. The error is shown inline without submitting.

**Why this priority**: Prevents bad data reaching the API and gives the user immediate, actionable feedback.

**Independent Test**: Enter a malformed slug and attempt to submit — an inline error appears and no submission occurs.

**Acceptance Scenarios**:

1. **Given** the textarea contains `react` (no owner), **When** the user submits, **Then** an inline error is shown and submission is blocked.
2. **Given** the textarea contains `facebook/` (no repo name), **When** the user submits, **Then** an inline error is shown and submission is blocked.
3. **Given** the textarea is empty, **When** the user submits, **Then** an inline error is shown and submission is blocked.
4. **Given** the textarea contains `  facebook/react  ` (padded with whitespace), **When** the user submits, **Then** whitespace is trimmed and the slug `facebook/react` is passed through as valid.
5. **Given** the textarea contains one valid and one invalid slug, **When** the user submits, **Then** the invalid slug is identified, an inline error is shown, and submission is blocked.

---

### Edge Cases

- What happens when the user pastes a full GitHub URL (`https://github.com/facebook/react`) instead of a slug? → The `owner/repo` slug is extracted automatically; the URL is not passed as-is to the data fetching layer.
- What happens when a line contains only whitespace? → Trimmed and ignored; not counted as a slug.
- What happens when the same repo is entered twice? → Duplicates are removed client-side before passing to the data fetching layer; only unique slugs are submitted.
- What happens with a slug that has valid format but does not exist on GitHub? → Accepted by this feature; existence validation is the responsibility of P1-F04.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The UI MUST provide a textarea that accepts one `owner/repo` slug per line.
- **FR-002**: The UI MUST also accept slugs entered as a comma-separated list on a single line.
- **FR-003**: The UI MUST extract the `owner/repo` slug from a full GitHub URL (`https://github.com/owner/repo`) — the extracted slug is treated identically to a directly entered slug.
- **FR-004**: The UI MUST trim leading and trailing whitespace from each slug before validation.
- **FR-005**: The UI MUST validate each slug against the `owner/repo` pattern (non-empty owner, `/`, non-empty repo name) before submission.
- **FR-006**: The UI MUST block submission and display an inline error when any slug fails validation.
- **FR-007**: The UI MUST block submission and display an inline error when the textarea is empty.
- **FR-008**: The UI MUST deduplicate slugs client-side — only unique slugs are passed to the data fetching layer.
- **FR-009**: The UI MUST pass all valid, deduplicated slugs to the data fetching layer unchanged after trimming.

### Key Entities

- **Repo slug**: A string in the form `owner/repo` identifying a GitHub repository. The atomic unit of input for this feature.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can enter one or more valid repo slugs and proceed to analysis without encountering a validation error.
- **SC-002**: 100% of malformed slugs are caught before submission — no invalid slug reaches the data fetching layer.
- **SC-003**: Validation feedback appears inline, immediately on submit attempt, without a page reload.
- **SC-004**: Whitespace-padded slugs are accepted and normalized transparently — users do not need to manually trim input.

---

## Assumptions

- Users are entering public GitHub repository slugs. Private repos are not blocked at input but may fail at the data fetching stage (P1-F04).
- Existence of the repo on GitHub is not validated here — that is the responsibility of P1-F04.
- The textarea is the only input mechanism — no autocomplete or repo browser is provided (explicitly out of scope).
- Deduplication is case-sensitive — `Facebook/React` and `facebook/react` are treated as distinct slugs.
- There is no cap on the number of repos per submission at this layer; any cap is enforced downstream in P1-F04.
