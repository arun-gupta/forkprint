export type TwoFactorEnforcementStatus = 'enforced' | 'not-enforced' | 'unknown'

export type TwoFactorApplicability =
  | 'applicable'
  | 'not-applicable-non-org'
  | 'org-lookup-unavailable'

export type OrgLookupUnavailableReason =
  | 'rate-limited'
  | 'auth-failed'
  | 'not-found'
  | 'network'
  | 'unknown'

export interface TwoFactorEnforcementSection {
  kind: 'two-factor-enforcement'
  applicability: TwoFactorApplicability
  status: TwoFactorEnforcementStatus | null
  lookupUnavailableReason?: OrgLookupUnavailableReason
  resolvedAt: string
}

export function classifyTwoFactorRequirement(
  twoFactorRequirementEnabled: boolean | null | undefined,
): TwoFactorEnforcementStatus {
  if (twoFactorRequirementEnabled === true) return 'enforced'
  if (twoFactorRequirementEnabled === false) return 'not-enforced'
  return 'unknown'
}
