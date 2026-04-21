'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/components/auth/AuthContext'
import { STALE_ADMIN_THRESHOLD_DAYS } from '@/lib/config/governance'
import { useStaleAdmins, type OwnerType } from '@/components/shared/hooks/useStaleAdmins'
import { useMemberPermissionDistribution } from '@/components/shared/hooks/useMemberPermissionDistribution'
import {
  evaluatePermissionFlag,
  type MemberPermissionDistributionSection,
  type MemberPermissionUnavailableReason,
  type PermissionFlag,
} from '@/lib/governance/member-permissions'
import type {
  StaleAdminClassification,
  StaleAdminMode,
  StaleAdminRecord,
  StaleAdminsSection,
  StaleAdminUnavailableReason,
} from '@/lib/governance/stale-admins'

interface Props {
  org: string | null
  ownerType: OwnerType
  /** Override for tests and demo fixtures — stale admins data. */
  sectionOverride?: StaleAdminsSection | null
  /** Override for tests. */
  loadingOverride?: boolean
  /** Override for tests. */
  onRetryOverride?: () => void
  /** Override for tests. */
  nextAutoRetryAtOverride?: string | null
  /** Override for tests and demo fixtures — member permission data. */
  memberPermissionOverride?: MemberPermissionDistributionSection | null
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
    label: 'Activity unknown',
    icon: '?',
    pillClassName: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
    groupAriaLabel: 'Activity could not be retrieved — rate-limited or API error',
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

export function StaleAdminsPanel({
  org,
  ownerType,
  sectionOverride,
  loadingOverride,
  onRetryOverride,
  nextAutoRetryAtOverride,
  memberPermissionOverride,
}: Props) {
  const { session, hasScope, signOut } = useAuth()
  const isPAT = session?.isPAT === true
  // admin:org is a strict superset of read:org — treat either as "elevated"
  // for the concealed-admins view.
  const elevated = hasScope('read:org') || hasScope('admin:org')
  const hasStaleOverride = sectionOverride !== undefined
  const hasMemberOverride = memberPermissionOverride !== undefined

  const staleHookState = useStaleAdmins({
    org: hasStaleOverride ? null : org,
    ownerType,
    token: hasStaleOverride ? null : session?.token ?? null,
    elevated,
  })

  const memberHookState = useMemberPermissionDistribution({
    org: hasMemberOverride ? null : org,
    ownerType,
    token: hasMemberOverride ? null : session?.token ?? null,
  })

  const section = hasStaleOverride ? sectionOverride : staleHookState.section
  const loading = loadingOverride ?? (hasStaleOverride ? false : staleHookState.loading)
  const onRetry = onRetryOverride ?? staleHookState.refetch
  const nextAutoRetryAt =
    nextAutoRetryAtOverride !== undefined
      ? nextAutoRetryAtOverride
      : hasStaleOverride
        ? null
        : staleHookState.nextAutoRetryAt

  const memberSection = hasMemberOverride ? memberPermissionOverride : memberHookState.section
  const memberLoading = hasMemberOverride ? false : memberHookState.loading

  // OAuth restriction: elevated scope was granted but org blocks the OAuth app.
  // Detected once memberSection loads; until then, assumes elevated is effective.
  const oauthRestricted = elevated &&
    memberSection?.unavailableReasons?.includes('admin-list-possibly-oauth-restricted') === true
  const effectivelyElevated = elevated && !oauthRestricted

  const computedFlag: PermissionFlag | null =
    memberSection && memberSection.applicability === 'applicable' && memberSection.adminCount !== null
      ? (memberSection.flag !== undefined
          ? (memberSection.flag ?? null)
          : evaluatePermissionFlag(
              memberSection.adminCount,
              memberSection.adminCount +
                (memberSection.memberCount ?? 0) +
                (memberSection.outsideCollaboratorCount ?? 0),
            ))
      : null

  const [expanded, setExpanded] = useState(true)

  return (
    <section
      aria-label="Org member & admin overview"
      className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"
      data-testid="stale-admins-panel"
    >
      <header className={expanded ? 'mb-3' : ''}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex min-w-0 items-start gap-2">
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              aria-label={expanded ? 'Collapse Org member & admin overview' : 'Expand Org member & admin overview'}
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
                  Org member &amp; admin overview
                </h3>
                <ScoringHelp section={section} />
              </div>
              {expanded ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {effectivelyElevated
                    ? 'Member roles and admin activity — who has elevated access and whether they\'re active.'
                    : 'Public member overview — sign in with a PAT for full admin and member breakdown.'}
                </p>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!effectivelyElevated && memberSection?.applicability === 'applicable' ? (
              <span
                className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs text-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400"
                title="Sign in with 'Read org membership' or 'Org admin' permission to see private member counts"
              >
                Baseline — public members only
              </span>
            ) : null}
            {computedFlag ? <FlagBadge flag={computedFlag} /> : null}
            {section ? <ModeBadge mode={section.mode} /> : null}
          </div>
        </div>
        {section && effectivelyElevated ? <HeaderCountStrip section={section} elevated={effectivelyElevated} /> : null}
      </header>

      {expanded ? (
        <div className="space-y-4">
          {/* Permission distribution summary */}
          <MemberPermissionSummary
            section={memberSection}
            loading={memberLoading}
            org={org ?? ''}
            elevated={elevated}
            oauthRestricted={oauthRestricted}
            isPAT={isPAT}
            onSignOut={signOut}
          />

          {/* Activity detail — only shown with effective elevated scope (baseline = can't identify admins) */}
          <details open className="group" data-testid="stale-admins-activity-detail" hidden={!effectivelyElevated}>
            <summary className="flex cursor-pointer select-none items-center gap-1.5 text-xs font-medium text-slate-600 list-none dark:text-slate-300 [&::-webkit-details-marker]:hidden">
              <svg
                aria-hidden="true"
                className="h-3.5 w-3.5 shrink-0 -rotate-90 text-slate-400 transition-transform group-open:rotate-0 dark:text-slate-500"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.938a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z"
                  clipRule="evenodd"
                />
              </svg>
              {effectivelyElevated ? 'Admin activity detail' : 'Public member activity'}
            </summary>
            <div className="mt-2">
              {loading && !section ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {effectivelyElevated ? 'Loading admin activity…' : 'Loading public member activity…'}
                </p>
              ) : null}
              {section ? (
                <SectionBody
                  section={section}
                  onRetry={onRetry}
                  refreshing={loading}
                  nextAutoRetryAt={nextAutoRetryAt}
                  elevated={effectivelyElevated}
                />
              ) : null}
            </div>
          </details>
        </div>
      ) : null}
    </section>
  )
}

// ── Member permission summary ─────────────────────────────────────────────────

function MemberPermissionSummary({
  section,
  loading,
  org,
  elevated,
  oauthRestricted,
  isPAT,
  onSignOut,
}: {
  section: MemberPermissionDistributionSection | null
  loading: boolean
  org: string
  elevated: boolean
  oauthRestricted: boolean
  isPAT: boolean
  onSignOut: () => void
}) {
  if (loading) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400" data-testid="perm-loading">
        Loading member distribution…
      </p>
    )
  }
  if (!section) return null

  if (section.applicability === 'not-applicable-non-org') {
    return (
      <p className="text-sm text-slate-600 dark:text-slate-300" data-testid="perm-na">
        Not applicable — member roles are an organization-level concept. This analysis targets a
        user-owned repository.
      </p>
    )
  }

  if (section.applicability === 'member-list-unavailable') {
    return (
      <p className="text-sm text-rose-700 dark:text-rose-400" data-testid="perm-unavailable">
        Member list could not be retrieved — insufficient permissions or private organization.
      </p>
    )
  }

  // "Effectively elevated" = has elevated scope AND it actually widened the view.
  const effectivelyElevated = elevated && !oauthRestricted

  // Without effective elevated scope GitHub may return unreliable counts — hide admin count.
  const displayAdminCount = effectivelyElevated ? section.adminCount : null
  const adminVal = displayAdminCount ?? 0
  const effectiveMemberCount = section.memberCount === 0 ? null : section.memberCount
  const memberCount = effectiveMemberCount ?? 0
  const collabCount = section.outsideCollaboratorCount ?? 0
  const total = adminVal + memberCount + collabCount
  const adminPct = total > 0 ? Math.round((adminVal / total) * 100) : 0
  const memberPct = total > 0 ? Math.round((memberCount / total) * 100) : 0
  const collabPct = total > 0 ? Math.round((collabCount / total) * 100) : 0

  const publicCount = section.publicMemberCount ?? null
  const privateMemberCount =
    effectiveMemberCount !== null && publicCount !== null
      ? effectiveMemberCount - publicCount
      : null

  const adminUrl = `https://github.com/orgs/${org}/people?query=role%3Aowner`
  const memberUrl = `https://github.com/orgs/${org}/people?query=role%3Amember`

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2 text-sm">
        <RoleRow
          label="Admins"
          count={displayAdminCount}
          pct={adminPct}
          countTestId="perm-admin-count"
          pctTestId="perm-admin-pct"
          linkTestId="perm-admin-link"
          href={adminUrl}
          labelTooltip={!elevated ? 'Admin status cannot be verified without read:org scope — GitHub may return all visible public members from this endpoint regardless of their actual role.' : undefined}
        />
        <RoleRow
          label={effectivelyElevated ? 'Members' : 'Public members'}
          count={effectivelyElevated ? effectiveMemberCount : publicCount}
          pct={effectivelyElevated ? memberPct : null}
          countTestId="perm-member-count"
          pctTestId="perm-member-pct"
          linkTestId={effectivelyElevated ? 'perm-member-link' : null}
          href={effectivelyElevated ? memberUrl : null}
          publicCount={effectivelyElevated ? publicCount : null}
          privateCount={effectivelyElevated ? privateMemberCount : null}
        />
        <RoleRow
          label="Outside collaborators"
          count={section.outsideCollaboratorCount}
          pct={collabPct}
          countTestId="perm-collab-count"
          pctTestId="perm-collab-pct"
          linkTestId={null}
          href={null}
          labelTooltip="Requires org membership — available via a Personal Access Token with read:org scope from an org owner or admin."
          labelTooltipAlign="right"
        />
      </div>
      {oauthRestricted ? (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          This org restricts third-party OAuth app access — admin and member counts are unavailable.{' '}
          <button type="button" onClick={onSignOut} className="font-medium text-sky-700 hover:underline dark:text-sky-400">Sign out</button>
          {' and sign in again using a '}
          <span className="font-medium">Personal Access Token</span>
          {' with '}
          <code className="font-mono text-[0.7rem]">read:org</code>
          {' scope — PATs bypass OAuth app restrictions. You must also be a member of this org to see full member details and admin counts.'}
        </p>
      ) : !elevated ? (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Admin and member breakdown unavailable — org may restrict OAuth app access.{' '}
          {isPAT
            ? <>Add <code className="font-mono text-[0.7rem]">read:org</code> scope to your token for full counts.</>
            : <><button type="button" onClick={onSignOut} className="font-medium text-sky-700 hover:underline dark:text-sky-400">Sign out</button>{' and sign in again using a '}<span className="font-medium">Personal Access Token</span>{' with '}<code className="font-mono text-[0.7rem]">read:org</code>{' scope for full counts.'}</>
          }
        </p>
      ) : section.applicability === 'partial' && section.unavailableReasons.filter(r => r !== 'admin-list-possibly-oauth-restricted').length > 0 ? (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {formatUnavailableReasons(section.unavailableReasons.filter(r => r !== 'admin-list-possibly-oauth-restricted'))}
          {!isPAT && <>{' '}Use a <span className="font-medium">Personal Access Token</span> for full access.</>}
        </p>
      ) : null}
      {section.publicMembers && section.publicMembers.length > 0 ? (
        <PublicMemberList members={section.publicMembers} org={org} />
      ) : null}
    </div>
  )
}

function formatUnavailableReasons(reasons: MemberPermissionUnavailableReason[]): string {
  const labels: Record<MemberPermissionUnavailableReason, string> = {
    'admin-list-rate-limited': 'admin list rate-limited',
    'admin-list-auth-failed': 'admin list auth failed',
    'admin-list-scope-insufficient': 'admin list requires elevated scope',
    'admin-list-possibly-oauth-restricted': 'admin count restricted by org OAuth policy',
    'member-list-rate-limited': 'member list rate-limited',
    'member-list-auth-failed': 'member list auth failed',
    'member-list-scope-insufficient': 'member list requires elevated scope',
    'collaborator-list-rate-limited': 'outside collaborators rate-limited',
    'collaborator-list-auth-failed': 'outside collaborators auth failed',
    'collaborator-list-scope-insufficient': 'outside collaborators require Org admin permission',
    'network': 'network error',
    'unknown': 'unknown error',
  }
  const parts = reasons.map((r) => labels[r] ?? r)
  return `Some data unavailable: ${parts.join(', ')}.`
}

function RoleRow({
  label,
  count,
  pct,
  countTestId,
  pctTestId,
  linkTestId,
  href,
  publicCount,
  privateCount,
  labelTooltip,
  labelTooltipAlign,
}: {
  label: string
  count: number | null
  pct: number | null
  countTestId: string
  pctTestId: string
  linkTestId: string | null
  href: string | null
  publicCount?: number | null
  privateCount?: number | null
  labelTooltip?: string
  labelTooltipAlign?: 'left' | 'right'
}) {
  const countContent = (
    <span className="font-semibold text-slate-900 dark:text-slate-100" data-testid={countTestId}>
      {count ?? 'Not available'}
    </span>
  )

  return (
    <div className="rounded border border-slate-100 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-800">
      <div className="flex items-center gap-1">
        <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
        {labelTooltip ? <LabelTooltip text={labelTooltip} align={labelTooltipAlign} /> : null}
      </div>
      <div className="flex items-baseline gap-1">
        {href && linkTestId ? (
          <a href={href} target="_blank" rel="noreferrer" data-testid={linkTestId} className="hover:underline">
            {countContent}
          </a>
        ) : (
          countContent
        )}
        {count !== null && pct !== null ? (
          <span className="text-xs text-slate-500 dark:text-slate-400" data-testid={pctTestId}>
            ({pct}%)
          </span>
        ) : null}
      </div>
      {count !== null && publicCount !== null && publicCount !== undefined && privateCount !== null && privateCount !== undefined ? (
        <p className="mt-0.5 text-[10px] text-slate-400 dark:text-slate-500" data-testid="perm-member-split">
          {publicCount} public · {privateCount} private
        </p>
      ) : null}
    </div>
  )
}

function ElevateAccessLink({ tier, children }: { tier: 'read-org' | 'admin-org'; children: React.ReactNode }) {
  function handleClick() {
    if (typeof window !== 'undefined' && window.location.search) {
      sessionStorage.setItem('oauth_return_search', window.location.search)
    }
  }
  return (
    <a
      href={`/api/auth/login?scope_tier=${tier}`}
      onClick={handleClick}
      className="font-medium text-sky-700 underline-offset-2 hover:underline dark:text-sky-400"
    >
      {children}
    </a>
  )
}

function LabelTooltip({ text, align = 'left' }: { text: string; align?: 'left' | 'right' }) {
  return (
    <span className="group relative inline-flex">
      <span
        aria-label={text}
        className="inline-flex h-3.5 w-3.5 cursor-help items-center justify-center rounded-full border border-slate-300 text-[9px] font-semibold text-slate-400 dark:border-slate-600 dark:text-slate-500"
        data-testid="role-row-tooltip-trigger"
      >
        i
      </span>
      <span
        role="tooltip"
        className={`pointer-events-none absolute bottom-full z-20 mb-1.5 w-64 rounded-md border border-slate-200 bg-white px-3 py-2 text-left text-xs text-slate-600 opacity-0 shadow-md transition-opacity group-hover:opacity-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 ${align === 'right' ? 'right-0' : 'left-0'}`}
        data-testid="role-row-tooltip"
      >
        {text}
      </span>
    </span>
  )
}

const PUBLIC_MEMBER_PREVIEW_LIMIT = 20

function PublicMemberList({ members, org }: { members: { login: string; avatarUrl: string }[]; org: string }) {
  const [expanded, setExpanded] = useState(false)
  const [query, setQuery] = useState('')

  const filtered = query
    ? members.filter((m) => m.login.toLowerCase().includes(query.toLowerCase()))
    : members

  const isSearching = query.length > 0
  const shown = isSearching || expanded ? filtered : filtered.slice(0, PUBLIC_MEMBER_PREVIEW_LIMIT)
  const remaining = filtered.length - PUBLIC_MEMBER_PREVIEW_LIMIT

  return (
    <details
      open={false}
      className="group rounded border border-slate-100 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50"
      data-testid="public-member-list"
    >
      <summary className="flex cursor-pointer select-none items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 list-none dark:text-slate-300 [&::-webkit-details-marker]:hidden">
        <svg
          aria-hidden="true"
          className="h-3 w-3 shrink-0 -rotate-90 text-slate-400 transition-transform group-open:rotate-0 dark:text-slate-500"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.938a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z"
            clipRule="evenodd"
          />
        </svg>
        Public members ({members.length})
      </summary>
      <div className="border-t border-slate-100 px-3 py-2 dark:border-slate-700">
        <div className="mb-2 flex items-center gap-2">
          <div className="relative flex-1">
            <svg aria-hidden="true" className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" />
            </svg>
            <input
              type="search"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setExpanded(false) }}
              placeholder="Search members…"
              aria-label="Search public members"
              className="w-full rounded border border-slate-200 bg-white py-1 pl-7 pr-2 text-xs text-slate-700 placeholder-slate-400 focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:placeholder-slate-500"
              data-testid="public-member-search"
            />
          </div>
          {isSearching ? (
            <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400">
              {filtered.length} of {members.length}
            </span>
          ) : null}
        </div>

        {shown.length === 0 ? (
          <p className="py-1 text-xs text-slate-500 dark:text-slate-400">No members match &ldquo;{query}&rdquo;.</p>
        ) : (
          <ul className="flex flex-wrap gap-1.5" data-testid="public-member-list-items">
            {shown.map(({ login, avatarUrl }) => (
              <li key={login}>
                <a
                  href={`https://github.com/${login}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={login}
                  className="group/chip inline-flex items-center gap-1 rounded-full bg-white py-0.5 pl-0.5 pr-2 text-xs text-slate-700 ring-1 ring-slate-200 transition hover:ring-sky-300 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700 dark:hover:ring-sky-700"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`${avatarUrl}&s=32`}
                    alt=""
                    aria-hidden="true"
                    width={16}
                    height={16}
                    className="h-4 w-4 rounded-full bg-slate-100 dark:bg-slate-800"
                    loading="lazy"
                  />
                  <span className="group-hover/chip:text-sky-700 dark:group-hover/chip:text-sky-400">{login}</span>
                </a>
              </li>
            ))}
          </ul>
        )}

        {!isSearching && !expanded && remaining > 0 ? (
          <div className="mt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="text-xs text-sky-700 hover:underline dark:text-sky-400"
              data-testid="public-member-list-show-more"
            >
              Show {remaining} more
            </button>
            <a
              href={`https://github.com/orgs/${org}/people`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-slate-500 hover:underline dark:text-slate-400"
            >
              View all on GitHub →
            </a>
          </div>
        ) : !isSearching && members.length > PUBLIC_MEMBER_PREVIEW_LIMIT ? (
          <a
            href={`https://github.com/orgs/${org}/people`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 block text-xs text-slate-500 hover:underline dark:text-slate-400"
          >
            View all on GitHub →
          </a>
        ) : null}
      </div>
    </details>
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

// ── Stale admin content ───────────────────────────────────────────────────────

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

function HeaderCountStrip({ section, elevated }: { section: StaleAdminsSection; elevated: boolean }) {
  if (section.applicability !== 'applicable' || section.admins.length === 0) return null
  const counts = countByClassification(section.admins)
  const total = section.admins.length
  const noun = elevated ? 'admin' : 'public member'
  return (
    <div
      className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs"
      data-testid="stale-admins-count-strip"
      aria-label={`${elevated ? 'Admin' : 'Public member'} summary — ${total}`}
    >
      <span className="font-medium text-slate-700 dark:text-slate-200">
        {total} {noun}{total === 1 ? '' : 's'}
      </span>
      <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">
        ·
      </span>
      {GROUP_ORDER.filter((c) => counts[c] > 0).map((c) => (
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
        className="inline-flex h-4 w-4 cursor-pointer select-none items-center justify-center rounded-full border border-slate-300 bg-white text-[10px] font-semibold text-slate-500 list-none hover:border-slate-400 hover:text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-slate-500 dark:hover:text-slate-200 [&::-webkit-details-marker]:hidden"
      >
        ?
      </summary>
      <div className="absolute left-0 top-6 z-10 w-72 rounded-md border border-slate-200 bg-white p-3 text-xs text-slate-600 shadow-md dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
        <p className="mb-1 font-medium text-slate-700 dark:text-slate-200">How is this scored?</p>
        <ThresholdDisclosure section={section} />
      </div>
    </details>
  )
}

function SectionBody({
  section,
  onRetry,
  refreshing,
  nextAutoRetryAt,
  elevated = true,
}: {
  section: StaleAdminsSection
  onRetry: () => void
  refreshing: boolean
  nextAutoRetryAt: string | null
  elevated?: boolean
}) {
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
      <p className="text-sm text-rose-700 dark:text-rose-300" data-testid="stale-admins-unavailable">
        Admin list could not be retrieved —{' '}
        <span className="font-medium">{section.adminListUnavailableReason ?? 'unknown'}</span>.
      </p>
    )
  }

  if (section.admins.length === 0) {
    return (
      <p className="text-sm text-slate-600 dark:text-slate-300">
        {elevated ? 'No admins were returned for this organization.' : 'No public members were returned for this organization.'}
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
          onRetry={onRetry}
          refreshing={refreshing}
          nextAutoRetryAt={nextAutoRetryAt}
          elevated={elevated}
        />
      ))}
    </div>
  )
}

function GroupSection({
  classification,
  admins,
  defaultOpen,
  onRetry,
  refreshing,
  nextAutoRetryAt,
  elevated = true,
}: {
  classification: StaleAdminClassification
  admins: StaleAdminRecord[]
  defaultOpen: boolean
  onRetry: () => void
  refreshing: boolean
  nextAutoRetryAt: string | null
  elevated?: boolean
}) {
  const config = GROUP_CONFIG[classification]
  const isUnavailable = classification === 'unavailable'
  const reasonCounts = isUnavailable ? countByUnavailableReason(admins) : null
  const retryableCount = reasonCounts
    ? reasonCounts['rate-limited'] + reasonCounts['commit-search-failed'] + reasonCounts['events-fetch-failed']
    : 0
  return (
    <details
      open={defaultOpen}
      className={`group rounded-md bg-slate-50 dark:bg-slate-800/60 ${config.headerBorderClassName}`}
      data-testid={`stale-admins-group-${classification}`}
    >
      <summary
        className="flex cursor-pointer select-none items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-800 list-none dark:text-slate-100 [&::-webkit-details-marker]:hidden"
        aria-label={elevated ? config.groupAriaLabel : config.groupAriaLabel.replace(/admins?/gi, 'public members')}
      >
        <GroupChevron />
        <span aria-hidden="true">{config.icon}</span>
        <span>{config.label}</span>
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${config.pillClassName}`}>
          {admins.length}
        </span>
      </summary>
      {isUnavailable && reasonCounts ? (
        <UnavailableReasonStrip
          counts={reasonCounts}
          onRetry={onRetry}
          showRetry={retryableCount > 0}
          refreshing={refreshing}
          nextAutoRetryAt={nextAutoRetryAt}
        />
      ) : null}
      <ul role="list" className="divide-y divide-slate-200 px-3 pb-1.5 dark:divide-slate-700">
        {admins.map((admin) => (
          <AdminRow key={admin.username} admin={admin} nextAutoRetryAt={nextAutoRetryAt} />
        ))}
      </ul>
    </details>
  )
}

const UNAVAILABLE_REASON_LABEL: Record<StaleAdminUnavailableReason, string> = {
  'rate-limited': 'Rate-limited',
  'commit-search-failed': 'Search unavailable',
  'events-fetch-failed': 'Events unavailable',
  'admin-account-404': 'Account not found',
}

// Row-level humanized copy. Framed around what GitHub returned (or didn't),
// not our implementation (`/search/commits`, `/events/public`). Avoids
// parenthetical technical asides — those read as app-error / debug output.
//
// All retryable reasons (rate-limited, commit-search-failed,
// events-fetch-failed) share a single message so rows read consistently;
// the per-reason split is already visible at a glance via the sub-pill
// strip above the rows ("3 rate-limited · 18 search unavailable"), which
// is where users who care about the distinction can find it.
//
// Two rendering modes, driven by `hasCountdown`:
//   - With countdown: a live timer follows the lead and carries the "when".
//   - Without countdown: the background retry ladder is paused, so the
//     text points at the Retry button instead of promising a time.
function unavailableReasonRowText(reason: StaleAdminUnavailableReason | null, hasCountdown: boolean): string {
  if (reason === 'admin-account-404') {
    return 'GitHub account not found or deleted.'
  }
  if (reason === null) {
    return 'Activity could not be retrieved.'
  }
  return hasCountdown
    ? "GitHub didn’t return activity data."
    : "GitHub didn’t return activity data — click Retry to try again."
}

function UnavailableReasonStrip({
  counts,
  onRetry,
  showRetry,
  refreshing,
  nextAutoRetryAt,
}: {
  counts: Record<StaleAdminUnavailableReason | 'unknown', number>
  onRetry: () => void
  showRetry: boolean
  refreshing: boolean
  nextAutoRetryAt: string | null
}) {
  const entries = (Object.keys(UNAVAILABLE_REASON_LABEL) as StaleAdminUnavailableReason[])
    .filter((r) => counts[r] > 0)
    .map((r) => ({ reason: r, count: counts[r], label: UNAVAILABLE_REASON_LABEL[r] }))
  if (counts.unknown > 0) {
    entries.push({ reason: 'unknown' as never, count: counts.unknown, label: 'Unknown' })
  }
  if (entries.length === 0) return null
  return (
    <div
      className="mx-3 mb-1 flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-amber-200 pb-1.5 text-xs dark:border-amber-900/60"
      data-testid="stale-admins-unavailable-reasons"
    >
      {entries.map(({ reason, count, label }) => (
        <span
          key={reason}
          className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300"
          data-testid={`stale-admins-unavailable-reason-${reason}`}
        >
          {count} {label.toLowerCase()}
        </span>
      ))}
      {showRetry ? (
        <RetryButton
          onRetry={onRetry}
          refreshing={refreshing}
          nextAutoRetryAt={nextAutoRetryAt}
        />
      ) : null}
    </div>
  )
}

function RetryButton({
  onRetry,
  refreshing,
  nextAutoRetryAt,
}: {
  onRetry: () => void
  refreshing: boolean
  nextAutoRetryAt: string | null
}) {
  const target = nextAutoRetryAt ? Date.parse(nextAutoRetryAt) : NaN
  const hasKnownTarget = Number.isFinite(target)
  const [nowMs, setNowMs] = useState(() => Date.now())
  useEffect(() => {
    if (!hasKnownTarget) return
    const id = setInterval(() => setNowMs(Date.now()), 1000)
    return () => clearInterval(id)
  }, [hasKnownTarget])

  const remainingMs = hasKnownTarget ? Math.max(0, target - nowMs) : 0
  const seconds = Math.ceil(remainingMs / 1000)
  const waiting = hasKnownTarget && remainingMs > 0
  // When a background auto-retry is pending, users should not fire their
  // own on top of it (doubles the rate-limit pressure). Disable until the
  // timer is up OR the ladder is exhausted (nextAutoRetryAt = null).
  const disabled = refreshing || waiting
  const label = refreshing
    ? 'Retrying…'
    : waiting
      ? `Auto-retry in ${seconds}s`
      : 'Retry'

  return (
    <button
      type="button"
      onClick={onRetry}
      disabled={disabled}
      data-testid="stale-admins-unavailable-retry"
      className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-white px-2 py-0.5 text-xs font-medium text-amber-800 hover:bg-amber-50 disabled:cursor-wait disabled:opacity-60 dark:border-amber-700 dark:bg-slate-900 dark:text-amber-300 dark:hover:bg-slate-800"
    >
      {label}
    </button>
  )
}

function countByUnavailableReason(
  admins: StaleAdminRecord[],
): Record<StaleAdminUnavailableReason | 'unknown', number> {
  const counts: Record<StaleAdminUnavailableReason | 'unknown', number> = {
    'rate-limited': 0,
    'commit-search-failed': 0,
    'events-fetch-failed': 0,
    'admin-account-404': 0,
    unknown: 0,
  }
  for (const a of admins) {
    const r = a.unavailableReason
    if (r && r in counts) counts[r]++
    else counts.unknown++
  }
  return counts
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

function AdminRow({
  admin,
  nextAutoRetryAt,
}: {
  admin: StaleAdminRecord
  nextAutoRetryAt: string | null
}) {
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
      <RowDetail admin={admin} nextAutoRetryAt={nextAutoRetryAt} />
    </li>
  )
}

function RowDetail({
  admin,
  nextAutoRetryAt,
}: {
  admin: StaleAdminRecord
  nextAutoRetryAt: string | null
}) {
  const [now] = useState(() => Date.now())
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
    // Unified countdown source: prefer this admin's own GitHub-disclosed
    // reset (`retryAvailableAt`) only while it's still in the future —
    // a past timestamp means the window has passed and shouldn't keep
    // "Ready to retry." pinned after the ladder is exhausted. Fall back
    // to the hook's next scheduled background retry (`nextAutoRetryAt`).
    // When neither is available (ladder exhausted, terminal reason), no
    // countdown is shown and the copy points at Retry.
    const retryAt =
      admin.retryAvailableAt && Date.parse(admin.retryAvailableAt) > now
        ? admin.retryAvailableAt
        : null
    const countdownAt = retryAt ?? nextAutoRetryAt
    const hasCountdown = Boolean(countdownAt)
    return (
      <span className="text-xs text-slate-500 dark:text-slate-400">
        {unavailableReasonRowText(admin.unavailableReason, hasCountdown)}
        {countdownAt ? (
          <>
            {' '}
            <RetryCountdown availableAt={countdownAt} />
          </>
        ) : null}
      </span>
    )
  }
  return null
}

function RetryCountdown({ availableAt }: { availableAt: string }) {
  const target = Date.parse(availableAt)
  const [nowMs, setNowMs] = useState(() => Date.now())
  useEffect(() => {
    if (!Number.isFinite(target)) return
    const id = setInterval(() => setNowMs(Date.now()), 1000)
    return () => clearInterval(id)
  }, [target])
  if (!Number.isFinite(target)) return null
  const remainingMs = target - nowMs
  if (remainingMs <= 0) {
    return (
      <span
        data-testid="retry-countdown-ready"
        className="font-medium text-emerald-700 dark:text-emerald-400"
      >
        Ready to retry.
      </span>
    )
  }
  const seconds = Math.ceil(remainingMs / 1000)
  return (
    <span
      data-testid="retry-countdown"
      className="font-medium text-amber-700 dark:text-amber-400"
    >
      Retry available in {seconds}s.
    </span>
  )
}

function ModeBadge({ mode }: { mode: StaleAdminMode }) {
  const config = MODE_CONFIG[mode]
  const badge = (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${config.className}`}
      data-testid={`stale-admins-mode-${mode}`}
    >
      {config.label}
    </span>
  )
  if (!config.tooltip) return badge
  return (
    <span className="group relative inline-flex">
      {badge}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full right-0 z-20 mb-1.5 w-64 rounded-md border border-slate-200 bg-white px-3 py-2 text-left text-xs text-slate-600 opacity-0 shadow-md transition-opacity group-hover:opacity-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
      >
        {config.tooltip}
      </span>
    </span>
  )
}

const MODE_CONFIG: Record<StaleAdminMode, { label: string; className: string; tooltip?: string }> = {
  baseline: {
    label: 'Baseline — public members only',
    className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
  },
  'elevated-effective': {
    label: 'Elevated — includes concealed admins',
    className: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300',
  },
  'elevated-ineffective': {
    label: 'Elevated grant did not widen this view',
    className: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
    tooltip: 'The admin list returned the same count as the full member list — this typically means the org restricts third-party OAuth apps. Are you a member of this org? A Personal Access Token with read:org scope bypasses OAuth app restrictions.',
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
