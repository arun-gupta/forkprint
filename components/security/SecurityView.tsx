'use client'

import { ScoreBadge } from '@/components/metric-cards/ScoreBadge'
import type { AnalysisResult } from '@/lib/analyzer/analysis-result'
import { getSecurityScore } from '@/lib/security/score-config'
import type { SecurityScoreDefinition, ScorecardCheck, DirectSecurityCheck } from '@/lib/security/analysis-result'

interface SecurityViewProps {
  results: AnalysisResult[]
}

const DIRECT_CHECK_LABELS: Record<string, string> = {
  security_policy: 'Security Policy (SECURITY.md)',
  dependabot: 'Dependency Automation (Dependabot/Renovate)',
  ci_cd: 'CI/CD Pipelines (GitHub Actions)',
  branch_protection: 'Branch Protection',
}

function ScorecardChecksTable({ checks }: { checks: ScorecardCheck[] }) {
  return (
    <section aria-label="OpenSSF Scorecard Checks" className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500">OpenSSF Scorecard Checks</h3>
      <div className="mt-3 space-y-2">
        {checks.map((check) => (
          <div key={check.name} className="flex items-center justify-between">
            <span className="text-sm text-slate-700">{check.name}</span>
            <div className="flex items-center gap-2">
              {check.score === -1 ? (
                <span className="text-xs text-slate-400">indeterminate</span>
              ) : (
                <span className={`text-sm font-medium ${check.score >= 7 ? 'text-emerald-600' : check.score >= 4 ? 'text-amber-600' : 'text-red-500'}`}>
                  {check.score}/10
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function DirectChecksSection({ checks }: { checks: DirectSecurityCheck[] }) {
  return (
    <section aria-label="Direct Security Checks" className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500">Direct Security Checks</h3>
      <ul className="mt-3 space-y-2">
        {checks.map((check) => (
          <li key={check.name} className="flex items-start gap-2">
            {check.detected === 'unavailable' ? (
              <span className="mt-0.5 text-sm text-slate-400">—</span>
            ) : check.detected ? (
              <span className="mt-0.5 text-sm text-emerald-600">✓</span>
            ) : (
              <span className="mt-0.5 text-sm text-red-400">✗</span>
            )}
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-700">{DIRECT_CHECK_LABELS[check.name] ?? check.name}</p>
              {check.details ? (
                <p className="text-xs text-slate-500">{check.details}</p>
              ) : check.detected === 'unavailable' ? (
                <p className="text-xs text-slate-400">Unavailable</p>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

function RecommendationsSection({ recommendations }: { recommendations: SecurityScoreDefinition['recommendations'] }) {
  if (recommendations.length === 0) return null

  return (
    <section aria-label="Security Recommendations" className="rounded-xl border border-amber-200 bg-amber-50 p-4">
      <h3 className="text-xs font-medium uppercase tracking-wide text-amber-700">Recommendations</h3>
      <ul className="mt-3 space-y-2">
        {recommendations.map((rec) => (
          <li key={`${rec.category}-${rec.item}`} className="text-sm text-amber-900">
            {rec.text}
          </li>
        ))}
      </ul>
    </section>
  )
}

function SecuritySummary({ score }: { score: SecurityScoreDefinition }) {
  const modeLabel = score.mode === 'scorecard' ? 'Scorecard + direct checks' : 'Direct checks only'

  return (
    <div className="flex items-center gap-4">
      <ScoreBadge
        category="Security"
        value={typeof score.value === 'number' ? score.value : 'Insufficient verified public data'}
        tone={score.tone}
      />
      <div className="min-w-0">
        <p className="text-sm text-slate-500">
          {typeof score.value === 'number'
            ? `${score.value}/100`
            : score.value}
        </p>
        <p className="text-xs text-slate-400" data-testid="security-mode">{modeLabel}</p>
      </div>
    </div>
  )
}

export function SecurityView({ results }: SecurityViewProps) {
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

        return (
          <div key={result.repo} className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-slate-900">{result.repo}</h2>

            <div className="mt-4">
              <SecuritySummary score={score} />
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {hasScorecard ? (
                <ScorecardChecksTable
                  checks={(result.securityResult.scorecard as Exclude<typeof result.securityResult.scorecard, 'unavailable'>).checks}
                />
              ) : (
                <section aria-label="OpenSSF Scorecard" className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500">OpenSSF Scorecard</h3>
                  <p className="mt-3 text-sm text-slate-400">Scorecard data not available for this repository.</p>
                </section>
              )}

              <DirectChecksSection checks={result.securityResult.directChecks} />
            </div>

            <div className="mt-4">
              <RecommendationsSection recommendations={score.recommendations} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
