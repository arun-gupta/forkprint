import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ReportSearchBar } from './ReportSearchBar'

describe('ReportSearchBar', () => {
  it('renders a search input with placeholder text', () => {
    render(<ReportSearchBar query="" onQueryChange={vi.fn()} totalMatches={0} matchedTabCount={0} />)
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument()
  })

  it('calls onQueryChange when user types', async () => {
    const onQueryChange = vi.fn()
    render(<ReportSearchBar query="" onQueryChange={onQueryChange} totalMatches={0} matchedTabCount={0} />)
    await userEvent.type(screen.getByPlaceholderText(/search/i), 'SEC-3')
    expect(onQueryChange).toHaveBeenCalled()
  })

  it('displays match summary when totalMatches > 0', () => {
    render(<ReportSearchBar query="SEC" onQueryChange={vi.fn()} totalMatches={12} matchedTabCount={4} />)
    expect(screen.getByText(/12 matches across 4 tabs/i)).toBeInTheDocument()
  })

  it('does not display summary when totalMatches is 0 and query is empty', () => {
    render(<ReportSearchBar query="" onQueryChange={vi.fn()} totalMatches={0} matchedTabCount={0} />)
    expect(screen.queryByText(/matches/i)).not.toBeInTheDocument()
  })

  it('shows "0 matches" when query is non-empty but totalMatches is 0', () => {
    render(<ReportSearchBar query="nonexistent" onQueryChange={vi.fn()} totalMatches={0} matchedTabCount={0} />)
    expect(screen.getByText(/0 matches/i)).toBeInTheDocument()
  })

  it('shows a clear button when query is non-empty', () => {
    render(<ReportSearchBar query="SEC" onQueryChange={vi.fn()} totalMatches={3} matchedTabCount={1} />)
    expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument()
  })

  it('clears query when clear button is clicked', async () => {
    const onQueryChange = vi.fn()
    render(<ReportSearchBar query="SEC" onQueryChange={onQueryChange} totalMatches={3} matchedTabCount={1} />)
    await userEvent.click(screen.getByRole('button', { name: /clear/i }))
    expect(onQueryChange).toHaveBeenCalledWith('')
  })

  it('does not show clear button when query is empty', () => {
    render(<ReportSearchBar query="" onQueryChange={vi.fn()} totalMatches={0} matchedTabCount={0} />)
    expect(screen.queryByRole('button', { name: /clear/i })).not.toBeInTheDocument()
  })
})
