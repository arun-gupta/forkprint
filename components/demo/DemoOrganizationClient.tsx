'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ResultsShell } from '@/components/app-shell/ResultsShell'
import { OrgInventoryView } from '@/components/org-inventory/OrgInventoryView'
import { OrgBucketContent } from '@/components/org-summary/OrgBucketContent'
import { OrgWindowSelector } from '@/components/org-summary/OrgWindowSelector'
import { ReportSearchBar } from '@/components/search/ReportSearchBar'
import { SearchProvider } from '@/components/search/SearchContext'
import { buildOrgSummaryViewModel } from '@/lib/org-aggregation/view-model'
import type { AnalysisResult } from '@/lib/analyzer/analysis-result'
import type { OrgInventoryResponse } from '@/lib/analyzer/org-inventory'
import type { OrgAggregationRun } from '@/lib/org-aggregation/types'
import type { ContributorDiversityWindow } from '@/lib/org-aggregation/aggregators/types'
import type { TwoFactorEnforcementSection } from '@/lib/governance/two-factor'
import type { StaleAdminsSection } from '@/lib/governance/stale-admins'
import type { TabMatchCounts } from '@/lib/search/types'
import type { ResultTabDefinition } from '@/specs/006-results-shell/contracts/results-shell-props'

interface DemoOrganizationClientProps {
  response: OrgInventoryResponse
  governance: {
    twoFactor: TwoFactorEnforcementSection | null
    staleAdmins: StaleAdminsSection | null
  }
  topReposAnalyzed: AnalysisResult[]
}

const DEMO_ORG_TABS: ResultTabDefinition[] = [
  {
    id: 'overview',
    label: 'Overview',
    status: 'implemented',
    description: 'Organization inventory and footprint.',
  },
  {
    id: 'contributors',
    label: 'Contributors',
    status: 'implemented',
    description: 'Org-level contributor diversity and affiliations (top repos).',
  },
  {
    id: 'activity',
    label: 'Activity',
    status: 'implemented',
    description: 'Org-level activity, release cadence, and stale work (top repos).',
  },
  {
    id: 'responsiveness',
    label: 'Responsiveness',
    status: 'implemented',
    description: 'Org-level responsiveness metrics (top repos).',
  },
  {
    id: 'documentation',
    label: 'Documentation',
    status: 'implemented',
    description: 'Org-level documentation coverage, inclusive naming, and adopters (top repos).',
  },
  {
    id: 'governance',
    label: 'Governance',
    status: 'implemented',
    description: 'Org-level hygiene and policy — 2FA enforcement, admin activity, governance files.',
  },
  {
    id: 'security',
    label: 'Security',
    status: 'implemented',
    description: 'Org-level OpenSSF Scorecard rollup (top repos).',
  },
]

function buildSyntheticRun(org: string, results: AnalysisResult[]): OrgAggregationRun {
  const now = new Date()
  const perRepo = new Map<string, { repo: string; status: 'done'; result: AnalysisResult; startedAt: Date; finishedAt: Date }>()
  for (const result of results) {
    perRepo.set(result.repo, {
      repo: result.repo,
      status: 'done',
      result,
      startedAt: now,
      finishedAt: now,
    })
  }
  return {
    org,
    repos: results.map((r) => r.repo),
    concurrency: 1,
    effectiveConcurrency: 1,
    updateCadence: { kind: 'on-completion-only' },
    startedAt: now,
    status: 'complete',
    perRepo,
    pauseHistory: [],
    notificationOptIn: false,
    flagshipRepos: [],
  }
}

export function DemoOrganizationClient({ response, governance, topReposAnalyzed }: DemoOrganizationClientProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [domTotalMatches, setDomTotalMatches] = useState(0)
  const [domMatchedTabCount, setDomMatchedTabCount] = useState(0)
  const [orgWindow, setOrgWindow] = useState<ContributorDiversityWindow>(90)

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedQuery(searchQuery)
      if (!searchQuery) {
        setDomTotalMatches(0)
        setDomMatchedTabCount(0)
      }
    }, searchQuery ? 300 : 0)
    return () => clearTimeout(timeout)
  }, [searchQuery])

  const handleDomMatchCounts = useCallback(
    (counts: { domMatchCounts: TabMatchCounts; domTotalMatches: number; domMatchedTabCount: number }) => {
      setDomTotalMatches(counts.domTotalMatches)
      setDomMatchedTabCount(counts.domMatchedTabCount)
    },
    [],
  )

  const [nowMs] = useState(() => Date.now())
  const view = useMemo(() => {
    if (topReposAnalyzed.length === 0) return null
    const run = buildSyntheticRun(response.org, topReposAnalyzed)
    return buildOrgSummaryViewModel(run, nowMs)
  }, [response.org, topReposAnalyzed, nowMs])

  const emptyPanel = (
    <p className="text-sm text-slate-500 dark:text-slate-400">
      Not available in demo mode.
    </p>
  )

  return (
    <SearchProvider query={debouncedQuery}>
      <ResultsShell
        initialActiveTab="overview"
        analysisPanel={<DemoOrgAnalysisPanel org={response.org} topCount={topReposAnalyzed.length} />}
        tabs={DEMO_ORG_TABS}
        searchQuery={debouncedQuery}
        onDomMatchCounts={handleDomMatchCounts}
        toolbar={
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <ReportSearchBar
              query={searchQuery}
              onQueryChange={setSearchQuery}
              totalMatches={domTotalMatches}
              matchedTabCount={domMatchedTabCount}
            />
            {view ? <OrgWindowSelector selected={orgWindow} onChange={setOrgWindow} /> : null}
          </div>
        }
        overview={
          <OrgInventoryView
            org={response.org}
            summary={response.summary}
            results={response.results}
            rateLimit={response.rateLimit}
            onAnalyzeRepo={() => {
              // No-op: analyzing fresh repositories requires sign-in.
            }}
            onAnalyzeSelected={() => {
              // No-op: analyzing fresh repositories requires sign-in.
            }}
          />
        }
        contributors={view ? (
          <OrgBucketContent bucketId="contributors" view={view} selectedWindow={orgWindow} />
        ) : emptyPanel}
        activity={view ? (
          <OrgBucketContent bucketId="activity" view={view} selectedWindow={orgWindow} />
        ) : emptyPanel}
        responsiveness={view ? (
          <OrgBucketContent bucketId="responsiveness" view={view} selectedWindow={orgWindow} />
        ) : emptyPanel}
        documentation={view ? (
          <OrgBucketContent bucketId="documentation" view={view} selectedWindow={orgWindow} />
        ) : emptyPanel}
        governance={
          <OrgBucketContent
            bucketId="governance"
            view={view}
            selectedWindow={orgWindow}
            org={response.org}
            twoFactorOverride={governance.twoFactor}
            staleAdminsOverride={governance.staleAdmins}
          />
        }
        security={view ? (
          <OrgBucketContent bucketId="security" view={view} selectedWindow={orgWindow} />
        ) : emptyPanel}
        recommendations={emptyPanel}
        comparison={emptyPanel}
      />
    </SearchProvider>
  )
}

function DemoOrgAnalysisPanel({ org, topCount }: { org: string; topCount: number }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Pre-analyzed org inventory
        </h2>
        <p className="text-sm text-slate-700 dark:text-slate-200">
          Browse the <span className="font-mono">{org}</span> organization — inventory and
          governance are pre-fetched, and the top {topCount} repos by stars are fully
          analyzed so Contributors, Activity, Responsiveness, Documentation and Security
          tabs render aggregated rollups against real data.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled
          title="Sign in with GitHub to analyze organization repositories"
          aria-label="Analyze is disabled in demo mode — sign in with GitHub to run a live analysis"
          className="cursor-not-allowed rounded-lg border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-medium text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500"
        >
          Analyze (demo)
        </button>
        <Link
          href="/"
          className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-sky-700"
        >
          Sign in to analyze →
        </Link>
      </div>
    </div>
  )
}
