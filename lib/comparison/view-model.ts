import type { AnalysisResult, Unavailable } from '@/lib/analyzer/analysis-result'
import {
  COMPARISON_ATTRIBUTE_MAP,
  COMPARISON_MAX_REPOS,
  COMPARISON_SECTIONS,
  DEFAULT_ENABLED_ATTRIBUTES,
  DEFAULT_ENABLED_SECTIONS,
  type ComparisonAttributeDefinition,
  type ComparisonAttributeId,
  type ComparisonSectionId,
} from './sections'

export interface ComparisonCellViewModel {
  repo: string
  rawValue: number | Unavailable
  displayValue: string
  deltaDisplay?: string
  status: 'better' | 'worse' | 'same' | 'neutral' | 'unavailable'
}

export interface ComparisonRowViewModel {
  attributeId: ComparisonAttributeId
  label: string
  helpText: string
  medianValue: number | Unavailable
  medianDisplay: string
  cells: ComparisonCellViewModel[]
}

export interface ComparisonSectionViewModel {
  id: ComparisonSectionId
  label: string
  description: string
  rows: ComparisonRowViewModel[]
}

export type ComparisonSortColumn =
  | { type: 'repo'; repo: string }
  | { type: 'median' }

export function getDefaultAnchorRepo(results: AnalysisResult[]) {
  return results[0]?.repo ?? ''
}

export function limitComparedResults(results: AnalysisResult[], maxRepos = COMPARISON_MAX_REPOS) {
  return results.slice(0, maxRepos)
}

export function selectComparedResults(
  results: AnalysisResult[],
  participants?: string[] | null,
  maxRepos = COMPARISON_MAX_REPOS,
) {
  if (!participants || participants.length === 0) {
    return results.slice(0, maxRepos)
  }

  const allowed = new Set(participants)
  return results.filter((result) => allowed.has(result.repo)).slice(0, maxRepos)
}

export function getComparisonLimitMessage(selectedCount: number, maxRepos = COMPARISON_MAX_REPOS) {
  if (selectedCount <= maxRepos) {
    return `Compare up to ${maxRepos} repositories side by side.`
  }

  return `Showing the first ${maxRepos} of ${selectedCount} analyzed repositories.`
}

export function buildComparisonSections(
  results: AnalysisResult[],
  options: {
    anchorRepo?: string
    enabledSections?: ComparisonSectionId[]
    enabledAttributes?: ComparisonAttributeId[]
  } = {},
): ComparisonSectionViewModel[] {
  const limitedResults = limitComparedResults(results)
  const anchorRepo = options.anchorRepo && limitedResults.some((result) => result.repo === options.anchorRepo)
    ? options.anchorRepo
    : getDefaultAnchorRepo(limitedResults)
  const enabledSections = new Set(options.enabledSections ?? DEFAULT_ENABLED_SECTIONS)
  const enabledAttributes = new Set(options.enabledAttributes ?? DEFAULT_ENABLED_ATTRIBUTES)

  return COMPARISON_SECTIONS.filter((section) => enabledSections.has(section.id))
    .map((section) => ({
      id: section.id,
      label: section.label,
      description: section.description,
      rows: section.attributes
        .filter((attribute) => enabledAttributes.has(attribute.id))
        .map((attribute) => buildComparisonRow(attribute, limitedResults, anchorRepo)),
    }))
    .filter((section) => section.rows.length > 0)
}

export function sortComparedResults(
  results: AnalysisResult[],
  attributeId: ComparisonAttributeId,
  direction: 'asc' | 'desc' = 'desc',
) {
  const attribute = COMPARISON_ATTRIBUTE_MAP[attributeId]
  if (!attribute) {
    return limitComparedResults(results)
  }

  return [...limitComparedResults(results)].sort((left, right) => {
    const leftValue = attribute.getValue(left)
    const rightValue = attribute.getValue(right)

    if (leftValue === 'unavailable' && rightValue === 'unavailable') {
      return left.repo.localeCompare(right.repo)
    }

    if (leftValue === 'unavailable') return 1
    if (rightValue === 'unavailable') return -1

    const difference = direction === 'asc' ? leftValue - rightValue : rightValue - leftValue
    if (difference !== 0) return difference
    return left.repo.localeCompare(right.repo)
  })
}

export function sortComparisonRows(
  rows: ComparisonRowViewModel[],
  column: ComparisonSortColumn,
  direction: 'asc' | 'desc' = 'desc',
) {
  return [...rows].sort((left, right) => {
    const leftValue = getComparableValue(left, column)
    const rightValue = getComparableValue(right, column)

    if (leftValue === 'unavailable' && rightValue === 'unavailable') {
      return left.label.localeCompare(right.label)
    }

    if (leftValue === 'unavailable') return 1
    if (rightValue === 'unavailable') return -1

    const difference = direction === 'asc' ? leftValue - rightValue : rightValue - leftValue
    if (difference !== 0) return difference

    return left.label.localeCompare(right.label)
  })
}

function buildComparisonRow(
  attribute: ComparisonAttributeDefinition,
  results: AnalysisResult[],
  anchorRepo: string,
): ComparisonRowViewModel {
  const anchorResult = results.find((result) => result.repo === anchorRepo)
  const anchorValue = anchorResult ? attribute.getValue(anchorResult) : 'unavailable'
  const numericValues = results
    .map((result) => attribute.getValue(result))
    .filter((value): value is number => typeof value === 'number')
  const medianValue = getMedian(numericValues)

  return {
    attributeId: attribute.id,
    label: attribute.label,
    helpText: attribute.helpText,
    medianValue,
    medianDisplay: formatComparisonValue(attribute, medianValue),
    cells: results.map((result) => {
      const rawValue = attribute.getValue(result)
      return {
        repo: result.repo,
        rawValue,
        displayValue: formatComparisonValue(attribute, rawValue, result),
        deltaDisplay: formatDelta(attribute, rawValue, anchorValue),
        status: getComparisonStatus(attribute, rawValue, anchorValue, result.repo === anchorRepo),
      }
    }),
  }
}

function formatComparisonValue(
  attribute: ComparisonAttributeDefinition,
  value: number | Unavailable,
  result?: AnalysisResult,
) {
  if (attribute.formatValue) {
    return attribute.formatValue(value, result)
  }

  if (value === 'unavailable') {
    return '—'
  }

  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(value)
}

function formatDelta(
  attribute: ComparisonAttributeDefinition,
  value: number | Unavailable,
  anchorValue: number | Unavailable,
) {
  if (value === 'unavailable' || anchorValue === 'unavailable') {
    return undefined
  }

  const difference = value - anchorValue
  if (difference === 0) {
    return 'Same as anchor'
  }

  const absoluteDifference = Math.abs(difference)
  const sign = difference > 0 ? '+' : '-'
  const pct = anchorValue !== 0
    ? ` (${sign}${new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(Math.abs(difference / anchorValue) * 100)}%)`
    : ''

  if (attribute.valueType === 'percentage') {
    const points = new Intl.NumberFormat('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(
      absoluteDifference * 100,
    )
    return `${sign}${points} pts vs anchor${pct}`
  }

  if (attribute.valueType === 'duration') {
    const display = absoluteDifference >= 24
      ? `${new Intl.NumberFormat('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(absoluteDifference / 24)}d`
      : `${new Intl.NumberFormat('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(absoluteDifference)}h`
    return `${sign}${display} vs anchor${pct}`
  }

  const display = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(absoluteDifference)
  return `${sign}${display} vs anchor${pct}`
}

function getComparisonStatus(
  attribute: ComparisonAttributeDefinition,
  value: number | Unavailable,
  anchorValue: number | Unavailable,
  isAnchor: boolean,
): ComparisonCellViewModel['status'] {
  if (value === 'unavailable' || anchorValue === 'unavailable') return 'unavailable'
  if (isAnchor || attribute.direction === 'neutral') return 'neutral'
  if (value === anchorValue) return 'same'

  if (attribute.direction === 'higher-is-better') {
    return value > anchorValue ? 'better' : 'worse'
  }

  return value < anchorValue ? 'better' : 'worse'
}

function getMedian(values: number[]): number | Unavailable {
  if (values.length === 0) {
    return 'unavailable'
  }

  const sorted = [...values].sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)

  if (sorted.length % 2 === 1) {
    return sorted[middle]!
  }

  return (sorted[middle - 1]! + sorted[middle]!) / 2
}

function getComparableValue(row: ComparisonRowViewModel, column: ComparisonSortColumn): number | Unavailable {
  if (column.type === 'median') {
    return row.medianValue
  }

  return row.cells.find((cell) => cell.repo === column.repo)?.rawValue ?? 'unavailable'
}
