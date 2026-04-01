import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ScoreBadge } from './ScoreBadge'

describe('ScoreBadge', () => {
  it('renders the category label and score value', () => {
    render(<ScoreBadge category="Evolution" value="Not scored yet" tone="neutral" />)

    expect(screen.getByText('Evolution')).toBeInTheDocument()
    expect(screen.getByText('Not scored yet')).toBeInTheDocument()
  })
})
