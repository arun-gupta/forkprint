'use client'

import { useState } from 'react'
import type {
  AggregatePanel,
  AggregatePanelMap,
  OrgSummaryViewModel,
} from '@/lib/org-aggregation/types'
import type {
  ContributorDiversityValue,
  ContributorDiversityWindow,
} from '@/lib/org-aggregation/aggregators/types'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import { OrgSummaryView } from '@/components/org-summary/OrgSummaryView'
import { PANEL_ORDER } from '@/components/org-summary/panels/registry'

function placeholderPanels(
  totalReposInRun: number,
  contributingReposCount: number,
  status: AggregatePanel<unknown>['status'],
  lastUpdatedAt: Date | null = contributingReposCount > 0 ? new Date() : null,
): AggregatePanelMap {
  const map: AggregatePanelMap = {}
  for (const id of PANEL_ORDER) {
    if (id === 'contributor-diversity') continue // real fixture added by caller
    if (id === 'maintainers') continue // real fixture added by caller
    map[id] = {
      panelId: id,
      contributingReposCount,
      totalReposInRun,
      status,
      value: null,
      lastUpdatedAt,
    }
  }
  return map
}

function buildMaintainersFixture(
  contributingReposCount: number,
  totalReposInRun: number,
  status: 'in-progress' | 'final',
): AggregatePanel<unknown> {
  const projectWide = [
    { token: 'alice', kind: 'user' as const, reposListed: ['konveyor/konveyor', 'konveyor/kantra', 'konveyor/analyzer-lsp'] },
    { token: 'bob', kind: 'user' as const, reposListed: ['konveyor/konveyor', 'konveyor/kantra'] },
    { token: 'konveyor/maintainers', kind: 'team' as const, reposListed: ['konveyor/konveyor', 'konveyor/tackle2-hub', 'konveyor/tackle2-ui'] },
    { token: 'carol', kind: 'user' as const, reposListed: ['konveyor/move2kube'] },
    { token: 'dave', kind: 'user' as const, reposListed: ['konveyor/operator'] },
  ]
  return {
    panelId: 'maintainers',
    contributingReposCount,
    totalReposInRun,
    status,
    lastUpdatedAt: new Date(),
    value: {
      projectWide,
      perRepo: [
        { repo: 'konveyor/konveyor', tokens: [{ token: 'alice', kind: 'user' }, { token: 'bob', kind: 'user' }, { token: 'konveyor/maintainers', kind: 'team' }] },
        { repo: 'konveyor/kantra', tokens: [{ token: 'alice', kind: 'user' }, { token: 'bob', kind: 'user' }] },
      ],
    },
  }
}

function buildContributorDiversityValue(
  byWindow: Record<
    ContributorDiversityWindow,
    { top: number; elephant: number; unique: number; repeat: number; oneTime: number }
  >,
): ContributorDiversityValue {
  const windows: ContributorDiversityWindow[] = [30, 60, 90, 180, 365]
  const entries = windows.map((w) => {
    const v = byWindow[w]
    return [
      w,
      {
        topTwentyPercentShare: v.top,
        elephantFactor: v.elephant,
        uniqueAuthorsAcrossOrg: v.unique,
        composition: {
          repeatContributors: v.repeat,
          oneTimeContributors: v.oneTime,
          total: v.unique,
        },
        contributingReposCount: v.unique > 0 ? 8 : 0,
      },
    ] as const
  })
  return {
    defaultWindow: 90,
    byWindow: Object.fromEntries(entries) as ContributorDiversityValue['byWindow'],
  }
}

/**
 * Dev-only preview of OrgSummaryView with canned data.
 *
 * NOT wired into any production flow. Exists to let a developer visually
 * verify the org-summary UI (panels, run-status header, per-repo list,
 * flagship badge, empty state, dark-mode styling) before T029 wires the
 * real entry point in OrgInventoryView.
 *
 * URL: /dev/org-summary?scenario=empty | in-progress | complete | with-failure
 */

type Scenario = 'empty' | 'in-progress' | 'complete' | 'with-failure' | 'paused'

function viewForScenario(scenario: Scenario): OrgSummaryViewModel {
  switch (scenario) {
    case 'empty':
      return {
        status: {
          total: 8,
          succeeded: 0,
          failed: 0,
          inProgress: 3,
          queued: 5,
          elapsedMs: 4_000,
          etaMs: null,
          concurrency: { chosen: 3, effective: 3 },
          pause: null,
          status: 'in-progress',
        },
        flagshipRepos: [],
        panels: {
          ...placeholderPanels(8, 0, 'in-progress'),
          'contributor-diversity': {
            panelId: 'contributor-diversity',
            contributingReposCount: 0,
            totalReposInRun: 8,
            status: 'in-progress',
            value: null,
          },
          maintainers: {
            panelId: 'maintainers',
            contributingReposCount: 0,
            totalReposInRun: 8,
            status: 'in-progress',
            value: null,
          },
        },
        missingData: [],
        perRepoStatusList: [
          { repo: 'konveyor/tackle2-hub', status: 'in-progress', badge: 'in-progress', isFlagship: false },
          { repo: 'konveyor/tackle2-ui', status: 'in-progress', badge: 'in-progress', isFlagship: false },
          { repo: 'konveyor/konveyor', status: 'in-progress', badge: 'in-progress', isFlagship: true },
          { repo: 'konveyor/analyzer-lsp', status: 'queued', badge: 'queued', isFlagship: false },
          { repo: 'konveyor/kantra', status: 'queued', badge: 'queued', isFlagship: false },
          { repo: 'konveyor/move2kube', status: 'queued', badge: 'queued', isFlagship: false },
          { repo: 'konveyor/operator', status: 'queued', badge: 'queued', isFlagship: false },
          { repo: 'konveyor/rulesets', status: 'queued', badge: 'queued', isFlagship: false },
        ],
      }
    case 'in-progress':
      return {
        status: {
          total: 8,
          succeeded: 3,
          failed: 0,
          inProgress: 2,
          queued: 3,
          elapsedMs: 42_000,
          etaMs: 60_000,
          concurrency: { chosen: 3, effective: 3 },
          pause: null,
          status: 'in-progress',
        },
        flagshipRepos: [{ repo: 'konveyor/konveyor', source: 'pinned', rank: 0 }],
        panels: {
          ...placeholderPanels(8, 3, 'in-progress'),
          'contributor-diversity': {
            panelId: 'contributor-diversity',
            contributingReposCount: 3,
            totalReposInRun: 8,
            status: 'in-progress',
            lastUpdatedAt: new Date(),
            value: buildContributorDiversityValue({
              30: { top: 0.62, elephant: 2, unique: 9, repeat: 3, oneTime: 6 },
              60: { top: 0.6, elephant: 3, unique: 16, repeat: 6, oneTime: 10 },
              90: { top: 0.58, elephant: 4, unique: 24, repeat: 9, oneTime: 15 },
              180: { top: 0.55, elephant: 6, unique: 38, repeat: 14, oneTime: 24 },
              365: { top: 0.52, elephant: 9, unique: 61, repeat: 22, oneTime: 39 },
            }),
          },
          maintainers: buildMaintainersFixture(3, 8, 'in-progress'),
        },
        missingData: [],
        perRepoStatusList: [
          { repo: 'konveyor/analyzer-lsp', status: 'done', badge: 'done', isFlagship: false, durationMs: 11_200 },
          { repo: 'konveyor/kantra', status: 'in-progress', badge: 'in-progress', isFlagship: false },
          { repo: 'konveyor/konveyor', status: 'done', badge: 'done', isFlagship: true, durationMs: 14_800 },
          { repo: 'konveyor/move2kube', status: 'queued', badge: 'queued', isFlagship: false },
          { repo: 'konveyor/operator', status: 'queued', badge: 'queued', isFlagship: false },
          { repo: 'konveyor/rulesets', status: 'queued', badge: 'queued', isFlagship: false },
          { repo: 'konveyor/tackle2-hub', status: 'in-progress', badge: 'in-progress', isFlagship: false },
          { repo: 'konveyor/tackle2-ui', status: 'done', badge: 'done', isFlagship: false, durationMs: 9_400 },
        ],
      }
    case 'complete':
      return {
        status: {
          total: 8,
          succeeded: 8,
          failed: 0,
          inProgress: 0,
          queued: 0,
          elapsedMs: 112_000,
          etaMs: null,
          concurrency: { chosen: 3, effective: 3 },
          pause: null,
          status: 'complete',
        },
        flagshipRepos: [{ repo: 'konveyor/konveyor', source: 'pinned', rank: 0 }],
        panels: {
          ...placeholderPanels(8, 8, 'final'),
          'contributor-diversity': {
            panelId: 'contributor-diversity',
            contributingReposCount: 8,
            totalReposInRun: 8,
            status: 'final',
            lastUpdatedAt: new Date(),
            value: buildContributorDiversityValue({
              30: { top: 0.58, elephant: 3, unique: 14, repeat: 5, oneTime: 9 },
              60: { top: 0.55, elephant: 4, unique: 26, repeat: 10, oneTime: 16 },
              90: { top: 0.52, elephant: 6, unique: 47, repeat: 18, oneTime: 29 },
              180: { top: 0.5, elephant: 9, unique: 78, repeat: 30, oneTime: 48 },
              365: { top: 0.47, elephant: 14, unique: 132, repeat: 55, oneTime: 77 },
            }),
          },
          maintainers: buildMaintainersFixture(8, 8, 'final'),
        },
        missingData: [
          { repo: 'konveyor/rulesets', signalKey: 'scorecard', reason: 'scorecard not published' },
          { repo: 'konveyor/operator', signalKey: 'governanceMd', reason: 'no GOVERNANCE.md' },
        ],
        perRepoStatusList: [
          { repo: 'konveyor/analyzer-lsp', status: 'done', badge: 'done', isFlagship: false, durationMs: 11_200 },
          { repo: 'konveyor/kantra', status: 'done', badge: 'done', isFlagship: false, durationMs: 13_600 },
          { repo: 'konveyor/konveyor', status: 'done', badge: 'done', isFlagship: true, durationMs: 14_800 },
          { repo: 'konveyor/move2kube', status: 'done', badge: 'done', isFlagship: false, durationMs: 15_100 },
          { repo: 'konveyor/operator', status: 'done', badge: 'done', isFlagship: false, durationMs: 10_900 },
          { repo: 'konveyor/rulesets', status: 'done', badge: 'done', isFlagship: false, durationMs: 9_100 },
          { repo: 'konveyor/tackle2-hub', status: 'done', badge: 'done', isFlagship: false, durationMs: 18_300 },
          { repo: 'konveyor/tackle2-ui', status: 'done', badge: 'done', isFlagship: false, durationMs: 9_400 },
        ],
      }
    case 'with-failure':
      return {
        status: {
          total: 5,
          succeeded: 3,
          failed: 1,
          inProgress: 1,
          queued: 0,
          elapsedMs: 54_000,
          etaMs: 12_000,
          concurrency: { chosen: 3, effective: 3 },
          pause: null,
          status: 'in-progress',
        },
        flagshipRepos: [],
        panels: {
          ...placeholderPanels(5, 3, 'in-progress'),
          'contributor-diversity': {
            panelId: 'contributor-diversity',
            contributingReposCount: 3,
            totalReposInRun: 5,
            status: 'in-progress',
            lastUpdatedAt: new Date(),
            value: buildContributorDiversityValue({
              30: { top: 0.65, elephant: 2, unique: 7, repeat: 2, oneTime: 5 },
              60: { top: 0.63, elephant: 2, unique: 12, repeat: 4, oneTime: 8 },
              90: { top: 0.61, elephant: 3, unique: 18, repeat: 7, oneTime: 11 },
              180: { top: 0.58, elephant: 5, unique: 29, repeat: 11, oneTime: 18 },
              365: { top: 0.55, elephant: 7, unique: 44, repeat: 17, oneTime: 27 },
            }),
          },
          maintainers: buildMaintainersFixture(3, 5, 'in-progress'),
        },
        missingData: [],
        perRepoStatusList: [
          { repo: 'o/alpha', status: 'done', badge: 'done', isFlagship: false },
          { repo: 'o/bravo', status: 'done', badge: 'done', isFlagship: false },
          { repo: 'o/charlie', status: 'failed', badge: 'failed', isFlagship: false, errorReason: 'insufficient scope' },
          { repo: 'o/delta', status: 'in-progress', badge: 'in-progress', isFlagship: false },
          { repo: 'o/echo', status: 'done', badge: 'done', isFlagship: false },
        ],
      }
    case 'paused':
      return {
        status: {
          total: 10,
          succeeded: 4,
          failed: 0,
          inProgress: 0,
          queued: 6,
          elapsedMs: 120_000,
          etaMs: null,
          concurrency: { chosen: 3, effective: 3 },
          pause: {
            kind: 'secondary',
            resumesAt: new Date(Date.now() + 45_000),
            pausesSoFar: 1,
          },
          status: 'paused',
        },
        flagshipRepos: [],
        panels: {
          ...placeholderPanels(10, 4, 'in-progress'),
          'contributor-diversity': {
            panelId: 'contributor-diversity',
            contributingReposCount: 4,
            totalReposInRun: 10,
            status: 'in-progress',
            lastUpdatedAt: new Date(),
            value: buildContributorDiversityValue({
              30: { top: 0.5, elephant: 3, unique: 9, repeat: 3, oneTime: 6 },
              60: { top: 0.48, elephant: 4, unique: 14, repeat: 5, oneTime: 9 },
              90: { top: 0.47, elephant: 5, unique: 21, repeat: 8, oneTime: 13 },
              180: { top: 0.45, elephant: 7, unique: 34, repeat: 13, oneTime: 21 },
              365: { top: 0.42, elephant: 10, unique: 52, repeat: 20, oneTime: 32 },
            }),
          },
          maintainers: buildMaintainersFixture(4, 10, 'in-progress'),
        },
        missingData: [],
        perRepoStatusList: [
          { repo: 'o/alpha', status: 'done', badge: 'done', isFlagship: false },
          { repo: 'o/bravo', status: 'done', badge: 'done', isFlagship: false },
          { repo: 'o/charlie', status: 'done', badge: 'done', isFlagship: false },
          { repo: 'o/delta', status: 'done', badge: 'done', isFlagship: false },
          { repo: 'o/echo', status: 'queued', badge: 'queued', isFlagship: false },
          { repo: 'o/foxtrot', status: 'queued', badge: 'queued', isFlagship: false },
          { repo: 'o/golf', status: 'queued', badge: 'queued', isFlagship: false },
          { repo: 'o/hotel', status: 'queued', badge: 'queued', isFlagship: false },
          { repo: 'o/india', status: 'queued', badge: 'queued', isFlagship: false },
          { repo: 'o/juliet', status: 'queued', badge: 'queued', isFlagship: false },
        ],
      }
  }
}

const SCENARIOS: { value: Scenario; label: string }[] = [
  { value: 'empty', label: 'Empty (no results yet)' },
  { value: 'in-progress', label: 'In progress (mid-run)' },
  { value: 'with-failure', label: 'With a failed repo' },
  { value: 'paused', label: 'Rate-limit paused' },
  { value: 'complete', label: 'Complete' },
]

export default function OrgSummaryDevPreviewPage() {
  const [scenario, setScenario] = useState<Scenario>('in-progress')
  const view = viewForScenario(scenario)

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="w-full bg-sky-900 text-white dark:bg-slate-900">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-5">
          <div>
            <h1 className="text-xl font-semibold">Org Summary — dev preview</h1>
            <p className="text-sm text-sky-100">
              Canned data. Not wired to the real analysis flow. Use the selector to switch
              scenarios.
            </p>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <div className="mx-auto max-w-5xl space-y-4 px-4 py-6">
        <section
          aria-label="Scenario picker"
          className="flex flex-wrap gap-2 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900"
        >
          {SCENARIOS.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => setScenario(s.value)}
              className={
                scenario === s.value
                  ? 'rounded bg-sky-600 px-3 py-1 text-sm text-white dark:bg-sky-500'
                  : 'rounded border border-slate-300 bg-white px-3 py-1 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
              }
            >
              {s.label}
            </button>
          ))}
        </section>

        <OrgSummaryView
          org={scenario === 'empty' || scenario === 'in-progress' || scenario === 'complete' ? 'konveyor' : 'dev-org'}
          view={view}
          onCancel={() => alert('Cancel is a no-op in the dev preview.')}
          onPause={() => alert('Pause is a no-op in the dev preview.')}
          onResume={() => alert('Resume is a no-op in the dev preview.')}
          onRetry={(repo) => alert(`Retry "${repo}" is a no-op in the dev preview.`)}
        />
      </div>
    </main>
  )
}
