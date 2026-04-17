import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { DocumentationFormulaCard } from './DocumentationFormulaCard'
import { COMPOSITE_WEIGHTS } from '@/lib/documentation/score-config'

describe('DocumentationFormulaCard', () => {
  it('renders the score help section with four-part model description derived from COMPOSITE_WEIGHTS', () => {
    render(<DocumentationFormulaCard />)

    const fp = `${Math.round(COMPOSITE_WEIGHTS.filePresence * 100)}%`
    const rq = `${Math.round(COMPOSITE_WEIGHTS.readmeQuality * 100)}%`
    const lic = `${Math.round(COMPOSITE_WEIGHTS.licensing * 100)}%`
    const ini = `${Math.round(COMPOSITE_WEIGHTS.inclusiveNaming * 100)}%`

    expect(screen.getByText(/how is documentation scored/i)).toBeInTheDocument()
    expect(
      screen.getByText(new RegExp(`file presence \\(${fp}\\).*readme quality \\(${rq}\\).*licensing compliance \\(${lic}\\).*inclusive naming \\(${ini}\\)`, 'i'))
    ).toBeInTheDocument()
  })

  it('renders weight chips without per-repo values', () => {
    render(<DocumentationFormulaCard />)

    expect(screen.getByText('File Presence')).toBeInTheDocument()
    expect(screen.getByText('README Quality')).toBeInTheDocument()
    expect(screen.getByText('Licensing & Compliance')).toBeInTheDocument()
    expect(screen.getByText('Inclusive Naming')).toBeInTheDocument()
  })

  it('shows factor details when button is clicked', async () => {
    const user = userEvent.setup()
    render(<DocumentationFormulaCard />)

    expect(screen.queryByText(/presence of key documentation files/i)).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /show details/i }))

    expect(screen.getByText(/presence of key documentation files/i)).toBeInTheDocument()
    expect(screen.getByText(/detection of key readme sections/i)).toBeInTheDocument()
    expect(screen.getByText(/license recognition.*osi approval/i)).toBeInTheDocument()
  })

  it('hides details when button is clicked again', async () => {
    const user = userEvent.setup()
    render(<DocumentationFormulaCard />)

    await user.click(screen.getByRole('button', { name: /show details/i }))
    expect(screen.getByText(/presence of key documentation files/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /hide details/i }))
    expect(screen.queryByText(/presence of key documentation files/i)).not.toBeInTheDocument()
  })
})
