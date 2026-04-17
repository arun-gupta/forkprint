'use client'

import { useState } from 'react'
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
  // admin:org is a strict superset of read:org — treat either as "elevated"
  // for the concealed-admins view.
  const elevated = hasScope('read:org') || hasScope('admin:org')
  const hasOverride = sectionOverride !== undefined

  const hookState = useStaleAdmins({
    org: hasOverride ? null : org,
    ownerType,
    token: hasOverride ? null : session?.token ?? null,
    elevated,
  })

  const section = hasOverride ? sectionOverride : hookState.section
  const loading = loadingOverride ?? (hasOverride ? false : hookState.loading)
  const [expanded, setExpanded] = useState(true)

  return (
    <section
      aria-label="Org admin activity"
      className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"
      data-testid="stale-admins-panel"
    >
      <header className={expanded ? 'mb-3' : ''}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex min-w-0 items-start gap-2">
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              aria-label={expanded ? 'Collapse Org admin activity' : 'Expand Org admin activity'}
              aria-expanded={expanded}
              title={expanded ? 'Collapse' : 'Expand'}
              data-testid="stale-admins-panel-toggle"
              className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <PanelChevron expanded={expanded} />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Org admin activity
                </h3>
                <ScoringHelp section={section} />
              </div>
              {expanded ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Stale admin detection — an inactive admin is a privilege-escalation risk.
                </p>
              ) : null}
            </div>
          </div>
          {section ? <ModeBadge mode={section.mode} /> : null}
        </div>
        {section ? <HeaderCountStrip section={section} /> : null}
      </header>

      {expanded ? (
        <>
          {loading ? <p className="text-sm text-slate-500 dark:text-slate-400">Loading admin activity…</p> : null}
          {!loading && section ? <SectionBody section={section} /> : null}
        </>
      ) : null}
    </section>
  )
}

function PanelChevron({ expanded }: { expanded: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`h-4 w-4 transition-transform ${expanded ? '' : '-rotate-90'}`}
    >
      <path d="M4 6l4 4 4-4" />
    </svg>
  )
}

function HeaderCountStrip({ section }: { section: StaleAdminsSection }) {
  if (section.applicability !== 'applicable' || section.admins.length === 0) return null
  const counts = countByClassification(section.admins)
  const total = section.admins.length
  return (
    <div
      className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs"
      data-testid="stale-admins-count-strip"
      aria-label={`Admin summary — ${total} admins`}
    >
      <span className="font-medium text-slate-700 dark:text-slate-200">
        {total} admin{total === 1 ? '' : 's'}
      </span>
      <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">
        ·
      </span>
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
      <span>
        {count} {config.label.toLowerCase()}
      </span>
    </span>
  )
}

function countByClassification(
  admins: StaleAdminRecord[],
): Record<StaleAdminClassification, number> {
  const counts: Record<StaleAdminClassification, number> = {
    active: 0,
    stale: 0,
    'no-public-activity': 0,
    unavailable: 0,
  }
  for (const a of admins) counts[a.classification]++
  return counts
}

function ScoringHelp({ section }: { section: StaleAdminsSection | null }) {
  return (
    <details className="relative" data-testid="stale-admins-scoring-help">
      <summary
        aria-label="How is this scored?"
        className="inline-flex h-4 w-4 cursor-pointer select-none items-center justify-center rounded-full border border-slate-300 bg-white text-[10px] font-semibold text-slate-500 list-none hover:border-slate-400 hover:text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400 dark:hover:border-slate-500 dark:hover:text-slate-200 [&::-webkit-details-marker]:hidden dark:bg-slate-900"
      >
        ?
      </summary>
      <div className="absolute left-0 top-6 z-10 w-72 rounded-md border border-slate-200 bg-white p-3 text-xs text-slate-600 shadow-md dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:bg-slate-900">
        <p className="mb-1 font-medium text-slate-700 dark:text-slate-200">How is this scored?</p>
        <ThresholdDisclosure section={section} />
      </div>
    </details>
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
      <p className="text-sm text-rose-700 dark:text-rose-400 dark:text-rose-300" data-testid="stale-admins-unavailable">
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

  const grouped = groupByClassification(section.admins)

  return (
    <div className="space-y-2">
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
      className={`group rounded-md bg-slate-50 dark:bg-slate-800/40 ${config.headerBorderClassName} dark:bg-slate-800/60 `}
      data-testid={`stale-admins-group-${classification}`}
    >
      <summary
        className="flex cursor-pointer select-none items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-800 list-none dark:text-slate-100 [&::-webkit-details-marker]:hidden"
        aria-label={config.groupAriaLabel}
      >
        <GroupChevron />
        <span aria-hidden="true">{config.icon}</span>
        <span>{config.label}</span>
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${config.pillClassName}`}>
          {admins.length}
        </span>
      </summary>
      <ul role="list" className="divide-y divide-slate-200 px-3 pb-1.5 dark:divide-slate-700">
        {admins.map((admin) => (
          <AdminRow key={admin.username} admin={admin} />
        ))}
      </ul>
    </details>
  )
}

function GroupChevron() {
  return (
    <svg
      aria-hidden="true"
      data-testid="group-chevron"
      className="h-4 w-4 shrink-0 -rotate-90 text-slate-400 transition-transform group-open:rotate-0 dark:text-slate-500"
      viewBox="0 0 20 20"
      fill="currentColor"
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.938a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z"
        clipRule="evenodd"
      />
    </svg>
  )
}

function AdminRow({ admin }: { admin: StaleAdminRecord }) {
  return (
    <li
      className="flex flex-wrap items-baseline justify-between gap-2 py-1"
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
      <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
        <span>
          Last public activity: {admin.lastActivityAt.slice(0, 10)} ({formatRelative(admin.lastActivityAt)})
        </span>
        {admin.lastActivitySource === 'org-commit-search' ? (
          <span
            aria-label="Activity inferred from org commit search"
            title="Activity inferred from org commit search"
            className="inline-flex h-3.5 w-3.5 shrink-0 cursor-help items-center justify-center rounded-full border border-slate-300 text-[9px] text-slate-400 dark:border-slate-600 dark:text-slate-500"
            data-testid="stale-admin-commit-search-badge"
          >
            c
          </span>
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
