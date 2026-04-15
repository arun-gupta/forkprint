/**
 * Per-tab match counts for an active lens (tag) filter.
 *
 * Mirrors the row-visibility logic in each tab view so the badge on the
 * tab strip reflects the number of rows the user will see after the
 * lens is applied. See issue #204.
 */

import type { AnalysisResult } from '@/lib/analyzer/analysis-result'
import type { TabMatchCounts } from '@/lib/search/types'
import {
  GOVERNANCE_DOC_FILES,
  GOVERNANCE_SCORECARD_CHECKS,
  GOVERNANCE_DIRECT_CHECKS,
  GOVERNANCE_CONTRIBUTORS_METRICS,
  LICENSING_IS_GOVERNANCE,
} from './governance'
import {
  COMMUNITY_DOC_FILES,
  COMMUNITY_CONTRIBUTORS_METRICS,
} from './community'
import {
  getDocFileTags,
  getReadmeSectionTags,
  getScorecardCheckTags,
  getDirectCheckTags,
  CONTRIB_EX_RESPONSIVENESS_PANES,
  CONTRIB_EX_ACTIVITY_CARDS,
  LICENSING_IS_COMPLIANCE,
} from './tag-mappings'

function docFileMatches(name: string, tag: string): boolean {
  if (tag === 'governance') return GOVERNANCE_DOC_FILES.has(name)
  if (tag === 'community') return COMMUNITY_DOC_FILES.has(name)
  return getDocFileTags(name).includes(tag)
}

function contributorsMetricMatches(label: string, tag: string): boolean {
  if (tag === 'governance') return GOVERNANCE_CONTRIBUTORS_METRICS.has(label)
  if (tag === 'community') return COMMUNITY_CONTRIBUTORS_METRICS.has(label)
  return false
}

function scorecardCheckMatches(name: string, tag: string): boolean {
  if (tag === 'governance') return GOVERNANCE_SCORECARD_CHECKS.has(name)
  return getScorecardCheckTags(name).includes(tag)
}

function directCheckMatches(name: string, tag: string): boolean {
  if (tag === 'governance') return GOVERNANCE_DIRECT_CHECKS.has(name)
  return getDirectCheckTags(name).includes(tag)
}

function licensingMatches(tag: string): boolean {
  if (tag === 'governance') return LICENSING_IS_GOVERNANCE
  if (tag === 'compliance') return LICENSING_IS_COMPLIANCE
  return false
}

/**
 * Mirrors the contributors view-model: each result with a non-empty
 * commit history surfaces 'Maintainer count' (always) and
 * 'Funding disclosure' (when hasFundingConfig is verifiable).
 */
function contributorsMetricLabels(result: AnalysisResult): string[] {
  const labels = ['Top 20% contributor share', 'Maintainer count', 'Types of contributions']
  if (result.hasFundingConfig === true || result.hasFundingConfig === false) {
    labels.push('Funding disclosure')
  }
  return labels
}

export function computeTabTagCounts(results: AnalysisResult[], tag: string | null): TabMatchCounts {
  if (!tag || results.length === 0) return {}

  let documentation = 0
  let contributors = 0
  let activity = 0
  let responsiveness = 0
  let security = 0

  for (const result of results) {
    // Documentation tab
    if (result.documentationResult !== 'unavailable') {
      for (const check of result.documentationResult.fileChecks) {
        if (docFileMatches(check.name, tag)) documentation += 1
      }
      for (const section of result.documentationResult.readmeSections) {
        if (getReadmeSectionTags(section.name).includes(tag)) documentation += 1
      }
    }
    if (result.licensingResult !== 'unavailable' && licensingMatches(tag)) {
      documentation += 1
    }

    // Contributors tab
    for (const label of contributorsMetricLabels(result)) {
      if (contributorsMetricMatches(label, tag)) contributors += 1
    }

    // Activity tab — fixed cards rendered per result + community discussions card.
    const activityCardTitles = ['Commits', 'Pull requests', 'Issues', 'Releases']
    for (const title of activityCardTitles) {
      if (CONTRIB_EX_ACTIVITY_CARDS.has(title) && tag === 'contrib-ex') activity += 1
    }
    if (tag === 'community' && (result.hasDiscussionsEnabled === true || result.hasDiscussionsEnabled === false)) {
      activity += 1
    }

    // Responsiveness tab — fixed panes rendered per result.
    const responsivenessPaneTitles = [
      'Issue & PR response time',
      'Resolution metrics',
      'Maintainer activity signals',
      'Volume & backlog health',
      'Engagement quality signals',
    ]
    for (const title of responsivenessPaneTitles) {
      if (CONTRIB_EX_RESPONSIVENESS_PANES.has(title) && tag === 'contrib-ex') responsiveness += 1
    }

    // Security tab
    if (result.securityResult !== 'unavailable') {
      const scorecard = result.securityResult.scorecard
      if (scorecard !== 'unavailable') {
        for (const check of scorecard.checks) {
          if (scorecardCheckMatches(check.name, tag)) security += 1
        }
      }
      for (const check of result.securityResult.directChecks) {
        if (directCheckMatches(check.name, tag)) security += 1
      }
    }
  }

  return {
    documentation,
    contributors,
    activity,
    responsiveness,
    security,
  }
}
