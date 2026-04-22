# Contract: UI Component Props (399)

## New Components

### FoundationTargetSelector

```typescript
// components/repo-input/FoundationTargetSelector.tsx (or inline in RepoInputForm.tsx)

interface FoundationTargetSelectorProps {
  value: FoundationTarget;
  onChange: (value: FoundationTarget) => void;
  disabled?: boolean;  // true before first analysis result is available
}
```

Renders a compact selector with options:
- `None` (default, value: `'none'`)
- `CNCF Sandbox` (value: `'cncf-sandbox'`)
- `CNCF Incubating` — disabled with "Coming soon" tooltip
- `CNCF Graduated` — disabled with "Coming soon" tooltip

---

### CNCFReadinessTab

```typescript
// components/cncf-readiness/CNCFReadinessTab.tsx

interface CNCFReadinessTabProps {
  aspirantResult: AspirantReadinessResult;
  onNavigateToTab: (tabId: ResultTabId) => void;  // deep-link callback
}
```

Renders:
1. Header: "Targeting: CNCF Sandbox"
2. Score block: "CNCF Readiness Score: 64 / 100 — 7 of 10 auto-checkable fields ready"
3. "Ready to submit" section — autoFields with status `ready`
4. "Needs work before submitting" section — autoFields with status `partial` or `missing`, sorted by `pointsEarned` ascending (highest impact first), each showing point impact
5. "Needs your input" section — humanOnlyFields as a to-do checklist

---

### CNCFReadinessPill

```typescript
// components/overview/CNCFReadinessPill.tsx

interface CNCFReadinessPillProps {
  score: number;          // 0–100
  onClickNavigate: () => void;  // navigates to CNCF Readiness tab
}
```

Color logic:
- Green (`≥ 80`): `text-green-700 bg-green-50 border-green-200`
- Amber (`50–79`): `text-amber-700 bg-amber-50 border-amber-200`
- Red (`< 50`): `text-red-700 bg-red-50 border-red-200`

---

### CNCFFieldBadgeInline

```typescript
// components/cncf-readiness/CNCFFieldBadgeInline.tsx

interface CNCFFieldBadgeInlineProps {
  fieldId: string;
  status: AspirantFieldStatus;
  label?: string;  // defaults to "CNCF Sandbox"
}
```

Renders a small inline badge: `[✅ CNCF Sandbox]`, `[⚠️ CNCF Sandbox]`, or `[❌ CNCF Sandbox]`.  
Absent (returns `null`) when aspirant mode is off — callers gate rendering on `aspirantMode === true`.

---

### LandscapeOverrideBanner

```typescript
// components/cncf-readiness/LandscapeOverrideBanner.tsx

interface LandscapeOverrideBannerProps {
  // no props — content is static
}
```

Renders: "This project is already a CNCF Sandbox project. To assess readiness for Incubation, select 'CNCF Incubating' from the foundation target selector."

---

## Modified Components

### RepoInputForm

Gains `foundationTarget` and `onFoundationTargetChange` props:

```typescript
// Existing interface extended:
interface RepoInputFormProps {
  // ... existing props unchanged ...
  foundationTarget: FoundationTarget;
  onFoundationTargetChange: (value: FoundationTarget) => void;
}
```

The `FoundationTargetSelector` renders below the repo textarea, above the Analyze button.

---

### ResultsShell

Gains aspirant-related props:

```typescript
// Existing interface extended:
interface ResultsShellProps {
  // ... existing props unchanged ...
  aspirantResult?: AspirantReadinessResult | null;
  landscapeOverride?: boolean;
  onFoundationTargetChange?: (value: FoundationTarget) => void;
}
```

`ResultsShell` conditionally:
1. Adds `'cncf-readiness'` to the tab list when `aspirantResult` is non-null
2. Renders `LandscapeOverrideBanner` when `landscapeOverride === true`
3. Passes `cncfFields` prop to DocumentationView, SecurityView, ContributorsScorePane, ActivityView

---

### Domain Tab Components (cncfFields prop)

All four domain tab components gain an optional `cncfFields` prop:

```typescript
// DocumentationView, SecurityView, ContributorsScorePane, ActivityView

interface WithCNCFBadges {
  cncfFields?: CNCFFieldBadge[];  // empty/absent = no badges rendered
}
```

Each component renders a `CNCFFieldBadgeInline` next to the relevant signal row when the matching `fieldId` is present in `cncfFields`.

Signal-to-component mapping (from FR-022):

| fieldId | Component | Signal row |
|---|---|---|
| `roadmap` | DocumentationView | ROADMAP.md row |
| `contributing` | DocumentationView | CONTRIBUTING.md row |
| `coc` | DocumentationView | CODE_OF_CONDUCT.md row |
| `maintainers` | DocumentationView | MAINTAINERS/CODEOWNERS row |
| `adopters` | DocumentationView | ADOPTERS.md row |
| `security` | SecurityView | SECURITY.md row |
| `contributor-diversity` | ContributorsScorePane | Org diversity / sustainability row |
| `project-activity` | ActivityView | Release cadence and commit frequency rows |

---

## ResultTabId Extension

```typescript
// specs/006-results-shell/contracts/results-shell-props.ts (or lib/results-shell/tabs.ts)
// Add to existing ResultTabId union:

type ResultTabId = 
  | 'overview'
  | 'documentation'
  | 'security'
  | 'contributors'
  | 'activity'
  | 'cncf-readiness';  // NEW
```

The `'cncf-readiness'` tab is only included in the rendered tab list when `aspirantResult !== null`.
