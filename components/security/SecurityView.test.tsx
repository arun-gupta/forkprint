import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { AnalysisResult } from '@/lib/analyzer/analysis-result'
import { SecurityView } from './SecurityView'
import { buildResult as _buildResult } from '@/lib/testing/fixtures'

function buildResult(overrides: Partial<AnalysisResult> = {}): AnalysisResult {
  return _buildResult({
    repo: 'facebook/react',
    securityResult: {
      scorecard: {
        overallScore: 7.5,
        checks: [
          { name: 'Security-Policy', score: 10, reason: 'policy found' },
          { name: 'Code-Review', score: 8, reason: 'reviews found' },
        ],
        scorecardVersion: 'v5.0.0',
      },
      directChecks: [
        { name: 'security_policy', detected: true, details: 'SECURITY.md detected' },
        { name: 'dependabot', detected: true, details: 'Dependabot configuration detected' },
        { name: 'ci_cd', detected: true, details: '5 workflow file(s) detected' },
        { name: 'branch_protection', detected: true, details: 'Branch protection enabled' },
      ],
      branchProtectionEnabled: true,
    },
    ...overrides,
  })
}

describe('SecurityView', () => {
  it('shows the aggregate OpenSSF score when Scorecard data is available', () => {
    render(<SecurityView results={[buildResult()]} />)

    expect(screen.getByTestId('security-openssf-score')).toHaveTextContent('OpenSSF Scorecard: 7.5/10')
    expect(screen.getByTestId('security-composite-score')).toBeInTheDocument()
    expect(screen.getByTestId('security-mode')).toHaveTextContent(/scorecard \+ direct checks/i)
  })

  it('hides the aggregate OpenSSF score in direct-only mode', () => {
    render(
      <SecurityView
        results={[
          buildResult({
            securityResult: {
              scorecard: 'unavailable',
              directChecks: [
                { name: 'security_policy', detected: true, details: 'SECURITY.md detected' },
                { name: 'dependabot', detected: false, details: null },
                { name: 'ci_cd', detected: true, details: '2 workflow file(s) detected' },
                { name: 'branch_protection', detected: 'unavailable', details: null },
              ],
              branchProtectionEnabled: 'unavailable',
            },
          }),
        ]}
      />,
    )

    expect(screen.queryByTestId('security-openssf-score')).not.toBeInTheDocument()
    expect(screen.getByTestId('security-mode')).toHaveTextContent(/direct checks only/i)
  })
})
