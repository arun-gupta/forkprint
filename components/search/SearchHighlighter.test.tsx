import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SearchHighlighter } from './SearchHighlighter'

describe('SearchHighlighter', () => {
  it('renders plain text when query is empty', () => {
    render(<SearchHighlighter text="Hello World" query="" />)
    expect(screen.getByText('Hello World')).toBeInTheDocument()
    expect(screen.queryByRole('mark')).not.toBeInTheDocument()
  })

  it('highlights matching substring', () => {
    const { container } = render(<SearchHighlighter text="SEC-3 Branch Protection" query="SEC-3" />)
    const marks = container.querySelectorAll('mark')
    expect(marks).toHaveLength(1)
    expect(marks[0].textContent).toBe('SEC-3')
  })

  it('highlights case-insensitively', () => {
    const { container } = render(<SearchHighlighter text="Critical risk level" query="critical" />)
    const marks = container.querySelectorAll('mark')
    expect(marks).toHaveLength(1)
    expect(marks[0].textContent).toBe('Critical')
  })

  it('highlights multiple occurrences', () => {
    const { container } = render(<SearchHighlighter text="test foo test bar test" query="test" />)
    const marks = container.querySelectorAll('mark')
    expect(marks).toHaveLength(3)
  })

  it('renders plain text when no match found', () => {
    const { container } = render(<SearchHighlighter text="Hello World" query="xyz" />)
    expect(container.querySelectorAll('mark')).toHaveLength(0)
    expect(screen.getByText('Hello World')).toBeInTheDocument()
  })

  it('treats special regex characters as literal text', () => {
    const { container } = render(<SearchHighlighter text="version 1.0.0 release" query="1.0.0" />)
    const marks = container.querySelectorAll('mark')
    expect(marks).toHaveLength(1)
    expect(marks[0].textContent).toBe('1.0.0')
  })
})
