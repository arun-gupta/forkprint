import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PanelShell } from './PanelShell'
import type { AggregatePanel } from '@/lib/org-aggregation/types'

function makePanel(overrides: Partial<AggregatePanel<string>> = {}): AggregatePanel<string> {
  return {
    panelId: 'activity-rollup',
    contributingReposCount: 1,
    totalReposInRun: 1,
    status: 'final',
    value: null,
    lastUpdatedAt: null,
    ...overrides,
  }
}

describe('PanelShell', () => {
  it('renders EmptyState when in-progress and value is null', () => {
    render(
      <PanelShell label="Test" panel={makePanel({ status: 'in-progress', value: null })} noDataMessage="No data">
        <span>body</span>
      </PanelShell>,
    )
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.queryByText('body')).not.toBeInTheDocument()
  })

  it('renders noDataMessage when status is unavailable', () => {
    render(
      <PanelShell label="Test" panel={makePanel({ status: 'unavailable', value: null })} noDataMessage="No data.">
        <span>body</span>
      </PanelShell>,
    )
    expect(screen.getByText('No data.')).toBeInTheDocument()
    expect(screen.queryByText('body')).not.toBeInTheDocument()
  })

  it('renders noDataMessage when value is null and status is final', () => {
    render(
      <PanelShell label="Test" panel={makePanel({ status: 'final', value: null })} noDataMessage="Nothing here.">
        <span>body</span>
      </PanelShell>,
    )
    expect(screen.getByText('Nothing here.')).toBeInTheDocument()
    expect(screen.queryByText('body')).not.toBeInTheDocument()
  })

  it('renders children when value is present', () => {
    render(
      <PanelShell label="Test" panel={makePanel({ status: 'final', value: 'data' })} noDataMessage="No data.">
        <span>body content</span>
      </PanelShell>,
    )
    expect(screen.getByText('body content')).toBeInTheDocument()
    expect(screen.queryByText('No data.')).not.toBeInTheDocument()
  })

  it('renders the label in the heading', () => {
    render(
      <PanelShell label="My Panel" panel={makePanel({ status: 'final', value: 'x' })} noDataMessage="No data.">
        <span>body</span>
      </PanelShell>,
    )
    expect(screen.getByRole('heading', { name: 'My Panel' })).toBeInTheDocument()
  })

  it('uses ariaLabel for the section aria-label when provided', () => {
    const { container } = render(
      <PanelShell label="Short label" ariaLabel="Long aria label" panel={makePanel({ status: 'final', value: 'x' })} noDataMessage="No data.">
        <span>body</span>
      </PanelShell>,
    )
    expect(container.querySelector('section')?.getAttribute('aria-label')).toBe('Long aria label')
  })

  it('shows the lastUpdatedAt timestamp when present', () => {
    const date = new Date(2026, 3, 24, 14, 30, 0)
    render(
      <PanelShell label="Test" panel={makePanel({ status: 'final', value: 'x', lastUpdatedAt: date })} noDataMessage="No data.">
        <span>body</span>
      </PanelShell>,
    )
    expect(screen.getByText(/updated/)).toBeInTheDocument()
  })
})
