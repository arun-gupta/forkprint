# Research: Export (P1-F13)

## Decision 1: Browser-side file download mechanism

**Decision**: Use the `URL.createObjectURL(blob)` + programmatic `<a>` click pattern — create a Blob, generate an object URL, click a temporary anchor element, then revoke the URL.

**Rationale**: Works in all modern browsers without server involvement. No new dependencies. Native to the browser. Both JSON and Markdown use the same pattern with different MIME types (`application/json`, `text/markdown`).

**Alternatives considered**:
- `window.open(dataURI)` — blocked by popup blockers in some browsers; not suitable.
- Server-side download route — unnecessary complexity; data is already client-side.
- `showSaveFilePicker` (File System Access API) — not supported in Firefox and requires user gesture; download link is simpler and universally supported.

---

## Decision 2: Clipboard API with fallback

**Decision**: Use `navigator.clipboard.writeText()` (async Clipboard API) as the primary path. If it throws or is unavailable (non-HTTPS, restricted context, or user denied permission), fall back to rendering the URL in a read-only `<input>` with a "Select all" hint so the user can copy manually.

**Rationale**: The Clipboard API is the modern standard and works on localhost and HTTPS. The fallback covers edge cases without requiring a third-party library.

**Alternatives considered**:
- `document.execCommand('copy')` — deprecated, not recommended by MDN.
- No fallback — violates FR-009 and breaks the feature for users in restricted contexts.

---

## Decision 3: Shareable URL encoding

**Decision**: Encode the repo list as a single `repos` query parameter with comma-separated slugs: `?repos=facebook/react,vercel/next.js`. Decode on mount in `RepoInputClient` to pre-populate the textarea.

**Rationale**: Simple, human-readable, bookmarkable. No base64 or JSON encoding needed — slugs use only URL-safe characters (alphanumeric, `/`, `-`, `_`). The `URLSearchParams` API handles encoding/decoding natively.

**Alternatives considered**:
- Repeated `?repo=...&repo=...` params — works but is more verbose and harder to read in the URL bar.
- Base64-encoded JSON — unnecessary complexity for simple slug lists.
- Hash fragment (`#repos=...`) — fragments are not sent to the server (good for auth) but are less consistently handled by bookmark managers and link previewers.

**Constraint**: Token is never encoded in the URL (constitution Rules III.7 and X.4). The recipient must sign in independently to run analysis.

---

## Decision 4: Markdown report structure

**Decision**: Single file, one `##` section per repository, with overall CHAOSS scores and key per-category metrics. Structure:

```markdown
# RepoPulse Health Report
Generated: 2026-04-06T18:00:00Z
Repositories: 2

---

## facebook/react

- **Stars**: 230,000
- **Primary language**: JavaScript
- **Description**: The library for web and native user interfaces

### Activity
- Score: High
- Commits (90 days): 142
- PRs merged (90 days): 89
- Releases (12 months): 24

### Sustainability
- Score: High
- Unique commit authors (90 days): 18
- Repeat contributors: 12

### Responsiveness
- Score: Medium
- Median issue first response: 4.2 hours
- Median PR merge time: 18.6 hours

### Missing Data
- None

---

## vercel/next.js

[same structure]
```

**Rationale**: One file per export with a timestamp in the filename (`repopulse-YYYY-MM-DD-HHmmss.md`) supports multiple exports in the same session. The structure mirrors the four CHAOSS categories displayed in the UI. `unavailable` fields are rendered as `N/A` in Markdown.

**Alternatives considered**:
- One file per repo — more files to manage; harder to share as a complete snapshot.
- CSV — explicitly out of scope.
- PDF — explicitly out of scope.

---

## Decision 5: Placement of ExportControls in the UI

**Decision**: Place `ExportControls` as a toolbar row inside `ResultsShell`'s result workspace section — rendered above the tabs when `analysisResponse` is non-null. Pass `analysisResponse` and `repos` (the current analyzed list) down from `RepoInputClient`.

**Rationale**: Export controls are only meaningful when results exist. Co-locating them with the results (above the tabs, in the results card) keeps the affordance close to the data. `RepoInputClient` already owns both `analysisResponse` and the repo list, so it's the natural place to assemble the props.

**Alternatives considered**:
- Export controls in the app header — too far from the data; always visible even without results.
- Export controls inside each tab — redundant across tabs; download should apply to all repos at once.
- Floating action button — accessible concern; a standard toolbar row is simpler and more discoverable.
