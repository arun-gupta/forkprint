import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { OnboardingPane } from './OnboardingPane'

describe('OnboardingPane', () => {
  it('renders good first issue count when > 0', () => {
    render(<OnboardingPane goodFirstIssueCount={7} devEnvironmentSetup={false} gitpodPresent={false} newContributorPRAcceptanceRate="unavailable" />)
    expect(screen.getByText('7')).toBeDefined()
  })

  it('renders 0 good first issues without hiding the row', () => {
    render(<OnboardingPane goodFirstIssueCount={0} devEnvironmentSetup={false} gitpodPresent={false} newContributorPRAcceptanceRate="unavailable" />)
    expect(screen.getByText('0')).toBeDefined()
  })

  it('shows dev environment setup as present when true', () => {
    render(<OnboardingPane goodFirstIssueCount="unavailable" devEnvironmentSetup={true} gitpodPresent={false} newContributorPRAcceptanceRate="unavailable" />)
    expect(screen.getByText(/present|yes|✓/i)).toBeDefined()
  })

  it('shows dev environment as not-detected when false', () => {
    render(<OnboardingPane goodFirstIssueCount="unavailable" devEnvironmentSetup={false} gitpodPresent={false} newContributorPRAcceptanceRate="unavailable" />)
    expect(screen.getByText(/not detected|no|✗/i)).toBeDefined()
  })

  it('shows acceptance rate as percentage', () => {
    render(<OnboardingPane goodFirstIssueCount="unavailable" devEnvironmentSetup={false} gitpodPresent={false} newContributorPRAcceptanceRate={0.75} />)
    expect(screen.getByText(/75/)).toBeDefined()
  })

  it('shows acceptance rate as unavailable when unavailable', () => {
    render(<OnboardingPane goodFirstIssueCount="unavailable" devEnvironmentSetup={false} gitpodPresent={false} newContributorPRAcceptanceRate="unavailable" />)
    const dashes = screen.getAllByText('—')
    expect(dashes.length).toBeGreaterThan(0)
  })

  it('shows Gitpod as present when true', () => {
    render(<OnboardingPane goodFirstIssueCount="unavailable" devEnvironmentSetup={false} gitpodPresent={true} newContributorPRAcceptanceRate="unavailable" />)
    expect(screen.getByText(/gitpod/i)).toBeDefined()
  })

  it('shows all signals as unavailable (—) when all are unavailable', () => {
    render(
      <OnboardingPane
        goodFirstIssueCount="unavailable"
        devEnvironmentSetup="unavailable"
        gitpodPresent="unavailable"
        newContributorPRAcceptanceRate="unavailable"
      />
    )
    const dashes = screen.getAllByText('—')
    expect(dashes.length).toBeGreaterThanOrEqual(3)
  })
})
