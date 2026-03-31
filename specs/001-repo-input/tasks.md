# Tasks: Repo Input (P1-F01)

**Branch**: `001-repo-input`
**Input**: `specs/001-repo-input/` (spec.md, plan.md, data-model.md, contracts/repo-input.md, research.md)
**TDD**: Mandatory — test tasks are written first. Tests MUST fail before implementation begins.

---

## Phase 1: Setup

**Purpose**: Initialize Next.js project and directory structure.

- [ ] T001 Initialize Next.js 14+ project with TypeScript and App Router at repo root (`npx create-next-app@latest . --typescript --tailwind --app --no-src-dir --no-import-alias`)
- [ ] T002 [P] Create `lib/` directory and `components/repo-input/` directory
- [ ] T003 [P] Create `e2e/` directory and configure Playwright (`npm install -D @playwright/test && npx playwright install`)
- [ ] T004 Install and configure Vitest + React Testing Library (`npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom`)
- [ ] T005 Add `vitest.config.ts` at repo root with jsdom environment and `@testing-library/jest-dom` setup

**Checkpoint**: `npm run dev` starts without errors. `npm test` and `npx playwright test` are runnable commands.

---

## Phase 2: Foundational

**Purpose**: Define the `ParseResult` type and file stubs that all user story tasks depend on.

- [ ] T006 Create `lib/parse-repos.ts` with exported `ParseResult` type and empty `parseRepos` stub that returns `{ valid: false, error: 'not implemented' }`
- [ ] T007 Create `components/repo-input/RepoInputForm.tsx` with exported `RepoInputForm` component stub (renders empty `<form>`)

**Checkpoint**: Project compiles with no TypeScript errors.

---

## Phase 3: User Story 1 — Enter repos and submit for analysis (Priority: P1) 🎯 MVP

**Goal**: User can enter valid repo slugs (newline, comma-separated, or GitHub URLs) and submit. Clean `string[]` is passed to `onSubmit`.

**Independent Test**: Render `<RepoInputForm onSubmit={fn} />`, enter `facebook/react`, submit — `fn` is called with `['facebook/react']`.

> **TDD: Write tests first — verify they FAIL before implementing.**

### Tests

- [ ] T008 [P] Write unit tests for `parseRepos` in `lib/parse-repos.test.ts`:
  - Single slug on one line → `['owner/repo']`
  - Multiple slugs on separate lines → array of slugs
  - Comma-separated slugs on one line → array of slugs
  - GitHub URL `https://github.com/owner/repo` → `['owner/repo']`
  - Mixed: slugs + URLs + comma-separated → all extracted correctly
  - Whitespace-padded slugs are trimmed
  - Blank lines are ignored
  - Duplicate slugs are deduplicated (case-sensitive, first occurrence preserved)

- [ ] T009 Write unit tests for `RepoInputForm` in `components/repo-input/RepoInputForm.test.tsx`:
  - Renders a textarea and submit button
  - `onSubmit` is called with correct `string[]` on valid input
  - `onSubmit` is not called when textarea is empty

- [ ] T010 Write E2E test (happy path) in `e2e/repo-input.spec.ts`:
  - User enters `facebook/react`, submits → `onSubmit` receives `['facebook/react']`
  - User pastes `https://github.com/facebook/react` → extracted and submitted as `facebook/react`

### Implementation

- [ ] T011 Implement `parseRepos` in `lib/parse-repos.ts`: split on newlines and commas, trim, drop blanks, extract GitHub URLs, validate slug pattern, deduplicate — return `ParseResult`
- [ ] T012 Implement `RepoInputForm` in `components/repo-input/RepoInputForm.tsx`: textarea, submit button, call `parseRepos` on submit, call `onSubmit(repos)` on `valid: true`
- [ ] T013 Implement home page `app/page.tsx`: render `<RepoInputForm onSubmit={...} />` (stub handler — full data fetching is P1-F04)

**Checkpoint**: All US1 tests pass. User can enter valid repos and submit from the home page.

---

## Phase 4: User Story 2 — Invalid input is caught before submission (Priority: P2)

**Goal**: Malformed slugs and empty submissions are blocked with an inline error. `onSubmit` is never called.

**Independent Test**: Render `<RepoInputForm onSubmit={fn} />`, submit empty textarea → inline error shown, `fn` not called.

> **TDD: Write tests first — verify they FAIL before implementing.**

### Tests

- [ ] T014 [P] Add unit tests to `lib/parse-repos.test.ts`:
  - Empty input → `{ valid: false, error: '...' }`
  - `react` (no owner) → `{ valid: false, error: '...' }`
  - `facebook/` (no repo) → `{ valid: false, error: '...' }`
  - `/react` (no owner) → `{ valid: false, error: '...' }`
  - Mix of valid and invalid → `{ valid: false, error: '...' }` (invalid slug identified)
  - Full GitHub URL with missing segments → `{ valid: false, error: '...' }`

- [ ] T015 Add unit tests to `components/repo-input/RepoInputForm.test.tsx`:
  - Empty submission → inline error rendered, `onSubmit` not called
  - Invalid slug submission → inline error rendered, `onSubmit` not called
  - Error clears on subsequent valid submission

- [ ] T016 Add E2E tests (validation) to `e2e/repo-input.spec.ts`:
  - Empty submit → inline error visible
  - Malformed slug → inline error visible
  - Fix input and resubmit → error gone, `onSubmit` called

### Implementation

- [ ] T017 Update `RepoInputForm` in `components/repo-input/RepoInputForm.tsx`: on `valid: false` from `parseRepos`, set error state and render inline error message below textarea
- [ ] T018 Ensure error state clears when a subsequent submission succeeds

**Checkpoint**: All US1 and US2 tests pass. Invalid input is blocked with an inline error.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [ ] T019 [P] Run full test suite (`npm test`) — all tests pass, no TODOs or `console.log` remaining
- [ ] T020 [P] Run linter (`npm run lint`) — clean
- [ ] T021 [P] Run E2E suite (`npx playwright test`) — all scenarios pass
- [ ] T022 Verify TypeScript strict mode — no untyped values (`npm run build`)
- [ ] T023 Update `specs/001-repo-input/checklists/requirements.md` — mark manual testing checklist complete
- [ ] T024 Commit feature branch and open PR against `main`

---

## Dependencies & Execution Order

- **Phase 1** → no dependencies, start immediately
- **Phase 2** → depends on Phase 1
- **Phase 3** → depends on Phase 2; tests written and failing before implementation
- **Phase 4** → depends on Phase 3 checkpoint passing
- **Phase 5** → depends on Phase 4 checkpoint passing

### Parallel Opportunities

- T002, T003 can run in parallel (different directories)
- T008, T009 can run in parallel (different files)
- T014, T015 can run in parallel (different files)
- T019, T020, T021 can run in parallel (read-only checks)

---

## Implementation Strategy

### MVP (User Story 1 only)

1. Phase 1: Setup
2. Phase 2: Foundational stubs
3. Phase 3: Tests → parser → form component → home page
4. **Validate**: US1 passes end-to-end
5. Proceed to Phase 4 only after MVP is confirmed

### TDD Reminder

Every phase with tests: write → confirm fail → implement → confirm pass. Never implement before the test exists and fails.
