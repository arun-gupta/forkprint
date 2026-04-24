import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MetricCardsOverview } from './MetricCardsOverview'
import { buildResult } from '@/lib/testing/fixtures'

describe('MetricCardsOverview', () => {
  it('renders one card per successful repository', () => {
    render(<MetricCardsOverview results={[buildResult({ repo: 'facebook/react' }), buildResult({ repo: 'kubernetes/kubernetes' })]} />)

    expect(screen.getByTestId('metric-card-facebook/react')).toBeInTheDocument()
    expect(screen.getByTestId('metric-card-kubernetes/kubernetes')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /missing data/i })).not.toBeInTheDocument()
  })
})
