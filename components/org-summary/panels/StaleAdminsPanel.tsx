'use client'

import { useAuth } from '@/components/auth/AuthContext'
import { STALE_ADMIN_THRESHOLD_DAYS } from '@/lib/config/governance'
import { useStaleAdmins, type OwnerType } from '@/components/shared/hooks/useStaleAdmins'
import type {
  StaleAdminClassification,
  StaleAdminMode,
  StaleAdminRecord,
  StaleAdminsSection,
} from '@/lib/governance/stale-admins'

interface Props {
  org: string | null
  ownerType: OwnerType
  /** Override for tests. */
  sectionOverride?: StaleAdminsSection | null
  /** Override for tests. */
  loadingOverride?: boolean
}

// Risk-first ordering: the user's attention should go to Stale and Unavailable
// first. Active and No-public-activity are lower-attention and start collapsed.
const GROUP_ORDER: StaleAdminClassification[] = [
  'stale',
  'unavailable',
  'no-public-activity',
  'active',
]

const DEFAULT_OPEN: Record<StaleAdminClassification, boolean> = {
  stale: true,
  unavailable: true,
  'no-public-activity': false,
  active: false,
}

const GROUP_CONFIG: Record<
  StaleAdminClassification,
  { label: string; icon: string; pillClassName: string; groupAriaLabel: string; headerBorderClassName: string }
> = {
  stale: {
    label: 'Stale',
    icon: '⚠',
    pillClassName: 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-400',
    groupAriaLabel: 'Stale admins — past threshold',
    headerBorderClassName: 'border-l-4 border-rose-500',
  },
  unavailable: {
    label: 'Unavailable',
    icon: '?',
    pillClassName: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
    groupAriaLabel: 'Admins with unavailable activity',
    headerBorderClassName: 'border-l-4 border-amber-500',
  },
  'no-public-activity': {
    label: 'No public activity',
    icon: '–',
    pillClassName: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
    groupAriaLabel: 'Admins with no public activity — status cannot be determined',
    headerBorderClassName: 'border-l-4 border-slate-400',
  },
  active: {
    label: 'Active',
    icon: '✓',
    pillClassName: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400',
    groupAriaLabel: 'Active admins — within threshold',
    headerBorderClassName: 'border-l-4 border-emerald-500',
  },
}

export function StaleAdminsPanel({ org, ownerType, sectionOverride, loadingOverride }: Props) {
  const { session, hasScope } = useAuth()
  const elevated = hasScope('read:org')
  const hasOverride = sectionOverride !== undefined

  const hookState = useStaleAdmins({
    org: hasOverride ? null : org,
    ownerType,
    token: hasOverride ? null : session?.token ?? null,
    elevated,
  })

  const section = hasOverride ? sectionOverride : hookState.section
  const loading = loadingOverride ?? (hasOverride ? false : hookState.loading)

  return (
    <section
      aria-label="Org admin activity"
      className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"
      data-testid="stale-admins-panel"
    >
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Org admin activity
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Stale admin detection — an inactive admin is a privilege-escalation risk.
          </p>
        </div>
        {section ? <ModeBadge mode={section.mode} /> : null}
      </header>

      {loading ? <p className="text-sm text-slate-500 dark:text-slate-400">Loading admin activity…</p> : null}

      {!loading && section ? <SectionBody section={section} /> : null}

      <details className="mt-4 text-xs text-slate-500 dark:text-slate-400">
        <summary className="cursor-pointer select-none">How is this scored?</summary>
        <ThresholdDisclosure section={section} />
      </details>
    </section>
  )
}

function SectionBody({ section }: { section: StaleAdminsSection }) {
  if (section.applicability === 'not-applicable-non-org') {
    return (
      <p className="text-sm text-slate-600 dark:text-slate-300" data-testid="stale-admins-na">
        Not applicable for non-organization targets. Stale-admin detection only applies to GitHub
        organizations; this analysis targets a user-owned repository.
      </p>
    )
  }

  if (section.applicability === 'admin-list-unavailable') {
    return (
      <p className="text-sm text-rose-700 dark:text-rose-400" data-testid="stale-admins-unavailable">
        Admin list could not be retrieved —{' '}
        <span className="font-medium">{section.adminListUnavailableReason ?? 'unknown'}</span>.
      </p>
    )
  }

  if (section.admins.length === 0) {
    return (
      <p className="text-sm text-slate-600 dark:text-slate-300">
        No admins were returned for this organization.
      </p>
    )
  }

  const counts = countByClassification(section.admins)
  const grouped = groupByClassification(section.admins)

  return (
    <div className="space-y-3">
      <CountStrip counts={counts} total={section.admins.length} />
      {GROUP_ORDER.filter((c) => grouped[c].length > 0).map((classification) => (
        <GroupSection
          key={classification}
          classification={classification}
          admins={grouped[classification]}
          defaultOpen={DEFAULT_OPEN[classification]}
        />
      ))}
    </div>
  )
}

function CountStrip({
  counts,
  total,
}: {
  counts: Record<StaleAdminClassification, number>
  total: number
}) {
  return (
    <div
      className="flex flex-wrap items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
      data-testid="stale-admins-count-strip"
      aria-label={`Admin summary — ${total} admins`}
    >
      <span className="font-medium text-slate-700 dark:text-slate-200">{total} admin{total === 1 ? '' : 's'}</span>
      <span className="text-slate-300 dark:text-slate-600">·</span>
      {GROUP_ORDER.map((c) => (
        <CountPill key={c} classification={c} count={counts[c]} />
      ))}
    </div>
  )
}

function CountPill({
  classification,
  count,
}: {
  classification: StaleAdminClassification
  count: number
}) {
  const config = GROUP_CONFIG[classification]
  const dim = count === 0
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ${config.pillClassName} ${dim ? 'opacity-40' : ''}`}
      data-testid={`stale-admins-count-${classification}`}
    >
      <span aria-hidden="true">{config.icon}</span>
      {count} {config.label.toLowerCase()}
    </span>
  )
}

function GroupSection({
  classification,
  admins,
  defaultOpen,
}: {
  classification: StaleAdminClassification
  admins: StaleAdminRecord[]
  defaultOpen: boolean
}) {
  const config = GROUP_CONFIG[classification]
  return (
    <details
      open={defaultOpen}
      className={`rounded-md bg-slate-50 dark:bg-slate-800/40 ${config.headerBorderClassName}`}
      data-testid={`stale-admins-group-${classification}`}
    >
      <summary
        className="flex cursor-pointer select-none items-center gap-2 px-3 py-2 text-sm font-medium text-slate-800 dark:text-slate-100"
        aria-label={config.groupAriaLabel}
      >
        <span aria-hidden="true">{config.icon}</span>
        <span>{config.label}</span>
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${config.pillClassName}`}>
          {admins.length}
        </span>
      </summary>
      <ul role="list" className="divide-y divide-slate-200 px-3 pb-2 dark:divide-slate-700">
        {admins.map((admin) => (
          <AdminRow key={admin.username} admin={admin} />
        ))}
      </ul>
    </details>
  )
}

function AdminRow({ admin }: { admin: StaleAdminRecord }) {
  return (
    <li
      className="flex flex-wrap items-baseline justify-between gap-2 py-1.5"
      data-testid={`stale-admin-row-${admin.classification}`}
    >
      <a
        href={`https://github.com/${admin.username}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm font-medium text-slate-900 hover:underline dark:text-slate-100"
      >
        {admin.username}
      </a>
      <RowDetail admin={admin} />
    </li>
  )
}

function RowDetail({ admin }: { admin: StaleAdminRecord }) {
  if (admin.lastActivityAt) {
    return (
      <span className="text-xs text-slate-500 dark:text-slate-400">
        Last public activity: {admin.lastActivityAt.slice(0, 10)} ({formatRelative(admin.lastActivityAt)})
        {admin.lastActivitySource === 'org-commit-search' ? (
          <span className="ml-1 text-slate-400">(commit search)</span>
        ) : null}
      </span>
    )
  }
  if (admin.classification === 'no-public-activity') {
    return (
      <span className="text-xs text-slate-500 dark:text-slate-400">No public activity available.</span>
    )
  }
  if (admin.classification === 'unavailable') {
    return (
      <span className="text-xs text-slate-500 dark:text-slate-400">
        Activity could not be retrieved ({admin.unavailableReason ?? 'unknown'}).
      </span>
    )
  }
  return null
}

function ModeBadge({ mode }: { mode: StaleAdminMode }) {
  const config = MODE_CONFIG[mode]
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${config.className}`}
      data-testid={`stale-admins-mode-${mode}`}
    >
      {config.label}
    </span>
  )
}

const MODE_CONFIG: Record<StaleAdminMode, { label: string; className: string }> = {
  baseline: {
    label: 'Baseline — public admins only',
    className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
  },
  'elevated-effective': {
    label: 'Elevated — includes concealed admins',
    className: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300',
  },
  'elevated-ineffective': {
    label: 'Elevated grant did not widen this view',
    className: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  },
}

function ThresholdDisclosure({ section }: { section: StaleAdminsSection | null }) {
  const threshold = section?.thresholdDays ?? STALE_ADMIN_THRESHOLD_DAYS
  return (
    <div className="mt-2 space-y-1.5">
      <p>
        An admin is flagged <span className="font-medium">stale</span> when their most recent
        public activity is older than{' '}
        <span className="font-semibold" data-testid="stale-admins-threshold-days">
          {threshold} days
        </span>
        .
      </p>
      <p>
        Only <span className="font-medium">publicly visible activity</span> is evaluated. Private
        contributions, admin-only audit events, and activity on private repositories are not
        considered.
      </p>
      <p>
        GitHub public activity data is{' '}
        <span className="font-medium">eventually consistent</span>. Timestamps may lag reality by
        minutes to hours.
      </p>
    </div>
  )
}

function formatRelative(iso: string | null): string {
  if (!iso) return ''
  const ms = Date.parse(iso)
  if (Number.isNaN(ms)) return ''
  const days = Math.floor((Date.now() - ms) / 86_400_000)
  if (days < 1) return 'today'
  if (days < 2) return 'yesterday'
  if (days < 30) return `${days} days ago`
  if (days < 365) return `${Math.floor(days / 30)} months ago`
  return `${Math.floor(days / 365)} years ago`
}

function countByClassification(admins: StaleAdminRecord[]): Record<StaleAdminClassification, number> {
  const counts: Record<StaleAdminClassification, number> = {
    active: 0,
    stale: 0,
    'no-public-activity': 0,
    unavailable: 0,
  }
  for (const a of admins) counts[a.classification]++
  return counts
}

function groupByClassification(
  admins: StaleAdminRecord[],
): Record<StaleAdminClassification, StaleAdminRecord[]> {
  const groups: Record<StaleAdminClassification, StaleAdminRecord[]> = {
    active: [],
    stale: [],
    'no-public-activity': [],
    unavailable: [],
  }
  for (const a of admins) groups[a.classification].push(a)
  return groups
}
