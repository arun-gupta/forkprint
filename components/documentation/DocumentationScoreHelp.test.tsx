import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { DocumentationScoreHelp } from './DocumentationScoreHelp'
import type { DocumentationScoreDefinition } from '@/lib/documentation/score-config'

const mockScore: DocumentationScoreDefinition = {
  value: 75,
  tone: 'success',
  percentile: 75,
  bracketLabel: 'Growing (100–999 stars)',
  compositeScore: 0.75,
  filePresenceScore: 0.80,
  readmeQualityScore: 0.60,
  licensingScore: 0.75,
  inclusiveNamingScore: 1.0,
  recommendations: [],
}

describe('DocumentationScoreHelp', () => {
  it('renders the score help section with four-part model description', () => {
    render(<DocumentationScoreHelp score={mockScore} />)

    expect(screen.getByText(/how is documentation scored/i)).toBeInTheDocument()
    expect(screen.getByText(/file presence.*35%.*readme quality.*30%.*licensing compliance.*25%.*inclusive naming.*10%/i)).toBeInTheDocument()
  })

  it('renders factor chips with weights and values', () => {
    render(<DocumentationScoreHelp score={mockScore} />)

    expect(screen.getByText('File Presence')).toBeInTheDocument()
    expect(screen.getByText('README Quality')).toBeInTheDocument()
    expect(screen.getByText('Licensing & Compliance')).toBeInTheDocument()
  })

  it('shows details when button is clicked', async () => {
    const user = userEvent.setup()
    render(<DocumentationScoreHelp score={mockScore} />)

    expect(screen.queryByText(/presence of key documentation files/i)).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /show details/i }))

    expect(screen.getByText(/presence of key documentation files/i)).toBeInTheDocument()
    expect(screen.getByText(/detection of key readme sections/i)).toBeInTheDocument()
    expect(screen.getByText(/license recognition.*osi approval/i)).toBeInTheDocument()
  })

  it('hides details when button is clicked again', async () => {
    const user = userEvent.setup()
    render(<DocumentationScoreHelp score={mockScore} />)

    await user.click(screen.getByRole('button', { name: /show details/i }))
    expect(screen.getByText(/presence of key documentation files/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /hide details/i }))
    expect(screen.queryByText(/presence of key documentation files/i)).not.toBeInTheDocument()
  })
})
