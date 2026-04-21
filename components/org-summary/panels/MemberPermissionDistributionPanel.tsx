'use client'

import { useState } from 'react'
import { useAuth } from '@/components/auth/AuthContext'
import {
  useMemberPermissionDistribution,
  type OwnerType,
} from '@/components/shared/hooks/useMemberPermissionDistribution'
import {
  evaluatePermissionFlag,
  type MemberPermissionDistributionSection,
  type PermissionFlag,
} from '@/lib/governance/member-permissions'

interface Props {
  org: string | null
  ownerType: OwnerType
  /** True when the session has read:org or admin:org scope — enables full member visibility */
  elevated?: boolean
  /** Override for tests and demo fixtures */
  sectionOverride?: MemberPermissionDistributionSection | null
  /** Override for tests */
  loadingOverride?: boolean
}

export function MemberPermissionDistributionPanel({
  org,
  ownerType,
  elevated = false,
  sectionOverride,
  loadingOverride,
}: Props) {
  const { session } = useAuth()
  const hasOverride = sectionOverride !== undefined

  const hookState = useMemberPermissionDistribution({
    org: hasOverride ? null : org,
    ownerType,
    token: hasOverride ? null : session?.token ?? null,
  })

  const section = hasOverride ? sectionOverride : hookState.section
  const loading = loadingOverride ?? (hasOverride ? false : hookState.loading)
  const [expanded, setExpanded] = useState(true)

  const computedFlag: PermissionFlag | null =
    section && section.applicability === 'applicable' && section.adminCount !== null
      ? (section.flag !== undefined
          ? (section.flag ?? null)
          : evaluatePermissionFlag(
              section.adminCount,
              section.adminCount +
                (section.memberCount ?? 0) +
                (section.outsideCollaboratorCount ?? 0),
            ))
      : null

  return (
    <section
      aria-label="Member permission distribution"
      className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"
      data-testid="member-permission-panel"
    >
      <header className={expanded ? 'mb-3' : ''}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex min-w-0 items-start gap-2">
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              aria-label={expanded ? 'Collapse Member permission distribution' : 'Expand Member permission distribution'}
              aria-expanded={expanded}
              title={expanded ? 'Collapse' : 'Expand'}
              data-testid="member-permission-panel-toggle"
              className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <PanelChevron expanded={expanded} />
            </button>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Member permission distribution
              </h3>
              {expanded ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Breakdown of org members by role — admins, members, and outside collaborators.
                </p>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!elevated && section?.applicability === 'applicable' ? (
              <span
                className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs text-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400"
                title="Sign in with 'Read org membership' or 'Org admin' permission to see private member counts"
              >
                Baseline — public members only
              </span>
            ) : null}
            {computedFlag ? <FlagBadge flag={computedFlag} /> : null}
          </div>
        </div>
      </header>

      {expanded ? (
        <>
          {loading ? (
            <p className="text-sm text-slate-500 dark:text-slate-400" data-testid="perm-loading">
              Loading member distribution…
            </p>
          ) : null}
          {!loading && section ? (
            <SectionBody section={section} org={org ?? ''} elevated={elevated} />
          ) : null}
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

function FlagBadge({ flag }: { flag: PermissionFlag }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-400"
      data-testid="perm-flag-badge"
      aria-label={`Admin-heavy flag: ${flag.message}`}
    >
      <span aria-hidden="true">⚠</span>
      <span>{flag.message}</span>
    </span>
  )
}

function SectionBody({
  section,
  org,
  elevated,
}: {
  section: MemberPermissionDistributionSection
  org: string
  elevated: boolean
}) {
  if (section.applicability === 'not-applicable-non-org') {
    return (
      <p
        className="text-sm text-slate-600 dark:text-slate-300"
        data-testid="perm-na"
      >
        Not applicable — member roles are an organization-level concept. This analysis targets a
        user-owned repository.
      </p>
    )
  }

  if (section.applicability === 'member-list-unavailable') {
    return (
      <p
        className="text-sm text-rose-700 dark:text-rose-400"
        data-testid="perm-unavailable"
      >
        Member list could not be retrieved — insufficient permissions or private organization.
      </p>
    )
  }

  const adminVal = section.adminCount ?? 0
  // Without read:org scope, private non-admin members are invisible to the API.
  // When memberCount computes to 0 in public-only mode, treat it as unknown.
  const effectiveMemberCount =
    !elevated && section.memberCount === 0 ? null : section.memberCount
  const memberCount = effectiveMemberCount ?? 0
  const collabCount = section.outsideCollaboratorCount ?? 0
  const total = adminVal + memberCount + collabCount
  const adminPct = total > 0 ? Math.round((adminVal / total) * 100) : 0
  const memberPct = total > 0 ? Math.round((memberCount / total) * 100) : 0
  const collabPct = total > 0 ? Math.round((collabCount / total) * 100) : 0

  const adminUrl = `https://github.com/orgs/${org}/people?query=role%3Aowner`
  const memberUrl = `https://github.com/orgs/${org}/people?query=role%3Amember`

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2 text-sm">
        <RoleRow
          label="Admins"
          count={section.adminCount}
          pct={adminPct}
          countTestId="perm-admin-count"
          pctTestId="perm-admin-pct"
          linkTestId="perm-admin-link"
          href={adminUrl}
        />
        <RoleRow
          label="Members"
          count={effectiveMemberCount}
          pct={memberPct}
          countTestId="perm-member-count"
          pctTestId="perm-member-pct"
          linkTestId="perm-member-link"
          href={memberUrl}
        />
        <RoleRow
          label="Outside collaborators"
          count={section.outsideCollaboratorCount}
          pct={collabPct}
          countTestId="perm-collab-count"
          pctTestId="perm-collab-pct"
          linkTestId={null}
          href={null}
        />
      </div>
      {!elevated ? (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Showing public members only. Sign in with{' '}
          <span className="font-medium">Read org membership</span> or{' '}
          <span className="font-medium">Org admin</span> permission for full counts.
        </p>
      ) : section.applicability === 'partial' && section.unavailableReasons.length > 0 ? (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Some data unavailable:{' '}
          {section.unavailableReasons.join(', ')}
        </p>
      ) : null}
    </div>
  )
}

function RoleRow({
  label,
  count,
  pct,
  countTestId,
  pctTestId,
  linkTestId,
  href,
}: {
  label: string
  count: number | null
  pct: number
  countTestId: string
  pctTestId: string
  linkTestId: string | null
  href: string | null
}) {
  const countContent = (
    <span
      className="font-semibold text-slate-900 dark:text-slate-100"
      data-testid={countTestId}
    >
      {count ?? 'Unavailable'}
    </span>
  )

  return (
    <div className="rounded border border-slate-100 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-800">
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <div className="flex items-baseline gap-1">
        {href && linkTestId ? (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            data-testid={linkTestId}
            className="hover:underline"
          >
            {countContent}
          </a>
        ) : (
          countContent
        )}
        {count !== null ? (
          <span className="text-xs text-slate-500 dark:text-slate-400" data-testid={pctTestId}>
            ({pct}%)
          </span>
        ) : null}
      </div>
    </div>
  )
}
