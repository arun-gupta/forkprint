'use client'

import { useState } from 'react'
import { useAuth } from '@/components/auth/AuthContext'
import {
  useTwoFactorEnforcement,
  type OwnerType,
} from '@/components/shared/hooks/useTwoFactorEnforcement'
import type {
  TwoFactorEnforcementSection,
  TwoFactorEnforcementStatus,
} from '@/lib/governance/two-factor'

interface Props {
  org: string | null
  ownerType: OwnerType
  /** Override for tests. */
  sectionOverride?: TwoFactorEnforcementSection | null
  /** Override for tests. */
  loadingOverride?: boolean
}

const STATUS_CONFIG: Record<
  TwoFactorEnforcementStatus,
  { label: string; icon: string; badgeClassName: string; ariaLabel: string }
> = {
  enforced: {
    label: '2FA enforced',
    icon: '✓',
    badgeClassName:
      'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400',
    ariaLabel: '2FA enforced for all organization members',
  },
  'not-enforced': {
    label: '2FA not enforced',
    icon: '⚠',
    badgeClassName: 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-400',
    ariaLabel: '2FA is not enforced for organization members',
  },
  unknown: {
    label: '2FA status unknown',
    icon: '?',
    badgeClassName: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
    ariaLabel: '2FA enforcement status could not be determined',
  },
}

export function TwoFactorEnforcementPanel({
  org,
  ownerType,
  sectionOverride,
  loadingOverride,
}: Props) {
  const { session } = useAuth()
  const hasOverride = sectionOverride !== undefined

  const hookState = useTwoFactorEnforcement({
    org: hasOverride ? null : org,
    ownerType,
    token: hasOverride ? null : session?.token ?? null,
  })

  const section = hasOverride ? sectionOverride : hookState.section
  const loading = loadingOverride ?? (hasOverride ? false : hookState.loading)
  const [expanded, setExpanded] = useState(true)

  return (
    <section
      aria-label="Org 2FA enforcement"
      className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"
      data-testid="two-factor-panel"
    >
      <header className={expanded ? 'mb-3' : ''}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex min-w-0 items-start gap-2">
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              aria-label={expanded ? 'Collapse Org 2FA enforcement' : 'Expand Org 2FA enforcement'}
              aria-expanded={expanded}
              title={expanded ? 'Collapse' : 'Expand'}
              data-testid="two-factor-panel-toggle"
              className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <PanelChevron expanded={expanded} />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Org 2FA enforcement
                </h3>
                <ScoringHelp />
              </div>
              {expanded ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Whether this organization requires two-factor authentication for all members.
                </p>
              ) : null}
            </div>
          </div>
          {section && section.applicability === 'applicable' && section.status ? (
            <StatusBadge status={section.status} />
          ) : null}
        </div>
      </header>

      {expanded ? (
        <>
          {loading ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">Loading 2FA status…</p>
          ) : null}
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

function StatusBadge({ status }: { status: TwoFactorEnforcementStatus }) {
  const config = STATUS_CONFIG[status]
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${config.badgeClassName}`}
      data-testid={`two-factor-status-${status}`}
      aria-label={config.ariaLabel}
    >
      <span aria-hidden="true">{config.icon}</span>
      <span>{config.label}</span>
    </span>
  )
}

function SectionBody({ section }: { section: TwoFactorEnforcementSection }) {
  if (section.applicability === 'not-applicable-non-org') {
    return (
      <p
        className="text-sm text-slate-600 dark:text-slate-300"
        data-testid="two-factor-na"
      >
        Not applicable for non-organization targets. 2FA enforcement is an organization-level
        setting; this analysis targets a user-owned repository.
      </p>
    )
  }

  if (section.applicability === 'org-lookup-unavailable') {
    return (
      <p
        className="text-sm text-rose-700 dark:text-rose-400"
        data-testid="two-factor-unavailable"
      >
        Organization lookup could not be retrieved —{' '}
        <span className="font-medium">{section.lookupUnavailableReason ?? 'unknown'}</span>.
      </p>
    )
  }

  if (section.status === 'unknown') {
    return (
      <p
        className="text-sm text-slate-600 dark:text-slate-300"
        data-testid="two-factor-unknown-explain"
      >
        GitHub does not expose the <code className="font-mono text-xs">two_factor_requirement_enabled</code>{' '}
        field to this session. Unknown is <span className="font-medium">not the same as not enforced</span> —
        only an organization owner can read this flag.
      </p>
    )
  }

  if (section.status === 'enforced') {
    return (
      <p className="text-sm text-slate-600 dark:text-slate-300">
        All members of this organization are required to enable two-factor authentication.
      </p>
    )
  }

  if (section.status === 'not-enforced') {
    return (
      <p className="text-sm text-slate-600 dark:text-slate-300">
        This organization does not require members to enable two-factor authentication. Enabling
        the requirement reduces the blast radius of credential compromise.
      </p>
    )
  }

  return null
}

function ScoringHelp() {
  return (
    <details className="relative" data-testid="two-factor-scoring-help">
      <summary
        aria-label="How is this scored?"
        className="inline-flex h-4 w-4 cursor-pointer select-none items-center justify-center rounded-full border border-slate-300 bg-white text-[10px] font-semibold text-slate-500 list-none hover:border-slate-400 hover:text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400 dark:hover:border-slate-500 dark:hover:text-slate-200 [&::-webkit-details-marker]:hidden"
      >
        ?
      </summary>
      <div className="absolute left-0 top-6 z-10 w-72 rounded-md border border-slate-200 bg-white p-3 text-xs text-slate-600 shadow-md dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
        <p className="mb-1 font-medium text-slate-700 dark:text-slate-200">How is this scored?</p>
        <p className="mb-1.5">
          Value is read from GitHub&apos;s{' '}
          <code className="font-mono text-[11px]">two_factor_requirement_enabled</code> field on{' '}
          <code className="font-mono text-[11px]">GET /orgs/&#123;org&#125;</code>.
        </p>
        <p className="mb-1.5">
          The field is only populated for authenticated <span className="font-medium">organization owners</span>. Other sessions
          receive <span className="font-medium">null</span>, which we surface as{' '}
          <span className="font-medium">unknown</span> — never confused with{' '}
          <span className="font-medium">not enforced</span>.
        </p>
        <p>This signal is observation-only and does not feed the composite OSS Health Score.</p>
      </div>
    </details>
  )
}
