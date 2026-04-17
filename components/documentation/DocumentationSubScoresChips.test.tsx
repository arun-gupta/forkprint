import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DocumentationSubScoresChips } from './DocumentationSubScoresChips'
import type { DocumentationScoreDefinition } from '@/lib/documentation/score-config'

const mockScore: DocumentationScoreDefinition = {
  value: 75,
  tone: 'success',
  percentile: 75,
  bracketLabel: 'Growing (100–999 stars)',
  compositeScore: 0.75,
  filePresenceScore: 0.8,
  readmeQualityScore: 0.65,
  licensingScore: 0.75,
  inclusiveNamingScore: 1.0,
  recommendations: [],
}

describe('DocumentationSubScoresChips', () => {
  it('renders chips with this repo\u2019s four sub-score values', () => {
    render(<DocumentationSubScoresChips score={mockScore} />)

    expect(screen.getByText('File Presence')).toBeInTheDocument()
    expect(screen.getByText('80%')).toBeInTheDocument()
    expect(screen.getByText('README Quality')).toBeInTheDocument()
    expect(screen.getByText('65%')).toBeInTheDocument()
    expect(screen.getByText('Licensing')).toBeInTheDocument()
    expect(screen.getByText('75%')).toBeInTheDocument()
    expect(screen.getByText('Inclusive Naming')).toBeInTheDocument()
    expect(screen.getByText('100%')).toBeInTheDocument()
  })

  it('does not render the global formula header or weight percentages', () => {
    render(<DocumentationSubScoresChips score={mockScore} />)

    expect(screen.queryByText(/how is documentation scored/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /show details/i })).not.toBeInTheDocument()
  })
})
