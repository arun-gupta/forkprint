/**
 * Shared configuration thresholds for community completeness scoring.
 * Per constitution §VI, thresholds must live here, not be hardcoded.
 */

/** Minimum acceptance rate (0–1) for new_contributor_acceptance → 'present'. */
export const newContributorAcceptanceFloor = 0.5

/** Minimum qualifying PR count before acceptance rate is computed (else 'unavailable'). */
export const newContributorMinSampleSize = 3
