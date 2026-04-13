export type INITier = 1 | 2 | 3

export interface INITermEntry {
  term: string
  tier: INITier
  recommendation: string
  replacements: string[]
  termPage: string
}

/**
 * Inclusive Naming Initiative word list — Tiers 1–3 only.
 * Tier 0 terms ("no change recommended") are explicitly excluded.
 * Source: https://inclusivenaming.org/word-lists/index.json
 */
export const INI_WORD_LIST: readonly INITermEntry[] = [
  // Tier 1 — "Replace immediately"
  {
    term: 'abort',
    tier: 1,
    recommendation: 'Replace when possible.',
    replacements: ['cancel', 'stop', 'end', 'halt', 'force quit'],
    termPage: 'https://inclusivenaming.org/word-lists/tier-1/abort/index.html',
  },
  {
    term: 'blackhat',
    tier: 1,
    recommendation: 'Replace immediately.',
    replacements: ['ethical hacker', 'unethical hacker', 'attacker'],
    termPage: 'https://inclusivenaming.org/word-lists/tier-1/blackhat-whitehat/index.html',
  },
  {
    term: 'whitehat',
    tier: 1,
    recommendation: 'Replace immediately.',
    replacements: ['ethical hacker'],
    termPage: 'https://inclusivenaming.org/word-lists/tier-1/blackhat-whitehat/index.html',
  },
  {
    term: 'cripple',
    tier: 1,
    recommendation: 'Adopt immediately.',
    replacements: ['impacted', 'degraded', 'restricted', 'immobilized'],
    termPage: 'https://inclusivenaming.org/word-lists/tier-1/_cripple/index.html',
  },
  {
    term: 'grandfathered',
    tier: 1,
    recommendation: 'Adopt immediately.',
    replacements: ['exempted', 'excused', 'preapproved', 'preauthorized', 'legacy'],
    termPage: 'https://inclusivenaming.org/word-lists/tier-1/grandfathered/index.html',
  },
  {
    term: 'master',
    tier: 1,
    recommendation: 'Adopt immediately.',
    replacements: ['main', 'original', 'source', 'control plane'],
    termPage: 'https://inclusivenaming.org/word-lists/tier-1/_master/index.html',
  },
  {
    term: 'master-slave',
    tier: 1,
    recommendation: 'Adopt immediately.',
    replacements: ['primary/replica', 'primary/secondary', 'leader/follower', 'parent/child', 'controller/doer'],
    termPage: 'https://inclusivenaming.org/word-lists/tier-1/_master-slave/index.html',
  },
  {
    term: 'tribe',
    tier: 1,
    recommendation: 'Use with caution. Do not use to refer to a group formed to accomplish a task.',
    replacements: ['squad', 'team'],
    termPage: 'https://inclusivenaming.org/word-lists/tier-1/tribe/index.html',
  },
  {
    term: 'whitelist',
    tier: 1,
    recommendation: 'Adopt immediately.',
    replacements: ['allowlist'],
    termPage: 'https://inclusivenaming.org/word-lists/tier-1/whitelist/index.html',
  },
  {
    term: 'blacklist',
    tier: 1,
    recommendation: 'Adopt immediately.',
    replacements: ['denylist', 'blocklist'],
    termPage: 'https://inclusivenaming.org/word-lists/tier-1/whitelist/index.html',
  },
  // Tier 2 — "Recommended to replace"
  {
    term: 'sanity-check',
    tier: 2,
    recommendation: 'Replace.',
    replacements: ['confidence check', 'coherence check', 'test', 'verification'],
    termPage: 'https://inclusivenaming.org/word-lists/tier-2/sanity-check/index.html',
  },
  {
    term: 'sanity check',
    tier: 2,
    recommendation: 'Replace.',
    replacements: ['confidence check', 'coherence check', 'test', 'verification'],
    termPage: 'https://inclusivenaming.org/word-lists/tier-2/sanity-check/index.html',
  },
  // Tier 3 — "Consider replacing"
  {
    term: 'blast-radius',
    tier: 3,
    recommendation: 'Recommended to replace.',
    replacements: ['extent', 'affected components'],
    termPage: 'https://inclusivenaming.org/word-lists/tier-3/blast-radius/index.html',
  },
  {
    term: 'blast radius',
    tier: 3,
    recommendation: 'Recommended to replace.',
    replacements: ['extent', 'affected components'],
    termPage: 'https://inclusivenaming.org/word-lists/tier-3/blast-radius/index.html',
  },
  {
    term: 'end-of-life',
    tier: 3,
    recommendation: 'Recommended to replace.',
    replacements: ['end of support', 'device retirement', 'end of warranty'],
    termPage: 'https://inclusivenaming.org/word-lists/tier-3/end-of-life/index.html',
  },
  {
    term: 'evangelist',
    tier: 3,
    recommendation: 'Recommended to replace.',
    replacements: ['influencer', 'advocate', 'ambassador', 'proponent'],
    termPage: 'https://inclusivenaming.org/word-lists/tier-3/evangelist/index.html',
  },
  {
    term: 'hallucinate',
    tier: 3,
    recommendation: 'Recommended to replace when possible.',
    replacements: ['inaccurate information', 'factual error', 'incorrect assertion'],
    termPage: 'https://inclusivenaming.org/word-lists/tier-3/hallucinate/index.html',
  },
  {
    term: 'man-hour',
    tier: 3,
    recommendation: 'Recommended to replace.',
    replacements: ['work-hour', 'person-hour', 'staff-hour', 'hour'],
    termPage: 'https://inclusivenaming.org/word-lists/tier-3/man-hour/index.html',
  },
  {
    term: 'man-in-the-middle',
    tier: 3,
    recommendation: 'Consider replacement.',
    replacements: ['adversary-in-the-middle attack', 'interceptor attack', 'intermediary attack'],
    termPage: 'https://inclusivenaming.org/word-lists/tier-3/man-in-middle/index.html',
  },
  {
    term: 'segregate',
    tier: 3,
    recommendation: 'Replace.',
    replacements: ['segment', 'separate'],
    termPage: 'https://inclusivenaming.org/word-lists/tier-3/segregate/index.html',
  },
  {
    term: 'totem-pole',
    tier: 3,
    recommendation: 'Recommended to replace.',
    replacements: [],
    termPage: 'https://inclusivenaming.org/word-lists/tier-3/totem-pole/index.html',
  },
] as const

import type { InclusiveNamingSeverity } from '@/lib/analyzer/analysis-result'

export const TIER_SEVERITY_LABELS: Record<INITier, InclusiveNamingSeverity> = {
  1: 'Replace immediately',
  2: 'Recommended to replace',
  3: 'Consider replacing',
}

export const TIER_PENALTIES: Record<INITier, number> = {
  1: 0.25,
  2: 0.15,
  3: 0.10,
}

/**
 * Tier 0 terms explicitly excluded from checks.
 * Listed here for documentation and testing purposes.
 */
export const TIER_0_EXCLUDED_TERMS = [
  'blackbox',
  'blackout',
  'disable',
  'fair hiring practice',
  'fellow',
  'master inventor',
  'mastermind',
  'parent child',
  'red team',
  'white-label',
  'whitebox',
] as const
