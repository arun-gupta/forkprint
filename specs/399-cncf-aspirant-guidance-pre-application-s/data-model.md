# Data Model: CNCF Aspirant Guidance (399)

## Entities

### FoundationTarget

Enum representing the user-selected foundation target before analysis.

```typescript
type FoundationTarget = 'none' | 'cncf-sandbox';
```

**State transitions**: `none` → `cncf-sandbox` (selector change) → `none` (reset).  
The value is session-only (no persistence across page loads).

---

### AspirantFieldStatus

Enum applied to each evaluated CNCF application field.

```typescript
type AspirantFieldStatus = 'ready' | 'partial' | 'missing' | 'human-only';
```

| Value | Symbol | Score contribution |
|---|---|---|
| `ready` | ✅ | Full weight |
| `partial` | ⚠️ | Half weight |
| `missing` | ❌ | Zero |
| `human-only` | — | Zero (weight = 0) |

---

### AspirantField

A single evaluated CNCF application form field.

```typescript
interface AspirantField {
  id: string;                        // unique stable key, e.g. 'roadmap', 'coc', 'license'
  label: string;                     // display name, e.g. "Contributing Guide"
  status: AspirantFieldStatus;
  weight: number;                    // point value toward 100-pt score (0 for human-only)
  pointsEarned: number;              // weight × 1 (ready) | × 0.5 (partial) | × 0 (missing/human-only)
  homeTab?: ResultTabId;             // which tab owns this signal for deep-link (undefined = no home tab)
  evidence?: string;                 // surfaced text for partial fields (e.g. README first paragraph)
  remediationHint?: string;          // one-line remediation hint for partial/missing fields
  explanatoryNote?: string;          // contextual note for human-only fields
}
```

**Validation rules**:
- `pointsEarned` must equal: `weight` (ready), `weight * 0.5` (partial), `0` (missing/human-only)
- `weight` must be `0` for `human-only` fields
- `remediationHint` is required when `status` is `partial` or `missing`
- `explanatoryNote` is required when `status` is `human-only`
- `id` values are stable identifiers (used for deep-link anchors)

**Field IDs and weights** (FR-018):

| id | label | weight |
|---|---|---|
| `contributor-diversity` | Contributor Diversity | 15 |
| `license` | License | 12 |
| `coc` | Code of Conduct | 10 |
| `contributing` | Contributing Guide | 10 |
| `roadmap` | Roadmap | 10 |
| `security` | Security Policy | 8 |
| `maintainers` | Maintainers File | 8 |
| `adopters` | Adopters | 7 |
| `landscape` | CNCF Landscape Listing | 5 |
| `lfx` | LFX Insights Listing | 0 |
| `project-activity` | Project Activity | 0 (informational) |

Human-only field IDs (weight = 0):

| id | label |
|---|---|
| `why-cncf` | Why CNCF? |
| `benefit-to-landscape` | Benefit to CNCF Landscape |
| `cloud-native-fit` | Cloud Native Fit and Integration |
| `business-separation` | Business / Product Separation |
| `similar-projects` | Similar Projects and Overlap |
| `tag-engagement` | TAG Domain Technical Review |
| `cncf-contacts` | CNCF Contacts |
| `license-exception` | License Exception Required? |
| `contact-email` | Application Contact Email(s) |
| `signatory` | Signatory Information |
| `trademark-ip` | Trademark and IP Policy |

---

### AspirantReadinessResult

The full CNCF aspirant evaluation output, attached to an analysis result when aspirant mode is active.

```typescript
interface AspirantReadinessResult {
  foundationTarget: FoundationTarget;    // always 'cncf-sandbox' when this object exists
  readinessScore: number;                // 0–100, weighted sum of pointsEarned, rounded to nearest integer
  autoFields: AspirantField[];           // ready/partial/missing fields, sorted by pointsEarned ascending (needs-work first)
  humanOnlyFields: AspirantField[];      // human-only fields (no scoring)
  readyCount: number;                    // count of autoFields with status 'ready'
  totalAutoCheckable: number;            // total count of autoFields (excludes humanOnlyFields)
  alreadyInLandscape: boolean;           // true = auto-detection override active (aspirant mode blocked)
  tagRecommendation: TAGRecommendation;  // recommended CNCF TAG based on topic/keyword signals
}
```

**Validation rules**:
- `readinessScore` = `Math.round(sum(field.pointsEarned for field in autoFields))`
- `readyCount` = count of autoFields where `status === 'ready'`
- `totalAutoCheckable` = `autoFields.length`
- When `alreadyInLandscape === true`, this result object is not sent to the client; the API returns a `landscapeOverride` flag instead
- `autoFields` sorted by `pointsEarned` ascending (so highest-impact missing items float to top of "Needs work" section)

---

### TAGRecommendation

Result of the TAG recommendation logic (FR-014).

```typescript
interface TAGRecommendation {
  primaryTag: CNCFTag | null;          // null = no clear match found
  matchedSignals: string[];            // which keywords/topics triggered the match
  fallbackNote: string | null;         // shown when primaryTag is null
}

type CNCFTag =
  | 'tag-security'
  | 'tag-operational-resilience'
  | 'tag-workloads-foundation'
  | 'tag-infrastructure'
  | 'tag-developer-experience';
```

---

### CNCFLandscapeData

Parsed result of the `landscape.yml` fetch — used internally (server-side only).

```typescript
interface CNCFLandscapeData {
  repoUrls: Set<string>;      // all repo_url values from landscape.yml (normalized, lowercase)
  homepageUrls: Set<string>;  // all homepage_url values from landscape.yml
  fetchedAt: number;          // Date.now() timestamp for cache TTL tracking
  categories: LandscapeCategory[];  // used to surface CNCF landscape category peers (FR-013)
}

interface LandscapeCategory {
  name: string;
  subcategoryName: string;
  projectRepos: string[];   // repo URLs of projects in this category
}
```

This type is server-side only. It is never serialized to the client. The client-facing signal is `aspirantResult.autoFields` containing the `landscape` field status.

---

### CNCFFieldBadge

Passed as a prop to existing domain tab components to render inline CNCF badges (FR-021–FR-024).

```typescript
interface CNCFFieldBadge {
  fieldId: string;             // matches AspirantField.id
  label: string;               // display label, always "CNCF Sandbox" in this feature
  status: AspirantFieldStatus; // drives the ✅/⚠️/❌ icon shown in the badge
}
```

---

## State Transitions

### Foundation Target Selector State Machine

```
[None selected] ──(select CNCF Sandbox)──► [CNCF Sandbox selected, pre-analysis]
                                                  │
                                           (click Analyze)
                                                  │
                                                  ▼
                               ┌──────────────────────────────────┐
                               │ Analysis pipeline runs with      │
                               │ landscapeData fetch included     │
                               └──────────────────────────────────┘
                                      │                │
                               (in landscape)    (not in landscape)
                                      │                │
                                      ▼                ▼
                            [landscapeOverride   [aspirantResult
                             banner shown]        in payload]
                                                       │
                                           (select None)
                                                       │
                                                       ▼
                                           [standard analysis view]
```

---

## Score Computation

```
readinessScore = round(
  sum(field.pointsEarned for each field in autoFields)
)

where:
  field.pointsEarned =
    field.weight          if field.status === 'ready'
    field.weight * 0.5    if field.status === 'partial'
    0                     otherwise

Total possible = sum of all auto-field weights = 100
```

Note: `project-activity` and `lfx` have weight 0 — they are informational signals and do not affect the score.
