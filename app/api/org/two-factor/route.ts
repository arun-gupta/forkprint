import {
  fetchOrgTwoFactorRequirement,
  type OrgTwoFactorRequirementResult,
} from '@/lib/analyzer/github-rest'
import {
  classifyTwoFactorRequirement,
  type OrgLookupUnavailableReason,
  type TwoFactorEnforcementSection,
} from '@/lib/governance/two-factor'

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
    const section: TwoFactorEnforcementSection = {
      kind: 'two-factor-enforcement',
      applicability: 'not-applicable-non-org',
      status: null,
      resolvedAt,
    }
    return Response.json({ section })
  }

  const lookup = await fetchOrgTwoFactorRequirement(token, org)
  if (lookup.kind !== 'ok') {
    const section: TwoFactorEnforcementSection = {
      kind: 'two-factor-enforcement',
      applicability: 'org-lookup-unavailable',
      status: null,
      lookupUnavailableReason: mapLookupReason(lookup),
      resolvedAt,
    }
    return Response.json({ section })
  }

  const section: TwoFactorEnforcementSection = {
    kind: 'two-factor-enforcement',
    applicability: 'applicable',
    status: classifyTwoFactorRequirement(lookup.twoFactorRequirementEnabled),
    resolvedAt,
  }
  return Response.json({ section })
}

function mapLookupReason(result: OrgTwoFactorRequirementResult): OrgLookupUnavailableReason {
  switch (result.kind) {
    case 'rate-limited':
      return 'rate-limited'
    case 'auth-failed':
      return 'auth-failed'
    case 'not-found':
      return 'not-found'
    case 'network':
      return 'network'
    default:
      return 'unknown'
  }
}

function getBearerToken(request: Request): string | null {
  const authorization = request.headers.get('authorization')
  if (!authorization) return null
  const match = authorization.match(/^Bearer\s+(.+)$/i)
  return match?.[1]?.trim() || null
}
