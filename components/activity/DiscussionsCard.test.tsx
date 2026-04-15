import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { AnalysisResult } from '@/lib/analyzer/analysis-result'
import { DiscussionsCard } from './DiscussionsCard'

// Minimal AnalysisResult; community fields are optional on the type.
function buildResult(overrides: Partial<AnalysisResult> = {}): AnalysisResult {
  return {
    repo: 'foo/bar',
    name: 'bar',
    description: '—',
    createdAt: '2024-01-01T00:00:00Z',
    primaryLanguage: 'TypeScript',
    stars: 100,
    forks: 10,
    watchers: 5,
    commits30d: 5,
    commits90d: 15,
    releases12mo: 2,
    prsOpened90d: 3,
    prsMerged90d: 2,
    issuesOpen: 4,
    issuesClosed90d: 3,
    uniqueCommitAuthors90d: 4,
    totalContributors: 10,
    maintainerCount: 2,
    commitCountsByAuthor: { 'login:alice': 5 },
    commitCountsByExperimentalOrg: 'unavailable',
    experimentalAttributedAuthors90d: 'unavailable',
    experimentalUnattributedAuthors90d: 'unavailable',
    issueFirstResponseTimestamps: 'unavailable',
    issueCloseTimestamps: 'unavailable',
    prMergeTimestamps: 'unavailable',
    documentationResult: 'unavailable',
    licensingResult: 'unavailable',
    defaultBranchName: 'main',
    topics: [],
    inclusiveNamingResult: 'unavailable',
    securityResult: 'unavailable',
    missingFields: [],
    ...overrides,
  }
}

describe('DiscussionsCard', () => {
  const noop = vi.fn()

  it('returns null when hasDiscussionsEnabled is undefined', () => {
    const { container } = render(
      <DiscussionsCard result={buildResult()} activeTag={null} onTagClick={noop} />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('returns null when hasDiscussionsEnabled is unavailable', () => {
    const { container } = render(
      <DiscussionsCard
        result={buildResult({ hasDiscussionsEnabled: 'unavailable' })}
        activeTag={null}
        onTagClick={noop}
      />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders "Not enabled" when Discussions is disabled', () => {
    render(
      <DiscussionsCard
        result={buildResult({ hasDiscussionsEnabled: false })}
        activeTag={null}
        onTagClick={noop}
      />,
    )
    expect(screen.getByText(/not enabled/i)).toBeInTheDocument()
    expect(screen.getByText(/^Discussions$/)).toBeInTheDocument()
  })

  it('renders "no activity yet" when enabled with zero count', () => {
    render(
      <DiscussionsCard
        result={buildResult({
          hasDiscussionsEnabled: true,
          discussionsCountWindow: 0,
          discussionsWindowDays: 90,
        })}
        activeTag={null}
        onTagClick={noop}
      />,
    )
    expect(screen.getByText(/enabled · no activity yet/i)).toBeInTheDocument()
  })

  it('renders count + window when enabled with activity', () => {
    render(
      <DiscussionsCard
        result={buildResult({
          hasDiscussionsEnabled: true,
          discussionsCountWindow: 17,
          discussionsWindowDays: 90,
        })}
        activeTag={null}
        onTagClick={noop}
      />,
    )
    expect(screen.getByText(/enabled · 17 in last 90d/i)).toBeInTheDocument()
  })

  // Issue #194: the card must reflect the selected windowDays prop by
  // recomputing the count locally from the raw createdAt array.
  it('recomputes the count per windowDays prop from raw timestamps', () => {
    const now = Date.now()
    const day10 = new Date(now - 10 * 24 * 3600 * 1000).toISOString()
    const day45 = new Date(now - 45 * 24 * 3600 * 1000).toISOString()
    const day200 = new Date(now - 200 * 24 * 3600 * 1000).toISOString()
    const result = buildResult({
      hasDiscussionsEnabled: true,
      discussionsRecentCreatedAt: [day10, day45, day200],
    })
    const { rerender } = render(
      <DiscussionsCard result={result} activeTag={null} onTagClick={noop} windowDays={30} />,
    )
    expect(screen.getByText(/enabled · 1 in last 30d/i)).toBeInTheDocument()

    rerender(<DiscussionsCard result={result} activeTag={null} onTagClick={noop} windowDays={90} />)
    expect(screen.getByText(/enabled · 2 in last 90d/i)).toBeInTheDocument()

    rerender(<DiscussionsCard result={result} activeTag={null} onTagClick={noop} windowDays={365} />)
    expect(screen.getByText(/enabled · 3 in last 365d/i)).toBeInTheDocument()
  })

  // Issue #194: when the analyzer hit the safety page cap during
  // pagination, the count is a lower bound — annotate with `N+`.
  it('renders "N+" when discussionsRecentTruncated is true', () => {
    const now = Date.now()
    const recent = new Date(now - 5 * 24 * 3600 * 1000).toISOString()
    render(
      <DiscussionsCard
        result={buildResult({
          hasDiscussionsEnabled: true,
          discussionsRecentCreatedAt: Array.from({ length: 2000 }, () => recent),
          discussionsRecentTruncated: true,
        })}
        activeTag={null}
        onTagClick={noop}
        windowDays={30}
      />,
    )
    expect(screen.getByText(/enabled · 2000\+ in last 30d/i)).toBeInTheDocument()
  })

  it('renders exact count (no "+") when not truncated', () => {
    const now = Date.now()
    const recent = new Date(now - 5 * 24 * 3600 * 1000).toISOString()
    render(
      <DiscussionsCard
        result={buildResult({
          hasDiscussionsEnabled: true,
          discussionsRecentCreatedAt: Array.from({ length: 137 }, () => recent),
          discussionsRecentTruncated: false,
        })}
        activeTag={null}
        onTagClick={noop}
        windowDays={30}
      />,
    )
    expect(screen.getByText(/enabled · 137 in last 30d/i)).toBeInTheDocument()
    expect(screen.queryByText(/137\+/)).toBeNull()
  })

  it('carries a community tag pill', () => {
    render(
      <DiscussionsCard
        result={buildResult({ hasDiscussionsEnabled: true, discussionsCountWindow: 5, discussionsWindowDays: 90 })}
        activeTag={null}
        onTagClick={noop}
      />,
    )
    expect(screen.getByRole('button', { name: /community/i })).toBeInTheDocument()
  })
})
