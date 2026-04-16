'use client'

import { useMemo } from 'react'
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

  return (
    <ul role="list" className="divide-y divide-slate-200 dark:divide-slate-700">
      {section.admins.map((admin) => (
        <AdminRow key={admin.username} admin={admin} />
      ))}
    </ul>
  )
}

function AdminRow({ admin }: { admin: StaleAdminRecord }) {
  const relativeText = useMemo(() => formatRelative(admin.lastActivityAt), [admin.lastActivityAt])
  return (
    <li
      className="flex flex-wrap items-center justify-between gap-2 py-2"
      data-testid={`stale-admin-row-${admin.classification}`}
    >
      <div className="flex flex-col">
        <a
          href={`https://github.com/${admin.username}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-slate-900 hover:underline dark:text-slate-100"
        >
          {admin.username}
        </a>
        {admin.lastActivityAt ? (
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Last public activity: {admin.lastActivityAt.slice(0, 10)} ({relativeText})
            {admin.lastActivitySource === 'org-commit-search' ? (
              <span className="ml-1 text-slate-400">(commit search)</span>
            ) : null}
          </span>
        ) : admin.classification === 'no-public-activity' ? (
          <span className="text-xs text-slate-500 dark:text-slate-400">
            No public activity available.
          </span>
        ) : admin.classification === 'unavailable' ? (
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Activity could not be retrieved ({admin.unavailableReason ?? 'unknown'}).
          </span>
        ) : null}
      </div>
      <ClassificationBadge classification={admin.classification} />
    </li>
  )
}

function ClassificationBadge({ classification }: { classification: StaleAdminClassification }) {
  const config = BADGE_CONFIG[classification]
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className}`}
      data-testid={`stale-admin-badge-${classification}`}
      aria-label={config.ariaLabel}
    >
      {config.icon ? <span className="mr-1">{config.icon}</span> : null}
      {config.label}
    </span>
  )
}

const BADGE_CONFIG: Record<
  StaleAdminClassification,
  { label: string; ariaLabel: string; className: string; icon: string | null }
> = {
  active: {
    label: 'Active',
    ariaLabel: 'Active admin',
    className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400',
    icon: null,
  },
  stale: {
    label: 'Stale',
    ariaLabel: 'Stale admin past threshold',
    className: 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-400',
    icon: '⚠',
  },
  'no-public-activity': {
    label: 'No public activity',
    ariaLabel: 'No public activity visible; stale status cannot be determined',
    className: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
    icon: '–',
  },
  unavailable: {
    label: 'Unavailable',
    ariaLabel: 'Activity data unavailable',
    className: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
    icon: '?',
  },
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
