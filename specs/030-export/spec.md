# Feature Specification: Export

**Feature Branch**: `030-export`  
**Created**: 2026-04-06  
**Status**: Draft  
**Input**: User description: "Export analysis results as JSON, Markdown report, and shareable URL"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Download Full JSON Export (Priority: P1)

A signed-in user has completed an analysis and wants the raw data for programmatic use, archiving, or integration with other tools. They click a "Download JSON" button and receive a `.json` file containing the complete analysis results for all analyzed repositories.

**Why this priority**: Raw JSON is the most complete and lossless export format. It is the foundation the other export formats are derived from and delivers direct value to developers and data consumers.

**Independent Test**: Complete an analysis of one or more repos → click "Download JSON" → verify the file downloads and contains the full structured results.

**Acceptance Scenarios**:

1. **Given** a signed-in user has completed an analysis, **When** they click "Download JSON", **Then** a `.json` file is downloaded containing the complete `AnalysisResult[]` for all analyzed repositories.
2. **Given** the downloaded JSON, **When** inspected, **Then** it contains all CHAOSS metrics, scores, and metadata for each repo — no data is omitted or truncated.
3. **Given** multiple repos were analyzed, **When** the JSON is downloaded, **Then** all repos are included in the file as an array.

---

### User Story 2 - Download Markdown Report (Priority: P2)

A signed-in user has completed an analysis and wants a human-readable summary to share with their team, include in documentation, or attach to a pull request. They click "Download Markdown" and receive a `.md` file with a CHAOSS-aligned health report.

**Why this priority**: The Markdown report is the shareable, human-readable complement to the raw JSON and delivers value to non-technical stakeholders.

**Independent Test**: Complete an analysis → click "Download Markdown" → verify the file downloads with a readable CHAOSS-aligned structure.

**Acceptance Scenarios**:

1. **Given** a signed-in user has completed an analysis, **When** they click "Download Markdown", **Then** a `.md` file is downloaded containing a formatted health report.
2. **Given** the downloaded Markdown report, **When** inspected, **Then** it includes each repository name, CHAOSS category scores, key metrics, and a generated date.
3. **Given** multiple repos were analyzed, **When** the report is downloaded, **Then** each repo is represented as a distinct section within the same file.

---

### User Story 3 - Copy Shareable URL (Priority: P3)

A signed-in user wants to share their current repo selection with a colleague so the colleague can run the same analysis without manually re-entering the repository list. They click "Copy link" and the URL — encoding only the repo slugs, never the auth token — is copied to their clipboard.

**Why this priority**: The shareable URL enables collaboration by making the repo selection portable. It is lower priority because it does not include results (the recipient must re-run analysis) and depends on US1/US2 being complete first.

**Independent Test**: Enter repos → click "Copy link" → paste the URL into a new browser tab → verify the repo list is pre-populated and no token appears in the URL.

**Acceptance Scenarios**:

1. **Given** a signed-in user has entered one or more repos, **When** they click "Copy link", **Then** the URL is copied to the clipboard.
2. **Given** the copied URL, **When** opened in a new browser tab, **Then** the repo list input is pre-populated with the same repositories.
3. **Given** the copied URL, **When** inspected, **Then** it contains only the repo slugs as query parameters — the auth token is never included.
4. **Given** no repos have been entered, **When** the user clicks "Copy link", **Then** the URL encodes an empty or absent repo list parameter.

---

### Edge Cases

- What happens when analysis results contain errors for some repos? (JSON and Markdown should still export, with error status noted per repo.)
- What happens when the clipboard API is unavailable (non-HTTPS or restricted context)? (Show a fallback — display the URL in a text field for manual copy.)
- What happens when the repo list is very large and the URL exceeds browser length limits? (Show a warning; URL copy is best-effort.)
- What happens when the user tries to export before analysis is complete? (Export controls are disabled until results are available.)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Users MUST be able to download the complete analysis results as a JSON file from the results view.
- **FR-002**: The exported JSON MUST contain the full `AnalysisResult[]` structure for all analyzed repositories with no data omitted.
- **FR-003**: Users MUST be able to download a Markdown health report from the results view.
- **FR-004**: The Markdown report MUST follow a CHAOSS-aligned structure: one section per repository including category scores, key metrics, and a generated timestamp. Both the Markdown and JSON files MUST use a timestamped filename (`repopulse-YYYY-MM-DD-HHmmss.md` / `.json`) to avoid collisions when multiple exports are generated in the same session.
- **FR-005**: Users MUST be able to copy a shareable URL that encodes the current repository list as query parameters.
- **FR-006**: The shareable URL MUST NOT include the OAuth access token or any authentication credential.
- **FR-007**: Opening a shareable URL MUST pre-populate the repository list input with the encoded repos.
- **FR-008**: Export controls MUST only be enabled when analysis results are available.
- **FR-009**: If the clipboard API is unavailable, the app MUST fall back to displaying the URL in a selectable text field.

### Key Entities

- **AnalysisResult**: The structured output for a single analyzed repository — includes CHAOSS scores, metrics, metadata, and analysis timestamp.
- **Shareable URL**: A URL containing the repo list as query parameters (`?repos=owner/repo1,owner/repo2`) with no authentication data.
- **Markdown Report**: A human-readable `.md` file containing all analyzed repositories in a single file. One section per repository with CHAOSS-aligned headings, scores, and a generated timestamp. Filename format: `repopulse-YYYY-MM-DD-HHmmss.md`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can download a JSON export within 2 seconds of clicking the button for up to 10 analyzed repositories.
- **SC-002**: A user can download a Markdown report within 2 seconds of clicking the button for up to 10 analyzed repositories.
- **SC-003**: The shareable URL is copied to the clipboard in under 1 second of clicking "Copy link".
- **SC-004**: Opening a shareable URL pre-populates the repo list without any additional user action.
- **SC-005**: No authentication credential appears in any exported file or shareable URL under any circumstances.
- **SC-006**: Export controls are inaccessible until analysis results are present, preventing empty or partial exports.

## Assumptions

- Users are signed in via GitHub OAuth before accessing export functionality (auth is a prerequisite per constitution Rule III.4).
- Analysis results are held in-memory in the current session; exports represent a point-in-time snapshot and are not persisted.
- The JSON export mirrors the existing internal `AnalysisResult[]` shape without transformation.
- Shareable URLs encode repos using a `repos` query parameter with comma-separated slugs (e.g., `?repos=facebook/react,vercel/next.js`).
- PDF and CSV export are explicitly out of scope for this feature.
- Saved reports and report history are out of scope; exports are ephemeral browser downloads.
- The Markdown report is a single file per export containing all analyzed repos as sections. Structure: top-level header with generated timestamp, then one `##` section per repo with overall score and per-CHAOSS-category breakdown (score + key metrics). Filename format: `repopulse-YYYY-MM-DD-HHmmss.md` to support multiple exports in the same session.
- The JSON export filename follows the same convention: `repopulse-YYYY-MM-DD-HHmmss.json`.
