import type { LicensingResult } from '@/lib/analyzer/analysis-result'
import { isOsiApproved, getPermissivenessTier } from '@/lib/licensing/license-data'

const SIGNED_OFF_BY_RE = /^signed-off-by:\s/im

const DCO_CLA_BOT_PATTERNS = [
  'apps/dco',
  'probot/dco',
  'cla-assistant/cla-assistant',
  'contributor-assistant/github-action',
]

const SIGNED_OFF_BY_RATIO_THRESHOLD = 0.8

interface LicenseInfo {
  spdxId: string | null
  name: string | null
}

interface CommitNode {
  message: string
}

interface WorkflowEntry {
  name: string
  object: { text: string } | null
}

interface WorkflowDir {
  entries: WorkflowEntry[]
}

export function computeSignedOffByRatio(commits: CommitNode[]): number | null {
  if (commits.length === 0) return null
  const count = commits.filter((c) => SIGNED_OFF_BY_RE.test(c.message)).length
  return count / commits.length
}

export function detectDcoClaBots(workflowDir: WorkflowDir | null): boolean {
  if (!workflowDir || !workflowDir.entries) return false
  for (const entry of workflowDir.entries) {
    const text = entry.object?.text
    if (!text) continue
    for (const pattern of DCO_CLA_BOT_PATTERNS) {
      if (text.includes(pattern)) return true
    }
  }
  return false
}

export function extractLicensingResult(
  licenseInfo: LicenseInfo | null | undefined,
  commits: CommitNode[],
  workflowDir: WorkflowDir | null,
): LicensingResult {
  const spdxId = licenseInfo?.spdxId ?? null
  const name = licenseInfo?.name ?? null

  const signedOffByRatio = computeSignedOffByRatio(commits)
  const dcoOrClaBot = detectDcoClaBots(workflowDir)
  const enforced = dcoOrClaBot || (signedOffByRatio !== null && signedOffByRatio >= SIGNED_OFF_BY_RATIO_THRESHOLD)

  return {
    license: {
      spdxId,
      name,
      osiApproved: isOsiApproved(spdxId),
      permissivenessTier: getPermissivenessTier(spdxId),
    },
    contributorAgreement: {
      signedOffByRatio,
      dcoOrClaBot,
      enforced,
    },
  }
}
