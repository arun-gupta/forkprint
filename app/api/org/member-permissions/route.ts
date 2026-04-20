import {
  fetchOrgMembers,
  fetchOrgOutsideCollaborators,
  type OrgMemberListResult,
  type OrgCollaboratorListResult,
} from '@/lib/analyzer/github-rest'
import type {
  MemberPermissionDistributionSection,
  MemberPermissionUnavailableReason,
} from '@/lib/governance/member-permissions'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const org = url.searchParams.get('org')?.trim()
  const ownerType = (url.searchParams.get('ownerType') ?? 'Organization').trim()

  if (!org) {
    return Response.json(
      { error: { message: 'Organization is required.', code: 'INVALID_ORG' } },
      { status: 400 },
    )
  }

  const token = getBearerToken(request)
  if (!token) {
    return Response.json(
      { error: { message: 'Authentication required.', code: 'UNAUTHENTICATED' } },
      { status: 401 },
    )
  }

  const resolvedAt = new Date().toISOString()

  if (ownerType !== 'Organization') {
    const section: MemberPermissionDistributionSection = {
      kind: 'member-permission-distribution',
      applicability: 'not-applicable-non-org',
      memberCount: null,
      outsideCollaboratorCount: null,
      unavailableReasons: [],
      resolvedAt,
    }
    return Response.json({ section })
  }

  const [memberResult, collaboratorResult] = await Promise.all([
    fetchOrgMembers(token, org),
    fetchOrgOutsideCollaborators(token, org),
  ])

  if (memberResult.kind !== 'ok') {
    const section: MemberPermissionDistributionSection = {
      kind: 'member-permission-distribution',
      applicability: 'member-list-unavailable',
      memberCount: null,
      outsideCollaboratorCount: null,
      unavailableReasons: [mapMemberReason(memberResult)],
      resolvedAt,
    }
    return Response.json({ section })
  }

  const memberCount = memberResult.members.length
  const unavailableReasons: MemberPermissionUnavailableReason[] = []
  let outsideCollaboratorCount: number | null = null

  if (collaboratorResult.kind === 'ok') {
    outsideCollaboratorCount = collaboratorResult.collaborators.length
  } else {
    unavailableReasons.push(mapCollaboratorReason(collaboratorResult))
  }

  const applicability = unavailableReasons.length > 0 ? 'partial' : 'applicable'

  const section: MemberPermissionDistributionSection = {
    kind: 'member-permission-distribution',
    applicability,
    memberCount,
    outsideCollaboratorCount,
    unavailableReasons,
    resolvedAt,
  }

  return Response.json({ section })
}

function getBearerToken(request: Request): string | null {
  const authorization = request.headers.get('authorization')
  if (!authorization) return null
  const match = authorization.match(/^Bearer\s+(.+)$/i)
  return match?.[1]?.trim() || null
}

function mapMemberReason(result: OrgMemberListResult): MemberPermissionUnavailableReason {
  switch (result.kind) {
    case 'rate-limited': return 'member-list-rate-limited'
    case 'auth-failed': return 'member-list-auth-failed'
    case 'scope-insufficient': return 'member-list-scope-insufficient'
    case 'network': return 'network'
    default: return 'unknown'
  }
}

function mapCollaboratorReason(result: OrgCollaboratorListResult): MemberPermissionUnavailableReason {
  switch (result.kind) {
    case 'rate-limited': return 'collaborator-list-rate-limited'
    case 'auth-failed': return 'collaborator-list-auth-failed'
    case 'scope-insufficient': return 'collaborator-list-scope-insufficient'
    case 'network': return 'network'
    default: return 'unknown'
  }
}
