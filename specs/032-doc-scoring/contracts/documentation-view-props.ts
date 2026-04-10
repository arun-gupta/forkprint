/**
 * View model contracts for the Documentation tab.
 * These types define the shape of data passed to UI components.
 */

export interface DocumentationFileStatus {
  /** File category identifier */
  name: 'readme' | 'license' | 'contributing' | 'code_of_conduct' | 'security' | 'changelog'
  /** Human-readable label */
  label: string
  /** Whether the file was found in the repository */
  found: boolean
  /** Actual file path if found */
  path: string | null
  /** SPDX license identifier (only for license files) */
  licenseType: string | null
  /** Actionable recommendation when file is missing */
  recommendation: string
}

export interface ReadmeSectionStatus {
  /** Section category identifier */
  name: 'description' | 'installation' | 'usage' | 'contributing' | 'license'
  /** Human-readable label */
  label: string
  /** Whether the section heading was detected */
  detected: boolean
  /** Actionable recommendation when section is missing */
  recommendation: string
}

export interface DocumentationRecommendation {
  /** Which scoring bucket this recommendation belongs to */
  bucket: 'activity' | 'responsiveness' | 'sustainability' | 'documentation'
  /** Category within the bucket */
  category: string
  /** The specific missing item */
  item: string
  /** Weight of this item in the scoring formula (for ordering) */
  weight: number
  /** Actionable recommendation text */
  text: string
}

export interface DocumentationSectionViewModel {
  /** Repository full name */
  repo: string
  /** Documentation percentile score */
  score: {
    value: number | 'Insufficient verified public data'
    tone: 'success' | 'warning' | 'danger' | 'neutral'
    percentile: number | null
    bracketLabel: string | null
  }
  /** Per-file presence results */
  fileStatuses: DocumentationFileStatus[]
  /** README section detection results */
  readmeSections: ReadmeSectionStatus[]
  /** Summary counts */
  filesFound: number
  filesTotal: number
  sectionsDetected: number
  sectionsTotal: number
  /** Recommendations for missing items */
  recommendations: DocumentationRecommendation[]
}
