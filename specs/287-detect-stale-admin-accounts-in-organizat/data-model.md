# Phase 1 Data Model — Stale Admin Detection (#287)

All types are framework-agnostic TypeScript. They live under `lib/governance/` and are imported by both the aggregator (`lib/org-aggregation/aggregators/stale-admins.ts`) and the React panel (`components/org-summary/panels/StaleAdminsPanel.tsx`).

## Types

### `StaleAdminClassification`

```ts
export type StaleAdminClassification =
  | 'active'
  | 'stale'
  | 'no-public-activity'
  | 'unavailable';
```

- **`active`**: resolved last-activity timestamp exists and is within (or on) the stale threshold window.
- **`stale`**: resolved last-activity timestamp exists and is strictly older than the threshold window.
- **`no-public-activity`**: admin enumeration succeeded, both activity sources (public events + commit search) returned empty, and neither fetch errored.
- **`unavailable`**: at least one of the activity fetches errored in a way that cannot be distinguished from "truly no public activity" (e.g. rate-limit hit, network failure, 404 on the admin's user account).

State set is closed; no fifth state.

---

### `StaleAdminRecord`

```ts
export interface StaleAdminRecord {
  /** GitHub login. */
  username: string;
  /** Resolved classification. Always set. */
  classification: StaleAdminClassification;
  /** ISO-8601 UTC string. Present only when classification === 'active' or 'stale'. */
  lastActivityAt: string | null;
  /** Which source produced lastActivityAt. Present only when lastActivityAt is present. */
  lastActivitySource: 'public-events' | 'org-commit-search' | null;
  /** Present only when classification === 'unavailable'; short machine-readable reason. */
  unavailableReason: 'admin-account-404' | 'events-fetch-failed' | 'commit-search-failed' | 'rate-limited' | null;
}
```

**Validation rules**:

- `lastActivityAt` MUST be `null` unless `classification` ∈ {`active`, `stale`}.
- `lastActivitySource` MUST be `null` iff `lastActivityAt` is `null`.
- `unavailableReason` MUST be `null` unless `classification === 'unavailable'`.
- `username` is the verbatim `login` from the admin-list endpoint. Never reformatted (no casing change, no trim of `[bot]` suffix, etc.).

---

### `StaleAdminMode`

```ts
export type StaleAdminMode =
  | 'baseline'              // public_repo scope only
  | 'elevated-effective'    // read:org granted AND user is a member of this org
  | 'elevated-ineffective'; // read:org granted BUT user is NOT a member of this org
```

The mode is a property of the **analysis**, not of the session — the same session can render `elevated-effective` for one org and `elevated-ineffective` for another. The panel's mode indicator (FR-016) derives its text from this value.

---

### `StaleAdminsSection`

```ts
export interface StaleAdminsSection {
  kind: 'stale-admins';
  applicability: 'applicable' | 'not-applicable-non-org' | 'admin-list-unavailable';
  mode: StaleAdminMode;
  thresholdDays: StaleAdminThresholdDays;
  admins: StaleAdminRecord[];
  /** Present only when applicability === 'admin-list-unavailable'; short reason. */
  adminListUnavailableReason?: 'rate-limited' | 'auth-failed' | 'network' | 'scope-insufficient' | 'unknown';
  /** Populated at classification time, in UTC ISO-8601, so the panel can relative-format. */
  resolvedAt: string;
}
```

**Validation rules**:

- When `applicability === 'not-applicable-non-org'`: `admins === []`, `mode === 'baseline'`, `adminListUnavailableReason` is absent.
- When `applicability === 'admin-list-unavailable'`: `admins === []`, `adminListUnavailableReason` is set.
- When `applicability === 'applicable'`: `admins` may be empty only if the GitHub API genuinely returned zero admins (edge case in spec); the panel renders a "zero admins returned" explicit state in that case.
- `thresholdDays` MUST be one of `{30, 60, 90, 180, 365}` at the type level (`StaleAdminThresholdDays` union enforced at compile time).

---

### `StaleAdminThresholdDays` (config, not state)

```ts
export const STALE_ADMIN_ALLOWED_THRESHOLDS_DAYS = [30, 60, 90, 180, 365] as const;
export type StaleAdminThresholdDays = (typeof STALE_ADMIN_ALLOWED_THRESHOLDS_DAYS)[number];
export const STALE_ADMIN_THRESHOLD_DAYS: StaleAdminThresholdDays = 90;
```

Lives in `lib/config/governance.ts`. Consumed by both classifier (for comparison) and panel (for tooltip text). Never inlined elsewhere.

---

## State machine — admin activity resolution

```text
┌─────────────────┐
│  admin in list  │
└────────┬────────┘
         │
         ▼
  fetch public events
         │
  ┌──────┴──────────────────────────────┐
  │ events success, non-empty           │ → classification = active | stale (compared to threshold)
  │ events success, empty               │ → fall through to commit search
  │ events error (rate-limited)         │ → classification = unavailable (reason: rate-limited)
  │ events error (user 404)             │ → classification = unavailable (reason: admin-account-404)
  │ events error (other)                │ → fall through to commit search
  └──────┬──────────────────────────────┘
         │
         ▼
  fetch commit search (author:user org:org)
         │
  ┌──────┴──────────────────────────────┐
  │ search success, non-empty           │ → classification = active | stale
  │ search success, empty               │ → classification = no-public-activity
  │ search error (rate-limited)         │ → classification = unavailable (reason: rate-limited)
  │ search error (other)                │ → classification = unavailable (reason: commit-search-failed)
  └─────────────────────────────────────┘
```

The `classification = active | stale` arrow applies the threshold comparison:
- `age_days = (resolvedAt - lastActivityAt) / 86400000`
- `classification = age_days > thresholdDays ? 'stale' : 'active'` (boundary-inclusive in favor of `active`, per spec edge case).

---

## Entity relationships

```text
StaleAdminsSection 1 ─────* StaleAdminRecord
                   │
                   └── StaleAdminMode (enum)
                   └── StaleAdminThresholdDays (config-constrained number)
                   └── applicability (enum)
```

No persistence. The section is computed at analysis time by the aggregator and held in the same in-memory result object as existing org-aggregation panels.
