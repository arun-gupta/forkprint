import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ExportControls } from './ExportControls'
import type { AnalyzeResponse } from '@/lib/analyzer/analysis-result'

vi.mock('@/lib/export/json-export', () => ({
  buildJsonExport: vi.fn(() => ({ blob: new Blob(['{}'], { type: 'application/json' }), filename: 'test.json' })),
  triggerDownload: vi.fn(),
}))
vi.mock('@/lib/export/markdown-export', () => ({
  buildMarkdownExport: vi.fn(() => ({ blob: new Blob(['# md'], { type: 'text/markdown' }), filename: 'test.md' })),
}))
vi.mock('@/lib/export/shareable-url', () => ({
  encodeRepos: vi.fn(() => 'http://localhost:3000/?repos=facebook%2Freact'),
}))

const MINIMAL_RESPONSE: AnalyzeResponse = {
  results: [
    {
      repo: 'facebook/react',
      name: 'react',
      description: 'A JS library',
      createdAt: '2013-05-24T16:15:54Z',
      primaryLanguage: 'JavaScript',
      stars: 230000,
      forks: 47000,
      watchers: 6700,
      commits30d: 20,
      commits90d: 60,
      releases12mo: 10,
      prsOpened90d: 40,
      prsMerged90d: 35,
      issuesOpen: 800,
      issuesClosed90d: 120,
      uniqueCommitAuthors90d: 18,
      totalContributors: 1700,
      maintainerCount: 'unavailable',
      commitCountsByAuthor: { alice: 30 },
      commitCountsByExperimentalOrg: {},
      experimentalAttributedAuthors90d: 1,
      experimentalUnattributedAuthors90d: 17,
      issueFirstResponseTimestamps: [],
      issueCloseTimestamps: [],
      prMergeTimestamps: [],
      missingFields: [],
    },
  ],
  failures: [],
  rateLimit: null,
}

describe('ExportControls — disabled state (no results)', () => {
  it('renders Download JSON button disabled when no results', () => {
    render(<ExportControls analysisResponse={null} analyzedRepos={[]} />)
    expect(screen.getByRole('button', { name: /download json/i })).toBeDisabled()
  })

  it('renders Download Markdown button disabled when no results', () => {
    render(<ExportControls analysisResponse={null} analyzedRepos={[]} />)
    expect(screen.getByRole('button', { name: /download markdown/i })).toBeDisabled()
  })

  it('renders Copy link button', () => {
    render(<ExportControls analysisResponse={null} analyzedRepos={[]} />)
    expect(screen.getByRole('button', { name: /copy link/i })).toBeInTheDocument()
  })
})

describe('ExportControls — enabled state (with results)', () => {
  it('Download JSON button is enabled when results are present', () => {
    render(<ExportControls analysisResponse={MINIMAL_RESPONSE} analyzedRepos={['facebook/react']} />)
    expect(screen.getByRole('button', { name: /download json/i })).not.toBeDisabled()
  })

  it('Download Markdown button is enabled when results are present', () => {
    render(<ExportControls analysisResponse={MINIMAL_RESPONSE} analyzedRepos={['facebook/react']} />)
    expect(screen.getByRole('button', { name: /download markdown/i })).not.toBeDisabled()
  })

  it('clicking Download JSON calls buildJsonExport and triggerDownload', async () => {
    const { buildJsonExport, triggerDownload } = await import('@/lib/export/json-export')
    render(<ExportControls analysisResponse={MINIMAL_RESPONSE} analyzedRepos={['facebook/react']} />)
    await userEvent.click(screen.getByRole('button', { name: /download json/i }))
    expect(buildJsonExport).toHaveBeenCalledWith(MINIMAL_RESPONSE)
    expect(triggerDownload).toHaveBeenCalled()
  })

  it('clicking Download Markdown calls buildMarkdownExport and triggerDownload', async () => {
    const { buildMarkdownExport } = await import('@/lib/export/markdown-export')
    const { triggerDownload } = await import('@/lib/export/json-export')
    render(<ExportControls analysisResponse={MINIMAL_RESPONSE} analyzedRepos={['facebook/react']} />)
    await userEvent.click(screen.getByRole('button', { name: /download markdown/i }))
    expect(buildMarkdownExport).toHaveBeenCalledWith(MINIMAL_RESPONSE, ['facebook/react'])
    expect(triggerDownload).toHaveBeenCalled()
  })
})

describe('ExportControls — Copy Link', () => {
  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    })
  })

  it('shows "Copied!" after successful clipboard write', async () => {
    render(<ExportControls analysisResponse={MINIMAL_RESPONSE} analyzedRepos={['facebook/react']} />)
    await userEvent.click(screen.getByRole('button', { name: /copy link/i }))
    expect(screen.getByRole('button', { name: /copied/i })).toBeInTheDocument()
  })

  it('shows fallback input when clipboard API fails', async () => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
    })
    render(<ExportControls analysisResponse={MINIMAL_RESPONSE} analyzedRepos={['facebook/react']} />)
    await userEvent.click(screen.getByRole('button', { name: /copy link/i }))
    expect(screen.getByRole('textbox', { name: /shareable url/i })).toBeInTheDocument()
  })
})
