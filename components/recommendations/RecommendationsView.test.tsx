import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { AnalysisResult } from '@/lib/analyzer/analysis-result'
import { RecommendationsView } from './RecommendationsView'
import { buildResult } from '@/lib/testing/fixtures'

describe('RecommendationsView security recommendations', () => {
  it('renders grouped security recommendations with category headings', () => {
    const result = buildResult({
      securityResult: {
        scorecard: {
          overallScore: 3.0,
          checks: [
            { name: 'Dangerous-Workflow', score: 2, reason: 'dangerous patterns' },
            { name: 'CI-Tests', score: 5, reason: 'some tests' },
            { name: 'Fuzzing', score: 3, reason: 'no fuzzing' },
          ],
          scorecardVersion: 'v5.0.0',
        },
        directChecks: [
          { name: 'security_policy', detected: true, details: null },
          { name: 'dependabot', detected: true, details: null },
          { name: 'ci_cd', detected: true, details: null },
          { name: 'branch_protection', detected: true, details: null },
        ],
        branchProtectionEnabled: true,
      },
    })
    render(<RecommendationsView results={[result]} />)

    expect(screen.getByText('Critical Issues')).toBeInTheDocument()
    expect(screen.getByText('Quick Wins')).toBeInTheDocument()
    expect(screen.getByText('Best Practices')).toBeInTheDocument()
  })

  it('shows source labels on security recommendations', () => {
    const result = buildResult({
      securityResult: {
        scorecard: {
          overallScore: 3.0,
          checks: [
            { name: 'Token-Permissions', score: 3, reason: 'weak' },
          ],
          scorecardVersion: 'v5.0.0',
        },
        directChecks: [
          { name: 'security_policy', detected: false, details: null },
          { name: 'dependabot', detected: true, details: null },
          { name: 'ci_cd', detected: true, details: null },
          { name: 'branch_protection', detected: true, details: null },
        ],
        branchProtectionEnabled: true,
      },
    })
    render(<RecommendationsView results={[result]} />)

    expect(screen.getByText('OpenSSF Scorecard')).toBeInTheDocument()
    expect(screen.getByText('Direct check')).toBeInTheDocument()
  })

  it('renders remediation hints when present', () => {
    const result = buildResult({
      securityResult: {
        scorecard: {
          overallScore: 3.0,
          checks: [
            { name: 'Token-Permissions', score: 3, reason: 'weak permissions' },
          ],
          scorecardVersion: 'v5.0.0',
        },
        directChecks: [
          { name: 'security_policy', detected: true, details: null },
          { name: 'dependabot', detected: true, details: null },
          { name: 'ci_cd', detected: true, details: null },
          { name: 'branch_protection', detected: true, details: null },
        ],
        branchProtectionEnabled: true,
      },
    })
    render(<RecommendationsView results={[result]} />)

    expect(screen.getByText(/permissions: read-all/)).toBeInTheDocument()
  })

  it('renders docs links for Scorecard recommendations', () => {
    const result = buildResult({
      securityResult: {
        scorecard: {
          overallScore: 3.0,
          checks: [
            { name: 'Token-Permissions', score: 3, reason: 'weak' },
          ],
          scorecardVersion: 'v5.0.0',
        },
        directChecks: [
          { name: 'security_policy', detected: true, details: null },
          { name: 'dependabot', detected: true, details: null },
          { name: 'ci_cd', detected: true, details: null },
          { name: 'branch_protection', detected: true, details: null },
        ],
        branchProtectionEnabled: true,
      },
    })
    render(<RecommendationsView results={[result]} />)

    const link = screen.getByRole('link', { name: /scorecard docs/i })
    expect(link).toHaveAttribute('href', expect.stringContaining('checks.md'))
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('handles recommendations with null hints gracefully', () => {
    const result = buildResult({
      securityResult: {
        scorecard: {
          overallScore: 3.0,
          checks: [
            { name: 'Maintained', score: 3, reason: 'low activity' },
          ],
          scorecardVersion: 'v5.0.0',
        },
        directChecks: [
          { name: 'security_policy', detected: true, details: null },
          { name: 'dependabot', detected: true, details: null },
          { name: 'ci_cd', detected: true, details: null },
          { name: 'branch_protection', detected: true, details: null },
        ],
        branchProtectionEnabled: true,
      },
    })
    render(<RecommendationsView results={[result]} />)

    expect(screen.getByText('Maintain regular development activity')).toBeInTheDocument()
  })
})

describe('RecommendationsView collapse/expand', () => {
  // Build a result that produces both Contributors and Security recommendations
  function buildCollapsibleResult(): AnalysisResult {
    return buildResult({
      // Security result to generate Security recommendations
      securityResult: {
        scorecard: {
          overallScore: 2.0,
          checks: [
            { name: 'Dangerous-Workflow', score: 2, reason: 'dangerous patterns' },
            { name: 'Token-Permissions', score: 3, reason: 'weak' },
            { name: 'Fuzzing', score: 3, reason: 'no fuzzing' },
          ],
          scorecardVersion: 'v5.0.0',
        },
        directChecks: [
          { name: 'security_policy', detected: false, details: null },
          { name: 'dependabot', detected: false, details: null },
          { name: 'ci_cd', detected: true, details: null },
          { name: 'branch_protection', detected: false, details: null },
        ],
        branchProtectionEnabled: false,
      },
    })
  }

  it('renders all buckets expanded by default', () => {
    render(<RecommendationsView results={[buildCollapsibleResult()]} />)

    // Contributors bucket header should be visible (via button)
    expect(screen.getByRole('button', { name: /Contributors/i })).toBeInTheDocument()
    // Security bucket header should be visible
    expect(screen.getByRole('button', { name: /Security/i })).toBeInTheDocument()

    // Recommendation content should be visible (not collapsed)
    expect(screen.getByText(/No maintainers identified/)).toBeInTheDocument()
    expect(screen.getByText('Critical Issues')).toBeInTheDocument()
  })

  it('collapses a non-security bucket when its header is clicked', async () => {
    const user = userEvent.setup()
    render(<RecommendationsView results={[buildCollapsibleResult()]} />)

    // Find and click the Contributors bucket toggle
    const contributorsToggle = screen.getByRole('button', { name: /Contributors/i })
    await user.click(contributorsToggle)

    // Contributors recommendations should be hidden
    expect(screen.queryByText(/No maintainers identified/)).not.toBeInTheDocument()

    // Security should still be visible
    expect(screen.getByText('Critical Issues')).toBeInTheDocument()
  })

  it('expands a collapsed bucket when its header is clicked again', async () => {
    const user = userEvent.setup()
    render(<RecommendationsView results={[buildCollapsibleResult()]} />)

    const contributorsToggle = screen.getByRole('button', { name: /Contributors/i })
    // Collapse
    await user.click(contributorsToggle)
    expect(screen.queryByText(/No maintainers identified/)).not.toBeInTheDocument()

    // Expand again
    await user.click(contributorsToggle)
    expect(screen.getByText(/No maintainers identified/)).toBeInTheDocument()
  })

  it('collapses the Security bucket when its header is clicked', async () => {
    const user = userEvent.setup()
    render(<RecommendationsView results={[buildCollapsibleResult()]} />)

    const securityToggle = screen.getByRole('button', { name: /Security/i })
    await user.click(securityToggle)

    // Security category headings and cards should be hidden
    expect(screen.queryByText('Critical Issues')).not.toBeInTheDocument()
    expect(screen.queryByText('Quick Wins')).not.toBeInTheDocument()
  })

  it('collapses a Security category independently', async () => {
    const user = userEvent.setup()
    render(<RecommendationsView results={[buildCollapsibleResult()]} />)

    // Find the Critical Issues category toggle within Security
    const criticalToggle = screen.getByRole('button', { name: /Critical Issues/i })
    await user.click(criticalToggle)

    // Critical Issues content should be hidden but other categories remain
    // The button itself should still be visible (collapsed header)
    expect(screen.getByRole('button', { name: /Critical Issues/i })).toBeInTheDocument()
    // Quick Wins or Best Practices should still be visible
    expect(screen.getByText('Quick Wins')).toBeInTheDocument()
  })

  it('shows Expand all / Collapse all toggle', async () => {
    const user = userEvent.setup()
    render(<RecommendationsView results={[buildCollapsibleResult()]} />)

    // Should show "Collapse all" initially since all are expanded
    const collapseAllBtn = screen.getByRole('button', { name: /Collapse all/i })
    expect(collapseAllBtn).toBeInTheDocument()

    await user.click(collapseAllBtn)

    // All recommendation content should be hidden
    expect(screen.queryByText(/No maintainers identified/)).not.toBeInTheDocument()
    expect(screen.queryByText('Critical Issues')).not.toBeInTheDocument()

    // Toggle should now say "Expand all"
    const expandAllBtn = screen.getByRole('button', { name: /Expand all/i })
    expect(expandAllBtn).toBeInTheDocument()

    await user.click(expandAllBtn)

    // All content should be visible again
    expect(screen.getByText(/No maintainers identified/)).toBeInTheDocument()
    expect(screen.getByText('Critical Issues')).toBeInTheDocument()
  })

  it('shows chevron indicators on bucket headers', () => {
    render(<RecommendationsView results={[buildCollapsibleResult()]} />)

    // Chevron SVG should be present on bucket toggle buttons
    const contributorsToggle = screen.getByRole('button', { name: /Contributors/i })
    expect(contributorsToggle.querySelector('svg')).toBeInTheDocument()
  })
})
