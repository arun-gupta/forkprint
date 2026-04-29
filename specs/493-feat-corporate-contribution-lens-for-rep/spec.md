# Feature Specification: Corporate Contribution Lens for Repos Tab

**Feature Branch**: `493-feat-corporate-contribution-lens-for-rep`  
**Created**: 2026-04-29  
**Status**: Draft  
**Input**: User description: "493"

## User Scenarios & Testing *(mandatory)*

### Background: how does company attribution work?

Two complementary signals are used to attribute a commit to a company, because employees contribute in different ways:

1. **Corporate email address** — the commit was authored using a work email (e.g., `jane@microsoft.com`). Matched by checking whether the commit author's email domain equals the company's email domain derived from the entered name.

2. **GitHub org membership** — the commit was authored by someone whose GitHub profile publicly lists the company's GitHub organization (e.g., `microsoft`) as one of their memberships. Matched by checking public org membership data already collected during analysis.

A commit is attributed to the company if it matches **either** signal. Each commit is counted at most once. Because the two signals use different author identifiers (GitHub login vs. email address), a developer who appears under both identifiers across their commits may be counted as two separate authors — this is a known heuristic limitation that must be disclosed.

Neither signal is complete on its own: some employees use personal emails without public org membership; others use personal emails with public org membership; others use corporate emails. Using both signals automatically gives the best coverage without requiring the user to understand the difference.

---

### User Story 1 — See my company's contribution across a set of repos I care about (Priority: P1)

A developer at a company has entered a set of repositories into RepoPulse — for example, a selection of upstream open-source projects their team depends on or contributes to. After the analysis runs, they want to answer: **"How many commits and contributors from my company are in each of these repos?"**

They type their company name (e.g., `microsoft`) into a single corporate filter field. The system automatically applies both attribution signals — matching commits by corporate email domain and by public GitHub org membership — without requiring the user to know the difference. The results view updates to show, for each analyzed repo, how many commits and unique contributors are attributable to their company, and what percentage of total commits that represents.

**Why this priority**: This is the entire purpose of the feature. The repo list is the starting point — the user picks the repos they care about, not a GitHub org's full inventory.

**Independent Test**: Enter 3 or more repos, run analysis, type a company name in the filter, verify that the per-repo corporate columns appear with plausible values and that clearing the filter removes those columns.

**Acceptance Scenarios**:

1. **Given** a set of repos has been analyzed, **When** the user types a company name (e.g., `microsoft`) into the single corporate filter field, **Then** a per-repo table appears showing "Corporate commits", "Corporate authors", and "Corporate %" for each analyzed repo, combining both email domain and org membership attribution automatically.

2. **Given** the corporate filter has a value, **When** a repo has no commits matching either attribution signal, **Then** that repo shows `0` for corporate commits, `0` for corporate authors, and `0%` for corporate % — not an error or blank cell.

3. **Given** the user types the company name in any capitalisation (e.g., `Microsoft` or `MICROSOFT`), **When** the table renders, **Then** results are identical to typing it in lowercase — matching is case-insensitive.

4. **Given** the corporate filter field is cleared, **When** the input is empty, **Then** the per-repo corporate columns are hidden and the results view returns to its default state.

---

### User Story 2 — Summary totals across all entered repos (Priority: P2)

After entering a company name, the user wants a single summary row showing the totals across all analyzed repos — corporate commits, unique corporate contributors, and overall corporate % — so they can answer "across this whole set of repos, how much is my company contributing?" at a glance.

**Why this priority**: Valuable summary, but depends on the per-repo table (P1) being present first.

**Independent Test**: With a company name entered and at least one repo showing non-zero corporate data, a summary row appears showing summed values, with unique authors de-duplicated across repos.

**Acceptance Scenarios**:

1. **Given** the per-repo corporate table is visible, **When** the user reads the summary row, **Then** it shows the sum of corporate commits across all repos, the count of unique corporate author identities (de-duplicated across repos), and the overall corporate % (corporate commits / total commits across all repos).

2. **Given** no repo has any commits matching the entered signals, **When** the summary row renders, **Then** it shows `0`, `0`, and `0%` — not an error.

---

### User Story 3 — Results stay consistent with the active time window (Priority: P3)

The corporate contribution numbers must reflect the same time window (30d / 60d / 90d / 180d / 12m) as the rest of the analysis, so the user is not comparing corporate data against a different period than the other metrics.

**Why this priority**: Consistency with existing time-window controls is a correctness requirement, not a nice-to-have.

**Independent Test**: Change the time-window selector while a corporate filter is active; verify all three corporate columns update to reflect the new window.

**Acceptance Scenarios**:

1. **Given** a corporate filter is active with the 90d window selected, **When** the user switches to 30d, **Then** all corporate metrics update to reflect the 30d window.

2. **Given** a corporate filter is active with the 30d window, **When** the user switches to 12m, **Then** corporate commit and author counts may increase (more historical data is included).

---

### Edge Cases

- What if the entered company name matches no commits in any repo? → All repos show 0 / 0 / 0%; summary row shows 0 / 0 / 0%.
- What if attribution data is fully unavailable for a repo (neither email nor org data was collectible)? → All three corporate columns show "—", never `0`.
- What if one signal is available and the other unavailable for a repo? → The available signal is used; "—" is only shown when both are unavailable.
- What if a developer's commits appear under both a GitHub login key and an email key across different commits? → They may be counted as two separate "corporate authors" — this is disclosed in the UI caveat.
- What if the user types a company name that could map to multiple email domains (e.g., a company with regional domains like `company.de`, `company.fr`)? → Only the derived primary domain (based on the entered name) is matched. Multi-domain coverage is out of scope.
- Only one repo is analyzed? → The per-repo table has a single row and the summary row shows the same values.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The results view for a manually-specified repo set MUST provide a single **"Company"** text input field. The user types their company name or identifier (e.g., `microsoft`). The field MUST have a placeholder that makes clear a company name is expected (not an email address, not a URL).
- **FR-002**: Matching MUST be case-insensitive.
- **FR-003**: From the single entered value the system MUST automatically derive two attribution signals and apply both:
  - **Org signal**: treat the entered value (lowercased, with any trailing domain suffix such as `.com` / `.io` / `.org` stripped) as a GitHub org handle and match commits from authors who publicly list that org.
  - **Email signal**: treat the entered value as an email domain and match commits whose author email ends with `@<value>` (lowercased). If the entered value has no dot (e.g., `microsoft`), also try `<value>.com` as the email domain.
- **FR-004**: When the filter field is non-empty, a per-repo corporate contribution table MUST appear showing three columns for each analyzed repo: "Corporate commits", "Corporate authors", and "Corporate %".
- **FR-005**: "Corporate commits" MUST be the count of commits in the active time window that match at least one active signal. Each commit is counted at most once. Org membership data is already collected during analysis; no new GitHub API calls are triggered when the user types in the filter.
- **FR-006**: "Corporate authors" MUST be the count of unique committer actor keys that contributed at least one corporate commit in the active time window. De-duplication is by actor key within a repo and across the summary row.
- **FR-007**: "Corporate %" MUST be computed as (corporate commits / total commits in the active window) × 100, rounded to one decimal place.
- **FR-008**: When attribution data is fully unavailable for a repo, all three corporate columns for that repo MUST display "—", never `0`.
- **FR-009**: When one signal is available and the other unavailable for a repo, the available signal MUST be used and the result displayed normally (no "—").
- **FR-010**: A summary row MUST appear below the per-repo table showing: (a) total corporate commits across all repos, (b) unique corporate author keys de-duplicated across all repos, (c) overall corporate % (total corporate commits / total commits across all repos with available data).
- **FR-011**: When the filter field is empty, the corporate columns and summary row MUST be hidden; the results view returns to its default state.
- **FR-012**: All corporate metrics MUST reflect the same time window as the rest of the analysis; changing the time-window selector MUST update the corporate columns.
- **FR-013**: The corporate contribution section MUST be rendered inside the existing Experimental UI boundary and MUST include a visible caveat covering: (a) email matching misses employees who commit with personal emails; (b) org matching misses employees whose GitHub org membership is private; (c) a developer whose commits appear under both a login-based and email-based identifier may be counted as two separate authors.

### Key Entities

- **Corporate filter**: A single text input where the user types their company name (e.g., `microsoft`). The system automatically derives both an org handle and an email domain from this single value and applies both attribution signals.
- **Per-repo corporate metrics**: Corporate commits, corporate authors, and corporate % for one analyzed repo within a given time window — derived from commit data and org membership data already collected during the analysis run, without new API calls at filter time.
- **Summary totals**: Aggregated corporate metrics across all analyzed repos, with author identities de-duplicated by actor key.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user who has analyzed a set of repos can type their company name into a single field and immediately see per-repo corporate contribution data without re-running the analysis.
- **SC-002**: Every analyzed repo shows a value (a count or "—") in each corporate column — no cell is blank or missing.
- **SC-003**: The summary row totals are consistent with the per-repo values (verifiable by manual addition), with unique authors correctly de-duplicated.
- **SC-004**: Clearing the company name field removes the corporate columns entirely and leaves the rest of the results view unchanged.
- **SC-005**: All corporate metrics update correctly when the time-window selector is changed.
- **SC-006**: The "—" unavailability indicator is always visually distinct from the number `0`.
- **SC-007**: The heuristic caveats are visible on the same surface as the corporate metrics — not hidden behind a collapsed section or tooltip.

## Assumptions

- Commit author email addresses and GitHub login names are already present in the commit data fetched during the standard analysis run. No additional API calls are required to evaluate either signal at filter time.
- Org membership data is already collected by the existing org-affiliation pipeline during the analysis run itself. No new API calls are triggered when the user types in the corporate filter.
- The org handle is derived from the entered value by lowercasing and stripping a recognised domain suffix (`.com`, `.io`, `.org`, `.net`, etc.) if present.
- The email domain is derived from the entered value as-is (lowercased) if it contains a dot, or as `<value>.com` if it does not.
- A "match" for the email signal: `authorEmail.toLowerCase().endsWith('@' + derivedDomain)`. Subdomains are not matched (e.g., `microsoft.com` does not match `@mail.microsoft.com`).
- A "match" for the org signal: the commit's GitHub login maps to a public org entry equal to the derived org handle (case-insensitive). Commits with no GitHub login (email-only actor key) are not evaluated against the org signal.
- "Corporate authors" de-duplication uses the actor key (`login:` or `email:`-prefixed). A developer appearing under both key types may be counted as two authors — this limitation is disclosed in the UI caveat.
- "Total commits" for the corporate % denominator uses the windowed commit count already present in each repo's analysis result. If unavailable for a repo, that repo's corporate % is also shown as "—".
- The feature applies to the repos input mode (manually specified repo list). It also applies in the foundation input mode when repos are individually analyzed. It is not limited to org-level scans.
- Sparkline / bar chart of corporate commits over time is out of scope — only tabular data.
- Multi-company comparison in a single view is out of scope.
