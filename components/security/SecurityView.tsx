'use client'

import { useState } from 'react'
import { ScoreBadge } from '@/components/metric-cards/ScoreBadge'
import { TagPill, ActiveFilterBar } from '@/components/tags/TagPill'
import type { AnalysisResult } from '@/lib/analyzer/analysis-result'
import { getSecurityScore } from '@/lib/security/score-config'
import type { ScorecardCheck, DirectSecurityCheck, SecurityScoreDefinition } from '@/lib/security/analysis-result'
import { GOVERNANCE_SCORECARD_CHECKS, GOVERNANCE_DIRECT_CHECKS } from '@/lib/tags/governance'
import { getScorecardCheckTags, getDirectCheckTags } from '@/lib/tags/tag-mappings'

interface SecurityViewProps {
  results: AnalysisResult[]
  activeTag?: string | null
  onTagChange?: (tag: string | null) => void
}

const DIRECT_CHECK_LABELS: Record<string, string> = {
  security_policy: 'Security Policy (SECURITY.md)',
  dependabot: 'Dependency Automation (Dependabot/Renovate)',
  ci_cd: 'CI/CD Pipelines (GitHub Actions)',
  branch_protection: 'Branch Protection',
}

function getAllScorecardTags(name: string): string[] {
  const tags: string[] = []
  if (GOVERNANCE_SCORECARD_CHECKS.has(name)) tags.push('governance')
  tags.push(...getScorecardCheckTags(name))
  return tags
}

function getAllDirectCheckTags(name: string): string[] {
  const tags: string[] = []
  if (GOVERNANCE_DIRECT_CHECKS.has(name)) tags.push('governance')
  tags.push(...getDirectCheckTags(name))
  return tags
}

function ScorecardChecksTable({ checks, activeTag, onTagClick }: { checks: ScorecardCheck[]; activeTag: string | null; onTagClick: (tag: string) => void }) {
  const filtered = activeTag ? checks.filter((c) => getAllScorecardTags(c.name).includes(activeTag)) : checks
  if (filtered.length === 0) return null

  return (
    <section aria-label="OpenSSF Scorecard Checks" className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500">OpenSSF Scorecard Checks</h3>
      <div className="mt-3 space-y-1.5">
        {filtered.map((check) => {
          const tags = getAllScorecardTags(check.name)
          return (
            <div key={check.name}>
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <span className="text-sm text-slate-700">{check.name}</span>
                {check.score === -1 ? (
                  <span className="text-xs text-slate-400">indeterminate</span>
                ) : (
                  <span className={`text-sm font-medium ${check.score >= 7 ? 'text-emerald-600' : check.score >= 4 ? 'text-amber-600' : 'text-red-500'}`}>
                    {check.score}/10
                  </span>
                )}
              </div>
              {tags.length > 0 && (
                <div className="mt-1 hidden flex-wrap gap-1 sm:flex">
                  {tags.map((tag) => <TagPill key={tag} tag={tag} active={activeTag === tag} onClick={onTagClick} />)}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

function DirectChecksSection({ checks, activeTag, onTagClick }: { checks: DirectSecurityCheck[]; activeTag: string | null; onTagClick: (tag: string) => void }) {
  const filtered = activeTag ? checks.filter((c) => getAllDirectCheckTags(c.name).includes(activeTag)) : checks
  if (filtered.length === 0) return null

  return (
    <section aria-label="Direct Security Checks" className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500">Direct Security Checks</h3>
      <ul className="mt-3 space-y-2">
        {filtered.map((check) => {
          const tags = getAllDirectCheckTags(check.name)
          return (
            <li key={check.name} className="flex items-start gap-2">
              {check.detected === 'unavailable' ? (
                <span className="mt-0.5 text-sm text-slate-400">—</span>
              ) : check.detected ? (
                <span className="mt-0.5 text-sm text-emerald-600">✓</span>
              ) : (
                <span className="mt-0.5 text-sm text-red-400">✗</span>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-700">{DIRECT_CHECK_LABELS[check.name] ?? check.name}</p>
                {check.details ? (
                  <p className="text-xs text-slate-500">{check.details}</p>
                ) : check.detected === 'unavailable' ? (
                  <p className="text-xs text-slate-400">
                    {check.name === 'branch_protection'
                      ? 'Requires admin access to the repository'
                      : 'Unavailable'}
                  </p>
                ) : null}
              </div>
              <span className="hidden shrink-0 gap-1 sm:flex">
                {tags.map((tag) => <TagPill key={tag} tag={tag} active={activeTag === tag} onClick={onTagClick} />)}
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function SecuritySummary({
  score,
  scorecardOverallScore,
}: {
  score: SecurityScoreDefinition
  scorecardOverallScore: number | null
}) {
  const modeLabel = score.mode === 'scorecard' ? 'Scorecard + direct checks' : 'Direct checks only'

  return (
    <div className="flex items-center gap-4">
      <ScoreBadge
        category="Security"
        value={typeof score.value === 'number' ? score.value : 'Insufficient verified public data'}
        tone={score.tone}
      />
      <div className="min-w-0">
        <p className="text-sm text-slate-500" data-testid="security-composite-score">
          {typeof score.value === 'number'
            ? `${score.value}/100`
            : score.value}
        </p>
        {scorecardOverallScore !== null ? (
          <p className="text-sm text-slate-500" data-testid="security-openssf-score">
            OpenSSF Scorecard: {scorecardOverallScore}/10
          </p>
        ) : null}
        <p className="text-xs text-slate-400" data-testid="security-mode">{modeLabel}</p>
      </div>
    </div>
  )
}

export function SecurityView({ results, activeTag: externalTag, onTagChange }: SecurityViewProps) {
  const [localTag, setLocalTag] = useState<string | null>(null)
  const activeTag = externalTag !== undefined ? externalTag : localTag
  const handleTagClick = (tag: string) => {
    const next = activeTag === tag ? null : tag
    if (onTagChange) onTagChange(next)
    else setLocalTag(next)
  }

  if (results.length === 0) return null

  return (
    <div className="space-y-6">
      {results.map((result) => {
        if (result.securityResult === 'unavailable') {
          return (
            <div key={result.repo} className="rounded-xl border border-slate-200 bg-white p-6">
              <h2 className="text-lg font-semibold text-slate-900">{result.repo}</h2>
              <p className="mt-2 text-sm text-slate-400">Security data unavailable.</p>
            </div>
          )
        }

        const score = getSecurityScore(result.securityResult, result.stars)
        const hasScorecard = result.securityResult.scorecard !== 'unavailable'
        const scorecardOverallScore = hasScorecard
          ? (result.securityResult.scorecard as Exclude<typeof result.securityResult.scorecard, 'unavailable'>).overallScore
          : null

        return (
          <div key={result.repo} className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-slate-900">{result.repo}</h2>

            <div className="mt-4">
              <SecuritySummary score={score} scorecardOverallScore={scorecardOverallScore} />
            </div>

            {activeTag ? (
              <div className="mt-4">
                <ActiveFilterBar tag={activeTag} onClear={() => handleTagClick(activeTag)} />
              </div>
            ) : null}

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {hasScorecard ? (
                <ScorecardChecksTable
                  checks={(result.securityResult.scorecard as Exclude<typeof result.securityResult.scorecard, 'unavailable'>).checks}
                  activeTag={activeTag}
                  onTagClick={handleTagClick}
                />
              ) : !activeTag ? (
                <section aria-label="OpenSSF Scorecard" className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500">OpenSSF Scorecard</h3>
                  <p className="mt-3 text-sm text-slate-400">Scorecard data not available for this repository.</p>
                </section>
              ) : null}

              <DirectChecksSection checks={result.securityResult.directChecks} activeTag={activeTag} onTagClick={handleTagClick} />
            </div>

          </div>
        )
      })}
    </div>
  )
}
