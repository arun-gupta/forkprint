import type { LicenseDetection, LicensingResult } from '@/lib/analyzer/analysis-result'
import { isOsiApproved, getPermissivenessTier, OSI_APPROVED_SPDX_IDS } from '@/lib/licensing/license-data'

const SIGNED_OFF_BY_RE = /^signed-off-by:\s/im

const DCO_CLA_BOT_PATTERNS = [
  'apps/dco',
  'probot/dco',
  'cla-assistant/cla-assistant',
  'contributor-assistant/github-action',
]

const SIGNED_OFF_BY_RATIO_THRESHOLD = 0.8

/**
 * Regex to match SPDX license expression operators (OR / AND) between SPDX IDs.
 * Captures patterns like "MIT OR Apache-2.0", "(MIT OR Apache-2.0)", etc.
 * Only supports simple disjunctions — not nested expressions.
 */
const SPDX_EXPRESSION_RE = /\(?\s*([A-Za-z0-9][A-Za-z0-9._-]*)\s+OR\s+([A-Za-z0-9][A-Za-z0-9._-]*)\s*\)?/gi

/**
 * Maps well-known license file suffixes to their likely SPDX IDs.
 * Used when a repo has LICENSE-MIT, LICENSE-APACHE, etc.
 */
const LICENSE_FILE_SPDX_MAP: Record<string, { spdxId: string; name: string }> = {
  'MIT': { spdxId: 'MIT', name: 'MIT License' },
  'APACHE': { spdxId: 'Apache-2.0', name: 'Apache License 2.0' },
  'BSD': { spdxId: 'BSD-3-Clause', name: 'BSD 3-Clause License' },
}

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

export interface LicenseFileInfo {
  /** e.g. 'MIT', 'APACHE', 'BSD' — the suffix after LICENSE- */
  suffix: string
  content: string | null
}

function buildLicenseDetection(spdxId: string, name: string | null): LicenseDetection {
  return {
    spdxId,
    name,
    osiApproved: isOsiApproved(spdxId),
    permissivenessTier: getPermissivenessTier(spdxId),
  }
}

/**
 * Parses SPDX license expressions like "MIT OR Apache-2.0" from license file content.
 * Returns additional SPDX IDs found (excludes the primary license already detected by GitHub).
 */
export function parseSpdxExpression(content: string, primarySpdxId: string | null): string[] {
  const ids = new Set<string>()
  let match: RegExpExecArray | null
  const re = new RegExp(SPDX_EXPRESSION_RE.source, SPDX_EXPRESSION_RE.flags)
  while ((match = re.exec(content)) !== null) {
    const [, left, right] = match
    if (left && OSI_APPROVED_SPDX_IDS.has(left)) ids.add(left)
    if (right && OSI_APPROVED_SPDX_IDS.has(right)) ids.add(right)
  }
  // Remove the primary license — it's already the main detection
  if (primarySpdxId) ids.delete(primarySpdxId)
  return Array.from(ids)
}

/**
 * Detects additional licenses from LICENSE-MIT, LICENSE-APACHE, etc. files.
 * Returns LicenseDetection entries for each additional license file found.
 */
export function detectLicenseFiles(
  files: LicenseFileInfo[],
  primarySpdxId: string | null,
): LicenseDetection[] {
  const detections: LicenseDetection[] = []
  for (const file of files) {
    if (!file.content) continue
    const mapping = LICENSE_FILE_SPDX_MAP[file.suffix]
    if (!mapping) continue
    // Skip if this is the same as the primary license
    if (mapping.spdxId === primarySpdxId) continue
    detections.push(buildLicenseDetection(mapping.spdxId, mapping.name))
  }
  return detections
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
  licenseFileContent?: string | null,
  additionalLicenseFiles?: LicenseFileInfo[],
): LicensingResult {
  const spdxId = licenseInfo?.spdxId ?? null
  const name = licenseInfo?.name ?? null

  const signedOffByRatio = computeSignedOffByRatio(commits)
  const dcoOrClaBot = detectDcoClaBots(workflowDir)
  const enforced = dcoOrClaBot || (signedOffByRatio !== null && signedOffByRatio >= SIGNED_OFF_BY_RATIO_THRESHOLD)

  // Detect additional licenses from SPDX expressions in LICENSE content
  const additionalLicenses: LicenseDetection[] = []
  if (licenseFileContent) {
    const extraIds = parseSpdxExpression(licenseFileContent, spdxId)
    for (const id of extraIds) {
      additionalLicenses.push(buildLicenseDetection(id, null))
    }
  }

  // Detect additional licenses from separate license files (LICENSE-MIT, LICENSE-APACHE, etc.)
  if (additionalLicenseFiles) {
    const fileDetections = detectLicenseFiles(additionalLicenseFiles, spdxId)
    for (const det of fileDetections) {
      // Avoid duplicates (e.g., if SPDX expression already found the same license)
      if (!additionalLicenses.some((l) => l.spdxId === det.spdxId)) {
        additionalLicenses.push(det)
      }
    }
  }

  return {
    license: {
      spdxId,
      name,
      osiApproved: isOsiApproved(spdxId),
      permissivenessTier: getPermissivenessTier(spdxId),
    },
    additionalLicenses,
    contributorAgreement: {
      signedOffByRatio,
      dcoOrClaBot,
      enforced,
    },
  }
}
