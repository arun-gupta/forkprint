import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MetricValue } from './MetricValue'

describe('MetricValue', () => {
  it('renders the em-dash with muted text-slate-400 styling for unavailable values', () => {
    const { container } = render(<MetricValue value="—" />)
    const span = container.querySelector('span')!
    expect(span).toHaveTextContent('—')
    expect(span.className).toContain('text-slate-400')
    expect(span.className).not.toContain('text-slate-900')
    expect(span.className).not.toContain('font-semibold')
  })

  it('renders zero with standard font-semibold text-slate-900 styling', () => {
    const { container } = render(<MetricValue value="0" />)
    const span = container.querySelector('span')!
    expect(span).toHaveTextContent('0')
    expect(span.className).toContain('font-semibold')
    expect(span.className).toContain('text-slate-900')
    expect(span.className).not.toContain('text-slate-400')
  })

  it('renders a formatted number with standard styling', () => {
    const { container } = render(<MetricValue value="1,234" />)
    const span = container.querySelector('span')!
    expect(span).toHaveTextContent('1,234')
    expect(span.className).toContain('font-semibold')
    expect(span.className).toContain('text-slate-900')
    expect(span.className).not.toContain('text-slate-400')
  })

  it('applies optional className alongside the color class', () => {
    const { container } = render(<MetricValue value="42" className="text-lg" />)
    const span = container.querySelector('span')!
    expect(span.className).toContain('text-lg')
    expect(span.className).toContain('font-semibold')
  })

  it('applies optional className to the dash as well', () => {
    const { container } = render(<MetricValue value="—" className="text-lg" />)
    const span = container.querySelector('span')!
    expect(span.className).toContain('text-lg')
    expect(span.className).toContain('text-slate-400')
  })

  it('renders the value as accessible text', () => {
    render(<MetricValue value="244,295" />)
    expect(screen.getByText('244,295')).toBeInTheDocument()
  })
})
