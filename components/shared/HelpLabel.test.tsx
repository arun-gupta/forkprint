import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { HelpLabel } from './HelpLabel'

describe('HelpLabel', () => {
  it('renders a consistent accessible info icon when help text is provided', () => {
    render(<HelpLabel label="Merge rate" helpText="Merged pull requests divided by opened pull requests." />)

    const infoIcon = screen.getByLabelText('Merge rate help')

    expect(screen.getByText('Merge rate')).toBeInTheDocument()
    expect(infoIcon.tagName).toBe('SPAN')
    expect(infoIcon).toHaveAttribute('title', 'Merged pull requests divided by opened pull requests.')
    expect(infoIcon.querySelector('svg')).not.toBeNull()
  })

  it('renders only the label when no help text is provided', () => {
    render(<HelpLabel label="Stars" />)

    expect(screen.getByText('Stars')).toBeInTheDocument()
    expect(screen.queryByLabelText(/stars help/i)).not.toBeInTheDocument()
  })
})
