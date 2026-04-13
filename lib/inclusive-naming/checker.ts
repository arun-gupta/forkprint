import type { InclusiveNamingCheck, InclusiveNamingResult } from '@/lib/analyzer/analysis-result'
import { INI_WORD_LIST, TIER_SEVERITY_LABELS } from './word-list'

export function checkBranchName(branchName: string | null): InclusiveNamingCheck {
  if (branchName === null) {
    return {
      checkType: 'branch',
      term: '',
      passed: true,
      tier: null,
      severity: null,
      replacements: [],
      context: null,
    }
  }

  const entry = INI_WORD_LIST.find((e) => e.term === branchName.toLowerCase())
  if (entry) {
    return {
      checkType: 'branch',
      term: entry.term,
      passed: false,
      tier: entry.tier,
      severity: TIER_SEVERITY_LABELS[entry.tier],
      replacements: entry.replacements,
      context: `Default branch: ${branchName}`,
    }
  }

  return {
    checkType: 'branch',
    term: branchName,
    passed: true,
    tier: null,
    severity: null,
    replacements: [],
    context: null,
  }
}

export function checkDescription(description: string | null): InclusiveNamingCheck[] {
  if (!description) return []

  const checks: InclusiveNamingCheck[] = []
  const lowerDesc = description.toLowerCase()

  for (const entry of INI_WORD_LIST) {
    // Use word-boundary matching to avoid false positives on substrings
    const escaped = entry.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(`\\b${escaped}\\b`, 'i')
    if (regex.test(lowerDesc)) {
      checks.push({
        checkType: 'description',
        term: entry.term,
        passed: false,
        tier: entry.tier,
        severity: TIER_SEVERITY_LABELS[entry.tier],
        replacements: entry.replacements,
        context: `Repository description`,
      })
    }
  }

  return checks
}

export function checkTopics(topics: string[]): InclusiveNamingCheck[] {
  const checks: InclusiveNamingCheck[] = []

  for (const topic of topics) {
    const entry = INI_WORD_LIST.find((e) => e.term === topic.toLowerCase())
    if (entry) {
      checks.push({
        checkType: 'topic',
        term: entry.term,
        passed: false,
        tier: entry.tier,
        severity: TIER_SEVERITY_LABELS[entry.tier],
        replacements: entry.replacements,
        context: `Topic: ${topic}`,
      })
    }
  }

  return checks
}

export function extractInclusiveNamingResult(
  branchName: string | null,
  description: string | null,
  topics: string[],
): InclusiveNamingResult {
  const branchCheck = checkBranchName(branchName)
  const descriptionChecks = checkDescription(description)
  const topicChecks = checkTopics(topics)

  return {
    defaultBranchName: branchName,
    branchCheck,
    metadataChecks: [...descriptionChecks, ...topicChecks],
  }
}
