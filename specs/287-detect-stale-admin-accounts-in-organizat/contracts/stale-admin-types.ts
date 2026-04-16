// Contract: types and pure-function signatures for stale-admin detection.
// This file is an illustrative contract — NOT a build target. The production
// source lives under `lib/governance/` and `lib/config/governance.ts`. If
// production shapes drift from this file, update this file in the same PR.

// ── Config (lib/config/governance.ts) ─────────────────────────────────────

export const STALE_ADMIN_ALLOWED_THRESHOLDS_DAYS = [30, 60, 90, 180, 365] as const;
export type StaleAdminThresholdDays = (typeof STALE_ADMIN_ALLOWED_THRESHOLDS_DAYS)[number];
export const STALE_ADMIN_THRESHOLD_DAYS: StaleAdminThresholdDays = 90;
export declare function isValidStaleAdminThreshold(n: unknown): n is StaleAdminThresholdDays;

// ── Domain types (lib/governance/stale-admins.ts) ─────────────────────────

export type StaleAdminClassification =
  | 'active'
  | 'stale'
  | 'no-public-activity'
  | 'unavailable';

export type StaleAdminMode =
  | 'baseline'
  | 'elevated-effective'
  | 'elevated-ineffective';

export interface StaleAdminRecord {
  username: string;
  classification: StaleAdminClassification;
  lastActivityAt: string | null;
  lastActivitySource: 'public-events' | 'org-commit-search' | null;
  unavailableReason:
    | 'admin-account-404'
    | 'events-fetch-failed'
    | 'commit-search-failed'
    | 'rate-limited'
    | null;
}

export interface StaleAdminsSection {
  kind: 'stale-admins';
  applicability: 'applicable' | 'not-applicable-non-org' | 'admin-list-unavailable';
  mode: StaleAdminMode;
  thresholdDays: StaleAdminThresholdDays;
  admins: StaleAdminRecord[];
  adminListUnavailableReason?:
    | 'rate-limited'
    | 'auth-failed'
    | 'network'
    | 'scope-insufficient'
    | 'unknown';
  resolvedAt: string;
}

// ── Pure classifier (no I/O) ──────────────────────────────────────────────

export interface AdminActivityInput {
  username: string;
  /** null if neither source returned a timestamp without error. */
  lastActivityAt: string | null;
  lastActivitySource: 'public-events' | 'org-commit-search' | null;
  /** If set, produces an `unavailable` record regardless of lastActivityAt. */
  error: StaleAdminRecord['unavailableReason'];
}

export declare function classifyAdmin(
  input: AdminActivityInput,
  thresholdDays: StaleAdminThresholdDays,
  now: Date,
): StaleAdminRecord;

// ── Aggregator entrypoint (lib/org-aggregation/aggregators/stale-admins.ts) ─

export interface StaleAdminAggregatorContext {
  org: string;
  ownerType: 'User' | 'Organization';
  session: {
    token: string;
    scopes: readonly string[];
  };
}

export declare function buildStaleAdminsSection(
  ctx: StaleAdminAggregatorContext,
): Promise<StaleAdminsSection>;
