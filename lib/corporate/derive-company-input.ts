import type { CorporateCompanyInput } from '@/specs/493-feat-corporate-contribution-lens-for-rep/contracts/corporate-metrics'

export function deriveCompanyInput(raw: string): CorporateCompanyInput {
  const normalized = raw.trim().toLowerCase()
  const orgHandle = normalized.replace(/\.(com|io|org|net|dev)$/, '')
  const emailDomain = normalized.includes('.') ? normalized : `${normalized}.com`
  return { companyName: raw, orgHandle, emailDomain }
}
