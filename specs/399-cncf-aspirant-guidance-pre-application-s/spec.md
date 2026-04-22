# Feature Specification: CNCF Aspirant Guidance (Pre-Application Sandbox Readiness)

**Feature Branch**: `399-cncf-aspirant-guidance-pre-application-s`  
**Created**: 2026-04-21  
**Status**: Draft  
**Input**: Issue #399 — CNCF aspirant guidance (pre-application sandbox readiness), part of P2-F06a (CNCF foundation support)

---

## Background

This spec is informed by analysis of real CNCF Sandbox applications: approved projects (gitvote/passed label) and rejected projects (gitvote/failed label) on github.com/cncf/sandbox. Key empirical learnings:

- **Adopters field is not a volume check — it is an engagement check.** Kagent and HolmesGPT had zero or near-zero public adopters and passed. Every rejected project left the field blank without comment. The signal is whether the field is addressed, not whether adoption is large.
- **TAG engagement is the single strongest differentiator.** KAITO had a weak governance setup but passed 6-0 because it had formal written TAG reviews and pre-vote presentations at TAG-Runtime and TAG-App-Delivery. All rejected projects had zero TAG engagement.
- **Cloud native overlap section quality is a primary rejection signal.** Rejected projects left it blank or vague. Approved projects named specific competing projects with feature-level distinctions.
- **Maintainer single-org concentration without explanation is a red flag.** KubeService Stack ("99% my code"), Loggie (two Netease employees), and Kubemarine (primarily internal NetCracker use) all failed.
- **IP/license issues are survivable with fast, transparent response.** KAI Scheduler faced a code-plagiarism allegation and passed 6-0 by publishing a rebuttal and fix within days. KubeService Stack did not respond and was rejected.
- **CNCF contacts accelerate review.** Projects with named TOC/staff contacts get faster reviews and more benefit of the doubt.
- **Release cadence and repo activity are checked externally by TOC reviewers.** RepoPulse has this data and should surface it proactively.
- **Release visibility matters as much as release frequency.** Reloader had 100+ commits and 60+ version tags (v1.0.57–v1.0.121) but was rejected 8-0 partly because a reviewer wrote "the repo appears less active." The tags were not surfaced as formal GitHub Releases with release notes, making the project look dormant. New projects (< 6 months old) with zero releases are held to a different standard — kagent (4 months old, 0 releases) and kgateway (3 weeks old as a rename) both passed.
- **The soft floor for mature projects is ~4 formal GitHub Releases per 12 months.** Loggie (3–4 releases/year) got 54% of TOC votes — tantalizingly close — but failed in a crowded logging space. Projects with 7+ releases/year showed no activity concerns in any review.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Declare CNCF Sandbox Target and See Field-by-Field Readiness (Priority: P1)

An OSS project maintainer wants to donate their project to CNCF as a Sandbox project. They open RepoPulse, analyze their repository, then use the new foundation target selector in the control bar to declare "CNCF Sandbox" as their target. Two things happen immediately: (1) a compact "CNCF Sandbox Readiness  X / 100" pill appears on the Overview tab alongside the existing score badges — clicking it navigates to the CNCF Readiness tab; (2) a "CNCF Readiness" tab appears in the tab strip. The CNCF Readiness tab contains the full pre-application readiness checklist organized into three sections: auto-detected fields (✅/⚠️/❌ with remediation hints and point impact), partially detectable fields (⚠️ with evidence surfaced for human confirmation), and human-only fields (plain to-do checklist). Separately, inline "CNCF Sandbox" badges appear next to relevant signals in the Documentation, Security, Contributors, and Activity tabs — this cross-tab behaviour is described in User Story 5.

**Why this priority**: This is the core value proposition of the feature. Without it, nothing else in the feature is useful.

**Independent Test**: Analyze any public repository, select "CNCF Sandbox" from the foundation target selector, and verify that the aspirant readiness panel appears with ✅/⚠️/❌ status and remediation hints per field.

**Acceptance Scenarios**:

1. **Given** a repo has been analyzed, **When** the user selects "CNCF Sandbox" from the foundation target selector in the control bar, **Then** a "CNCF Sandbox Readiness  64 / 100" pill appears on the Overview tab and a "CNCF Readiness" tab appears in the tab strip.
2. **Given** the user clicks the Overview pill, **Then** the "CNCF Readiness" tab is activated, showing "Targeting: CNCF Sandbox" as the header followed by the score and per-field checklist. (Inline CNCF badges in other tabs navigate within that tab — not to the CNCF Readiness tab; see User Story 5.)
3. **Given** the aspirant mode is active, **When** a repo has `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, and Apache 2.0 license, **Then** those fields show ✅ in the Foundation tab and the pill count reflects the passing fields.
4. **Given** the aspirant mode is active, **When** a repo is missing `ROADMAP.md` and has no README Roadmap section, **Then** the Roadmap field shows ❌ with a one-line remediation hint in the Foundation tab.
5. **Given** the aspirant mode is active and the repo has no `ADOPTERS.md`, **Then** the Adopters field shows ⚠️ (not ❌) with a hint explaining that adoption can be zero but the field must be addressed in the application.
6. **Given** the aspirant mode is active, **Then** human-only fields (Why CNCF?, business/product separation, TAG engagement status, etc.) are listed in a separate "Needs your input" section in the Foundation tab with no ✅/⚠️/❌ scoring.

---

### User Story 2 — Understand Contributor Diversity Risk (Priority: P2)

The maintainer wants to know whether their contributor concentration would concern CNCF reviewers. RepoPulse already computes sustainability signals; in aspirant mode, those signals are reframed as a specific CNCF readiness concern: single-org maintainer concentration and contributor diversity.

**Why this priority**: Single-org concentration was a factor in every rejected application analyzed. This reframes existing data as actionable pre-application guidance.

**Independent Test**: With aspirant mode active for a repo where the top contributors are all from the same org, verify that the panel surfaces a ⚠️ contributor diversity flag with a specific remediation hint.

**Acceptance Scenarios**:

1. **Given** aspirant mode is active, **When** top-10 contributor data shows 3+ distinct verified orgs AND no single org holds >50% of top-contributor commits, **Then** the contributor diversity signal shows ✅ with the verified org count noted (e.g., "4 organizations represented").
2. **Given** aspirant mode is active, **When** top-10 contributor data shows exactly 2 distinct orgs, **Then** the signal shows ⚠️ with the hint "Only 2 contributor organizations detected — CNCF reviewers look for broader org diversity; recruiting contributors from a third organization strengthens the application."
3. **Given** aspirant mode is active, **When** top-10 contributor data shows 3+ orgs but one org holds >50% of commits, **Then** the signal shows ⚠️ with the hint "Contributor count spans multiple organizations but one org dominates — document a diversity plan in the application."
4. **Given** aspirant mode is active, **When** all top contributors belong to one organization, **Then** the signal shows ⚠️ with the hint "CNCF TOC reviewers check for single-vendor concentration — recruit contributors from additional organizations or document a concrete plan to do so."
5. **Given** contributor org data is unavailable (unaffiliated contributors), **Then** the signal shows ⚠️ with the note "Contributor organizational diversity could not be verified — consider making org affiliations public on GitHub."

---

### User Story 3 — See Release Activity Surfaced as a CNCF Readiness Signal (Priority: P3)

TOC reviewers check repository activity externally. The maintainer should see their repo's release cadence and commit activity framed as a CNCF readiness signal so they can address it proactively if weak.

**Why this priority**: TOC members have flagged low activity during review ("repo appears less active, not many changes occurring"). RepoPulse already has this data — surfacing it in aspirant context takes no additional API calls.

**Independent Test**: With aspirant mode active, verify that release cadence and recent commit activity from the existing analysis are shown as a CNCF readiness signal (✅ if healthy, ⚠️ if low).

**Acceptance Scenarios**:

1. **Given** aspirant mode is active and the repo has 4+ formal GitHub Releases in the last 12 months AND 10+ commits in the last 90 days, **When** the panel renders, **Then** the Project Activity signal shows ✅.
2. **Given** the repo has version tags but no formal GitHub Releases with release notes, **When** the panel renders, **Then** the signal shows ⚠️ with a visibility-gap hint referencing the Reloader pattern.
3. **Given** the repo has 1–3 formal releases in 12 months, **When** the panel renders, **Then** the signal shows ⚠️ with a low-cadence hint prompting the user to describe their release cadence in the application.
4. **Given** the repo is less than 6 months old with no formal releases, **When** the panel renders, **Then** the signal shows ⚠️ with a new-project hint prompting them to document their planned release cadence.

---

### User Story 4 — See CNCF Readiness Score and Ranked Improvement Recommendations (Priority: P4)

The maintainer wants more than a field count — they want to know how ready they are overall as a single score, and which improvements will have the biggest impact on that score. The Foundation tab shows a numeric CNCF Readiness Score (0–100) derived from the auto-checkable fields, with each failing or partial field accompanied by a ranked recommendation showing how many points fixing it would add.

**Why this priority**: A count ("6 of 11") tells you where you are; a score with ranked recommendations tells you what to do first. This is the difference between a status report and an action plan.

**Independent Test**: With aspirant mode active, verify that a CNCF Readiness Score appears (0–100) and that the "Needs work before submitting" section shows each item with an improvement impact (e.g., "+9 pts if fixed").

**Acceptance Scenarios**:

1. **Given** aspirant mode is active, **When** the Foundation tab renders, **Then** a CNCF Readiness Score between 0 and 100 is displayed prominently at the top of the tab.
2. **Given** the score is computed, **Then** the Overview pill reflects the same score (e.g., "CNCF Sandbox: 64 / 100").
3. **Given** a field is ❌ or ⚠️, **When** it appears in "Needs work before submitting," **Then** it shows how many points it contributes to the score, so the user can prioritize high-impact fixes first.
4. **Given** all auto-checkable fields are ✅, **Then** the score is 100 and the "Needs work" section is empty.
5. **Given** no auto-checkable fields are ✅, **Then** the score is 0.

---

### User Story 5 — See CNCF Relevance Inline in Existing Tabs (Priority: P5)

The maintainer is browsing the Documentation tab to review their README and contributing guide. When aspirant mode is active, they see a small "CNCF Sandbox" badge next to each signal that is relevant to their CNCF application. This tells them, in context, that fixing this gap will improve their readiness score — without forcing them to switch to the CNCF Readiness tab to understand the connection.

**Why this priority**: Prevents the CNCF Readiness tab from becoming a silo disconnected from the tabs where the user actually reviews and understands the underlying signals. The annotation makes the CNCF relevance visible where the work happens.

**Independent Test**: With aspirant mode active, navigate to the Documentation tab and verify that a "CNCF Sandbox" badge appears inline next to signals that map to CNCF application form fields (e.g., CONTRIBUTING.md, CODE_OF_CONDUCT.md, ROADMAP.md). Verify the badge is absent when aspirant mode is off.

**Acceptance Scenarios**:

1. **Given** aspirant mode is active, **When** the user views the Documentation tab, **Then** a "CNCF Sandbox" badge appears next to each documentation signal that maps to a CNCF application form field.
2. **Given** aspirant mode is active, **When** the user views the Security tab, **Then** a "CNCF Sandbox" badge appears next to the SECURITY.md signal.
3. **Given** aspirant mode is active, **When** the user views the Contributors tab, **Then** a "CNCF Sandbox" badge appears next to the contributor diversity / org concentration signal.
4. **Given** aspirant mode is active, **When** the user views the Activity tab, **Then** a "CNCF Sandbox" badge appears next to the release cadence and commit activity signals.
5. **Given** aspirant mode is OFF, **Then** no "CNCF Sandbox" badges appear anywhere in any tab.
6. **Given** the user is in the CNCF Readiness tab and clicks a checklist item that has a home tab, **Then** they are navigated to that tab with the relevant signal in view.

---

### User Story 6 — Audit an Existing CNCF Sandbox Project for Incubation Readiness (Priority: P6)

A project already accepted into the CNCF Sandbox wants to know how they are tracking toward Incubation. They open RepoPulse, analyze their repo, and select "CNCF Sandbox" from the foundation target selector. Because the repo is already detected in the CNCF landscape, aspirant mode does not activate. Instead, the system shows an informational banner: "This project is already in the CNCF Sandbox. Select 'CNCF Incubating' to assess readiness for the next stage." This gives the existing Sandbox project a clear path to evaluate their Incubation readiness without being shown aspirant guidance that doesn't apply to them.

**Why this priority**: Existing Sandbox projects have a different question than aspirant projects — not "how do I get in?" but "how do I advance?". The auto-detection override (P5 / FR-004) creates a natural entry point for this audit flow. The banner's call-to-action seeds the future CNCF Incubating tier without requiring it to be built now.

**Independent Test**: Analyze a repo already listed in the CNCF landscape, select "CNCF Sandbox" from the selector, verify the aspirant panel does NOT appear and a banner directs the user toward "CNCF Incubating."

**Acceptance Scenarios**:

1. **Given** a repo is detected as already in the CNCF Sandbox landscape listing, **When** the user selects "CNCF Sandbox" from the selector, **Then** an informational banner appears: "This project is already a CNCF Sandbox project. To assess readiness for Incubation, select 'CNCF Incubating' from the foundation target selector." The aspirant readiness panel does not render.
2. **Given** the banner is shown, **When** the "CNCF Incubating" option is not yet implemented, **Then** the "CNCF Incubating" option in the selector MUST appear as disabled with a "Coming soon" tooltip rather than being absent entirely.

---

### User Story 7 — Auto-Detection Precedence: Member Mode Takes Over (Priority: P7)

A project already in the CNCF landscape opens RepoPulse. Even if they select "CNCF Sandbox" from the foundation target selector, the system detects their CNCF membership automatically and declines to activate aspirant mode.

**Why this priority**: Prevents misleading aspirant guidance for projects already affiliated.

**Independent Test**: Analyze a repo already listed in the CNCF landscape, select "CNCF Sandbox" from the selector, and verify that the aspirant panel does NOT appear.

**Acceptance Scenarios**:

1. **Given** a repo is detected as already in the CNCF landscape, **When** the user selects "CNCF Sandbox" from the selector, **Then** aspirant mode is not activated and an informational banner explains why.
2. **Given** a repo has no CNCF affiliation signals, **When** the user selects "CNCF Sandbox," **Then** aspirant mode activates normally.

---

### User Story 8 — Reset Foundation Target to None (Priority: P8)

The user selected "CNCF Sandbox" by mistake and wants to revert to the default view.

**Why this priority**: Basic UX — the selector must not be a one-way door.

**Independent Test**: Activate aspirant mode, change the selector back to "None," verify the aspirant panel disappears.

**Acceptance Scenarios**:

1. **Given** aspirant mode is active, **When** the user changes the selector to "None," **Then** the aspirant readiness panel is removed and the standard analysis output is displayed.

---

### Edge Cases

- **Adopters field absent**: Shows ⚠️ (not ❌) — with the hint "CNCF does not require existing adopters, but you must address this field. Even 'No public adopters yet; here is our plan' is acceptable."
- **CoC present but content unverifiable**: Shows ⚠️ — "Code of Conduct file found; verify it references the Contributor Covenant (v1.x or v2.x)."
- **LICENSE is an OSI-approved license but not on the CNCF allowlist**: Shows ⚠️ — "License detected but not on CNCF's approved list; check cncf.io/allowed-third-party-license-policy."
- **CNCF landscape data unreachable**: Landscape field shows ⚠️ — "Unable to verify landscape listing — check manually at landscape.cncf.io." Auto-detection for member-mode override falls back gracefully (aspirant mode proceeds).
- **No README exists**: Project Summary field shows ❌ (not ⚠️) — no draft can be surfaced.
- **All top contributors unaffiliated**: Contributor diversity signal shows ⚠️ — org data unverifiable; hint prompts making affiliations public.
- **3+ orgs but one holds >50% of commits**: Contributor diversity signal shows ⚠️ — concentration dominance, not absence of orgs, is the concern.
- **Exactly 2 orgs with even split**: Contributor diversity signal shows ⚠️ — below the 3-org threshold regardless of commit distribution.
- **Analysis not yet run**: Foundation target selector is disabled until at least one repo analysis result is available.
- **Multiple repos analyzed**: The aspirant panel is shown per-repo; each repo's signals are evaluated independently.
- **User switches tabs while aspirant mode is active**: Inline badges persist in every tab for the duration of the session; switching tabs does not clear the badges or require re-selecting the foundation target.
- **A signal does not exist in the existing tab** (e.g., a tab not yet implemented for a future feature): no badge is rendered for that signal in that tab — the signal appears only in the CNCF Readiness tab checklist.

---

## Requirements *(mandatory)*

### Functional Requirements

**Foundation Target Selector — Pre-Analysis**

- **FR-001**: A "Foundation target" selector MUST appear in the repo input area, visible before the user clicks Analyze. Options: None (default), CNCF Sandbox. The selector is available at all times — the user sets their target intent before analysis runs, not after. This ensures the CNCF landscape lookup is included in the analysis pipeline rather than fetched lazily on-demand.
- **FR-002**: When "CNCF Sandbox" is selected before analysis, the analysis pipeline MUST include a fetch of the CNCF landscape data (to evaluate the "CNCF Landscape listing" field and to determine member-mode override). This fetch is part of the same analysis request, not a separate on-demand call.
- **FR-003**: The selector state persists across analysis runs in the same session — if the user re-analyzes a different repo, the previously selected foundation target is retained.
- **FR-004**: If CNCF landscape data shows the analyzed repo is already listed in the CNCF landscape, aspirant mode MUST NOT activate. Instead, an informational banner MUST appear explaining that the repo is already a CNCF project and aspirant mode does not apply. **Note**: Issue #157 is not yet implemented. This feature MUST build the CNCF landscape detection logic itself by fetching and parsing `https://github.com/cncf/landscape` data (the `landscape.yml` file). No dependency on #157 is assumed.
- **FR-005**: Selecting "None" MUST remove the aspirant readiness output (pill and tab) and restore the standard analysis view. If the user changes the selector and re-analyzes, the new selection governs.

**Aspirant Mode — Auto-Detectable Fields**

- **FR-006**: Selecting "CNCF Sandbox" (when auto-detection does not override) MUST activate aspirant mode and render a CNCF Sandbox pre-application readiness panel.
- **FR-007**: The panel MUST evaluate all auto-detectable fields and display ✅, ⚠️, or ❌ per field, each with a one-line remediation hint for any non-✅ status.
- **FR-008**: Auto-detectable fields (file-presence and API-sourced). **Note**: time-window selectors (30/60/90/180 days) do NOT apply here — CNCF readiness uses fixed reference periods (12 months for releases, 90 days for commits) that mirror what TOC reviewers actually examine. A sliding window would make the score arbitrarily variable and would not reflect real CNCF criteria.

  | Field | ✅ condition | ⚠️ condition | ❌ condition |
  |---|---|---|---|
  | Roadmap | `ROADMAP.md` present, or README has a "Roadmap" heading | — | Neither present |
  | Contributing guide | `CONTRIBUTING.md` present | — | Absent |
  | Code of Conduct | `CODE_OF_CONDUCT.md` present AND content references Contributor Covenant | File present but content unverified | Absent |
  | Maintainers file | `MAINTAINERS`, `MAINTAINERS.md`, or `CODEOWNERS` present | — | Absent |
  | Security policy | `SECURITY.md` present | — | Absent |
  | License | Apache-2.0, MIT, BSD-2-Clause, BSD-3-Clause, ISC, or MPL-2.0 detected | License detected but not on CNCF allowlist | No license detected |
  | Adopters | `ADOPTERS.md` present | Absent (but adoption is not required — field must be addressed) | — (no ❌: the field is always addressable) |
  | CNCF Landscape listing | Repo URL found in fetched `cncf/landscape` `landscape.yml` | Landscape fetch failed (cannot verify) | Not found in landscape |
  | LFX Insights listing | — | Always ⚠️ — cannot be auto-verified; shown as a manual check with a direct link to insights.linuxfoundation.org | — |
  | Contributor diversity | 3+ distinct verified orgs among top 10 contributors AND no single org holds >50% of top-contributor commits | 2 distinct orgs; OR 3+ orgs but one org holds >50% of commits; OR single-org concentration; OR org data unverifiable | — (no ❌ — always addressable with a statement of intent) |
  | Project activity | 4+ formal GitHub Releases (with release notes) in last 12 months AND 10+ commits in last 90 days; OR project < 6 months old with active commits | 1–3 formal releases/year; OR 0 formal releases but project < 6 months old; OR has version tags but no formal GitHub Releases (visibility gap); OR 1–9 commits in last 90 days | — (no ❌ — always addressable with context in the application) |

- **FR-009**: The Adopters field MUST use ⚠️ when the file is absent (never ❌). The remediation hint MUST explain that CNCF does not require existing adopters — the field must be answered in the application, even if the answer is "no public adopters yet." Every rejected application left this field blank without comment; every approved application addressed it.
- **FR-010**: The LFX Insights listing field MUST always show ⚠️ (it cannot be auto-verified). The field MUST display a direct link to `insights.linuxfoundation.org` and the note: "CNCF requires projects to be listed on LFX Insights — verify manually and submit a listing request if not yet present." This field is NOT deferred; it is surfaced as a permanent manual check.
- **FR-011**: Contributor diversity signal MUST be derived from the existing sustainability analysis payload — no additional API calls. Thresholds: ✅ requires 3+ distinct verified orgs among the top 10 contributors by commit count AND no single org holding >50% of those commits; ⚠️ for 2 orgs, or 3+ orgs with one holding >50%, or single-org concentration, or unverifiable org data. No ❌ — always addressable with a statement of intent. Each ⚠️ sub-case surfaces a distinct remediation hint.
- **FR-012**: Project activity signal MUST be derived from the existing activity analysis payload (fixed periods only — no time-window selector). Thresholds:
  - ✅: 4+ formal GitHub Releases (with release notes, not bare tags) in last 12 months AND 10+ commits in last 90 days; OR project age < 6 months with active commits
  - ⚠️ (visibility gap): Version tags exist but no formal GitHub Releases with release notes — "Your releases are not surfaced as GitHub Releases with notes; TOC reviewers may perceive the project as less active than it is. This was a documented factor in the Reloader rejection (8-0 against)."
  - ⚠️ (low cadence): 1–3 formal releases in last 12 months — "Fewer than 4 formal releases in the past year; proactively describe your release cadence in the application"
  - ⚠️ (low commits): 1–9 commits in last 90 days — "Low recent commit activity may concern reviewers; note your maintenance approach"
  - ⚠️ (new project): 0 formal releases AND project < 6 months old — "No formal releases yet; document your planned release cadence"
  - No ❌ — always addressable with context ("stabilization phase", "approaching v1.0", etc.)

**Aspirant Mode — Partially Auto-Detectable Fields**

- **FR-013**: The following fields MUST appear in the "Needs work before submitting" section with ⚠️ status and surfaced evidence for human completion:
  - **Project summary**: README first paragraph surfaced as draft text for the application's project description field, with the note "Refine this into a concise 2–3 sentence description of what the project does and who it is for."
  - **Cloud native overlap**: CNCF landscape category peers listed (derived from the landscape fetch) as a starting point, with the note "For each listed project, add one sentence explaining the specific technical or architectural difference. Reviewers check this field carefully — vague answers or blank fields are a leading rejection signal."
  - **Recommended TAG**: Based on the repo's primary topic signals (topics, README keywords, primary language), a TAG recommendation MUST be surfaced with the note "Present to this TAG before the TOC vote — projects with a formal TAG review have a significantly higher approval rate." TAG matching logic is defined in FR-014.
- **FR-014**: TAG recommendation logic — the system MUST map the repo's primary domain signals to one of the five active CNCF TAGs using the following priority-ordered keyword and topic rules:

  | Signals detected | Recommended TAG |
  |---|---|
  | Topics/keywords: `policy`, `authorization`, `RBAC`, `ABAC`, `OIDC`, `OAuth`, `SBOM`, `provenance`, `attestation`, `supply-chain`, `signing`, `CVE`, `compliance`, `audit`, `zero-trust` | **TAG Security and Compliance** |
  | Topics/keywords: `observability`, `monitoring`, `prometheus`, `opentelemetry`, `tracing`, `logging`, `alerting`, `backup`, `restore`, `disaster-recovery`, `cost`, `finops`, `reliability`, `SRE`, `troubleshooting` | **TAG Operational Resilience** |
  | Topics/keywords: `scheduler`, `batch`, `runtime`, `OCI`, `CRI`, `unikernel`, `autoscale`, `scale-to-zero`, `gang-scheduling`, `GPU`, `DRA`, `resource-allocation`, `workload`, `HPC`, `AI/ML job` | **TAG Workloads Foundation** |
  | Topics/keywords: `CNI`, `CSI`, `network`, `storage`, `service-mesh`, `DNS`, `load-balancer`, `IaC`, `terraform`, `edge`, `host-network`, `node`, `cluster-infrastructure`, `ingress` (infra-layer) | **TAG Infrastructure** |
  | Topics/keywords: `developer-platform`, `IDP`, `backstage`, `microservices`, `streaming`, `kafka`, `messaging`, `database`, `API-gateway` (app-layer), `developer-portal`, `GitOps`, `scaffolding` | **TAG Developer Experience** |

  If no clear match is found, the system MUST surface all five TAGs with the note "Review the TAG charters at contribute.cncf.io/community/tags/ to select the most relevant TAG for your project domain."

**Aspirant Mode — Human-Only Fields**

- **FR-015**: The following fields MUST appear in the "Needs your input" section as a plain to-do checklist. Each field MUST include the guidance note specified below — these are derived from analysis of real approved and rejected CNCF Sandbox applications:

  | Field | Guidance note shown to user |
  |---|---|
  | **Why CNCF?** | "Name a specific governance benefit (vendor-neutral, multi-stakeholder control), a concrete CNCF technical context this project fits into (adjacent projects, TAGs, working groups), and why *now* is the right time (adoption threshold, need for multi-company contributors, commercial entanglement). Avoid: 'visibility' or 'adoption' in the abstract. Fatal: stating that the primary motive is commercial exposure — ErieCanal wrote 'used as part of our commercial offerings' and was rejected 6-0." |
  | **Benefit to CNCF landscape** | "Answer from the ecosystem's perspective, not the project's. What was absent or broken in the CNCF landscape before this project? Name at least two existing CNCF projects that become more complete or more valuable in combination with yours. Do not repeat your 'Why CNCF?' answer — reviewers notice when these two fields are interchangeable." |
  | **Cloud native fit and integration** | "Name specific CNCF projects and describe the technical relationship for each: data plane / control plane, API consumer, OpenTelemetry emitter, plugin extension, etc. 'Runs on Kubernetes' is the minimum acceptable statement and will be challenged by reviewers. The strongest answers name 4–8 CNCF projects with a one-line architectural relationship each. Leaving this field sparse is the single most common reason reviewers ask for more information in comments." |
  | **Business / product separation** | "If a commercial product exists: (1) name it explicitly, (2) explain governance separation (separate roadmap, release cadence, or steering), (3) explain how the commercial product uses the OSS project — ideally through extension points, not as a direct distribution. Reference model: Envoy. Fatal: writing that the commercial and OSS versions have 'the same functionality' — this was a documented factor in the Reloader rejection." |
  | **Similar projects and overlap** | "Name every CNCF project a reviewer could find by searching the landscape for your category. For each, write one sentence explaining the architectural or capability difference. Claiming 'no overlap' when obvious comparators exist damages credibility. If an independent third-party benchmark or security assessment exists, cite it — Cedar Policy's Trail of Bits report was one of the strongest overlap answers in the corpus." |
  | **TAG Domain Technical Review** | "Select the TAG matching your project's domain (see the recommended TAG surfaced above). Present at a TAG meeting *before* the TOC vote — this is treated as a soft prerequisite and has a documented impact on approval rate. Contact the TAG chairs on CNCF Slack to request a slot. All 7 rejected projects in our analysis had zero TAG engagement; nearly all approved projects had presented before or during the vote." |
  | **CNCF contacts** | "Name a specific person in the CNCF ecosystem — a TOC member, TAG lead, or CNCF Ambassador — who knows the project and is willing to facilitate a TAG presentation. A named contact significantly accelerates the review process. If no relationship exists yet, engaging with the relevant TAG (above) before submitting will create one. Projects with zero contacts listed have longer review cycles." |
  | **License exception required?** | "If any dependency uses a license not on the CNCF allowlist, answer Yes and list the dependency and license. Proactive disclosure is valued — KAI Scheduler faced a mid-review IP allegation and passed because they responded within days with full transparency. Silence on known IP issues is a rejection risk." |
  | **Application contact email(s)** | "Provide at least one email for the primary submitter. This is administrative — it does not affect the vote." |
  | **Signatory information** | "Provide the legal entity name and representative who will sign the CNCF project contribution agreement. This is the organization (company or individual) taking legal responsibility for the IP donation." |
  | **Trademark and IP policy** | "Acknowledge that the project will comply with CNCF's IP policy and trademark guidelines. If the project name includes a trademark (e.g., a database name), note how it is handled — CloudNativePG removed 'PostgreSQL' from its name to avoid trademark issues." |

**Two-Layer UI: Overview Pill + CNCF Readiness Tab**

- **FR-016**: The aspirant readiness output MUST be presented as two coordinated layers that follow the existing RepoPulse pattern (compact badge on Overview → full detail in a dedicated tab):

  **Layer 1 — Overview pill**: When aspirant mode is active, a compact status pill labeled **"CNCF Sandbox Readiness"** MUST appear on the Overview tab alongside the existing CHAOSS score badges. The pill shows the CNCF Readiness Score ("64 / 100") and a color indicator (green ≥ 80, amber 50–79, red < 50). The pill links to the CNCF Readiness tab. The pill MUST NOT appear when aspirant mode is off. When future stages are added, the pill label changes to match the selected stage (e.g., "CNCF Incubating Readiness", "CNCF Graduation Readiness").

  **Layer 2 — CNCF Readiness tab**: A new tab labeled **"CNCF Readiness"** MUST appear in the results tab strip when aspirant mode is active and MUST be absent when aspirant mode is off. The tab label is always "CNCF Readiness" regardless of which stage is selected — the stage is communicated inside the tab. The tab contains:
  - A tab content header: **"Targeting: CNCF Sandbox"** (stage-specific, driven by the selector)
  - The CNCF Readiness Score and field count summary
  - The full readiness checklist organized into three clearly labeled groups:
    1. **Ready to submit** — auto-detected ✅ fields
    2. **Needs work before submitting** — all ⚠️ and ❌ fields (auto-detectable and partial), each with remediation hint, point impact, and surfaced evidence where applicable
    3. **Needs your input** — human-only fields as a to-do list

- **FR-017**: The Foundation tab MUST display a **CNCF Readiness Score** (0–100) prominently at the top of the tab, above the field checklist. The score is a weighted sum across all auto-checkable fields: each ✅ contributes its full point weight, each ⚠️ contributes half its weight, each ❌ contributes zero. The score is rounded to the nearest whole number. The same score is shown in the Overview pill.

- **FR-018**: The score weights across the 10 auto-checkable fields (FR-007) MUST reflect the empirical importance of each signal to CNCF reviewers:

  | Field | Weight |
  |---|---|
  | TAG engagement (contributor diversity proxy — org spread signals community health) | 15 pts |
  | Contributor diversity | 15 pts |
  | License | 12 pts |
  | Code of Conduct | 10 pts |
  | Contributing guide | 10 pts |
  | Roadmap | 10 pts |
  | Security policy | 8 pts |
  | Maintainers file | 8 pts |
  | Adopters | 7 pts |
  | CNCF Landscape listing | 5 pts |

  Total: 100 pts. Project activity does not contribute to the score directly — it is surfaced as an informational signal with a ⚠️ flag and a note.

- **FR-019**: Each ❌ or ⚠️ item in the "Needs work before submitting" section MUST display its point impact inline (e.g., "+12 pts if resolved" for License ❌, "+6 pts if resolved" for License ⚠️). Items MUST be sorted by point impact descending so the highest-value fixes appear first.

- **FR-020**: The CNCF Readiness tab summary area MUST display both the score and the raw count: e.g., "CNCF Readiness Score: 64 / 100 — 7 of 10 auto-checkable fields ready."

**Cross-Tab CNCF Annotations**

- **FR-021**: When aspirant mode is active, a compact **"CNCF Sandbox"** badge MUST appear inline next to each signal in the existing domain tabs that maps to a CNCF application form field. The badge MUST be absent when aspirant mode is off. The badge conveys that this signal contributes to the CNCF Readiness Score.

- **FR-022**: The signal-to-tab mapping defines which existing tab owns each CNCF-relevant signal and where the badge appears:

  | CNCF field | Home tab | Signal location in that tab |
  |---|---|---|
  | Roadmap | Documentation | ROADMAP.md presence row |
  | Contributing guide | Documentation | CONTRIBUTING.md presence row |
  | Code of Conduct | Documentation | CODE_OF_CONDUCT.md presence row |
  | Maintainers file | Documentation | MAINTAINERS / CODEOWNERS presence row |
  | Adopters file | Documentation | ADOPTERS.md presence row |
  | Project summary (partial) | Documentation | README summary row |
  | Security policy | Security | SECURITY.md presence row |
  | License | Overview | License field on the repo metadata card |
  | Contributor diversity | Contributors | Org concentration / sustainability signals |
  | Project activity | Activity | Release cadence and commit frequency signals |
  | CNCF Landscape listing | CNCF Readiness tab only | No home tab — evaluated only in the CNCF Readiness tab |

- **FR-023**: Each checklist item in the CNCF Readiness tab that has a home tab (FR-022) MUST include a deep-link that navigates the user to that tab, scrolled to the relevant signal. Items with no home tab (CNCF Landscape listing, human-only fields) do not have deep-links.

- **FR-024**: The inline badge in existing tabs MUST show the current status of that field (✅/⚠️/❌) alongside the "CNCF Sandbox" label, so the user can see readiness status in context without switching to the CNCF Readiness tab.

**Accuracy & Data Rules**

- **FR-025**: All file-presence checks MUST use verified data from the GitHub API response — no guessing or inference.
- **FR-026**: License detection MUST use the GitHub API `license` field. If unavailable, show ❌.
- **FR-027**: CNCF Landscape listing detection MUST be implemented in this feature by fetching the `landscape.yml` file from the `cncf/landscape` GitHub repository and checking whether the analyzed repo's URL appears in it. Issue #157 is not implemented and cannot be relied upon. If the fetch fails, show ⚠️ with a manual verification link to landscape.cncf.io.
- **FR-028**: Contributor diversity and project activity signals MUST reuse already-computed analysis payload data — no additional API calls.
- **FR-029**: LFX Insights listing is NOT deferred. It is surfaced as a permanent ⚠️ manual check field (FR-010) with a direct link — it cannot be auto-verified but must not be hidden from the checklist.
- **FR-030**: The CNCF Readiness Score MUST be derived solely from verified GitHub API data and the CNCF landscape data — no fabricated or inferred values contribute to the score.

### Key Entities

- **FoundationTarget**: Enum — `none | cncf-sandbox`. Represents the user-selected foundation target.
- **AspirantFieldStatus**: Enum — `ready` (✅) | `partial` (⚠️) | `missing` (❌) | `human-only`. Applied to each evaluated field.
- **AspirantField**: A single evaluated application form field. Attributes: `id` (unique key), `label` (display name), `status` (AspirantFieldStatus), `weight` (number — point value of this field toward the 100-pt score), `pointsEarned` (number — weight × 1 for ✅, × 0.5 for ⚠️, × 0 for ❌), `evidence` (optional surfaced text for partial fields), `remediationHint` (optional one-line hint for partial/missing fields), `explanatoryNote` (optional contextual note for human-only fields).
- **AspirantReadinessResult**: The full evaluation output. Contains: `foundationTarget`, `readinessScore` (0–100, weighted sum of pointsEarned across all auto fields), `autoFields` (AspirantField list with status ready/partial/missing, sorted by pointsEarned ascending for "needs work" display), `humanOnlyFields` (AspirantField list with status human-only), `readyCount`, `totalAutoCheckable`.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user selects "CNCF Sandbox" from the foundation target selector in the repo input area before clicking Analyze; after analysis completes, the "CNCF Sandbox Readiness" pill on Overview and the "CNCF Readiness" tab both appear without any additional interaction.
- **SC-002**: All 11 auto-detectable and manual-check fields (FR-008 table including LFX Insights) are represented in the CNCF Readiness tab — none omitted, LFX Insights always shown as ⚠️ with a direct verification link.
- **SC-003**: Every ⚠️ or ❌ auto-detected field displays a one-line remediation hint grounded in actual CNCF application patterns (not generic advice), plus its point impact toward the score.
- **SC-004**: The Adopters field never shows ❌ — it always shows ⚠️ when absent, with an accurate explanation that absence is not disqualifying if the field is addressed in the application.
- **SC-005**: The TAG engagement human-only item includes an explanatory note that accurately reflects the empirical pass-rate advantage of pre-vote TAG presentations.
- **SC-006**: The CNCF Readiness Score (0–100) is displayed prominently in both the Overview pill and at the top of the Foundation tab, and is accurate for all combinations of field statuses.
- **SC-007**: Items in "Needs work before submitting" are sorted by point impact descending — the highest-value fix is always listed first.
- **SC-008**: When a repo is already in the CNCF landscape, aspirant mode is never activated — the auto-detection override is enforced in 100% of such cases.
- **SC-009**: Contributor diversity and project activity signals are derived entirely from already-computed analysis data — no extra API calls are made when aspirant mode is activated.
- **SC-010**: All file-presence and license status values originate from verified GitHub API data — no fabricated statuses.
- **SC-011**: Human-only fields are visually and semantically distinct from auto-evaluated fields — no user can mistake a human-only item for an auto-checked result.
- **SC-012**: When aspirant mode is active, a "CNCF Sandbox" badge with current ✅/⚠️/❌ status appears inline in each home tab (Documentation, Security, Contributors, Activity) next to every signal that maps to a CNCF application form field — and is completely absent when aspirant mode is off.
- **SC-013**: Every checklist item in the CNCF Readiness tab that has a home tab includes a working deep-link that navigates to that tab and the relevant signal.

---

## Assumptions

- **Issue #157 is NOT implemented.** CNCF landscape detection must be built in this feature by fetching and parsing `landscape.yml` from the `cncf/landscape` GitHub repository. No prior landscape detection logic exists to reuse.
- The "CNCF Incubating" and "CNCF Graduated" selector options are out of scope for this feature. They MUST appear in the selector as disabled with a "Coming soon" tooltip so US6's banner can reference them meaningfully.
- The foundation target selector appears in the repo input area BEFORE the user clicks Analyze. This is a change from the post-analysis selector model considered earlier — it is necessary because the CNCF landscape fetch is part of the analysis pipeline.
- Documentation file-presence signals (CONTRIBUTING.md, CODE_OF_CONDUCT.md, SECURITY.md, MAINTAINERS, ROADMAP.md, ADOPTERS.md) are already part of the standard repo analysis payload from P2-F01a. Any signals missing from the payload must be added in this PR by extending the data fetch and analysis result type.
- "CNCF-compatible" Code of Conduct is approximated as: file present AND content contains the string "Contributor Covenant." If content is not available from the API, shows ⚠️.
- The CNCF license allowlist is: Apache-2.0, MIT, BSD-2-Clause, BSD-3-Clause, ISC, MPL-2.0 (CNCF Allowlist License Policy as of 2026-04-21). Non-allowlisted OSI-approved licenses show ⚠️ (not ❌).
- LFX Insights listing is NOT deferred — it is shown as a permanent ⚠️ manual check with a direct link (FR-010). It cannot be auto-verified.
- The foundation target selector state is session-only (no localStorage persistence).
- The CNCF Readiness tab is a new tab in the existing Results Shell (P1-F15). If issue #210 infrastructure is not yet merged, the tab renders using the existing tab pattern.
- Score weights (FR-018) are config-driven, not hardcoded, consistent with constitution §VI.
- The CNCF Sandbox application form fields evaluated in this spec are based on the form as of 2026-04-21.
- The TAG recommendation logic (FR-014) uses repo topics and README keyword signals already available at analysis time — no additional API calls required.
- The naming convention for all surfaces is fixed and MUST be implemented exactly as specified:

  | Surface | Label (Sandbox stage) | Scales to future stages as |
  |---|---|---|
  | Repo input selector | `Foundation target: CNCF Sandbox ▾` | `CNCF Incubating`, `CNCF Graduated` |
  | Overview pill | `CNCF Sandbox Readiness  64 / 100` | `CNCF Incubating Readiness`, `CNCF Graduation Readiness` |
  | Tab strip | `CNCF Readiness` | unchanged (always "CNCF Readiness") |
  | Tab content header | `Targeting: CNCF Sandbox` | `Targeting: CNCF Incubating`, `Targeting: CNCF Graduated` |
