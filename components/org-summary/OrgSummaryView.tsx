'use client'

import { useState } from 'react'
import type {
  OrgSummaryViewModel,
  RunStatus,
} from '@/lib/org-aggregation/types'
import { triggerDownload } from '@/lib/export/json-export'
import { buildOrgSummaryJsonExport } from '@/lib/export/org-summary-json-export'
import { buildOrgSummaryMarkdownExport } from '@/lib/export/org-summary-markdown-export'
import { PANEL_BUCKETS, isRealPanel, renderPanel, type PanelBucketId } from './panels/registry'
import { PerRepoStatusList } from './PerRepoStatusList'
import { ProgressIndicator } from './ProgressIndicator'
import { RateLimitPausePanel } from './RateLimitPausePanel'
import { RunStatusHeader } from './RunStatusHeader'

interface Props {
  org: string
  view: OrgSummaryViewModel
  startedAt?: Date
  onCancel?: () => void
  onPause?: () => void
  onResume?: () => void
  onRetry?: (repo: string) => void
  notificationToggle?: React.ReactNode
  showRunStatus?: boolean
  showPanels?: boolean
}

const SHOW_PROGRESS_STATUSES: RunStatus[] = ['in-progress', 'paused', 'complete', 'cancelled']

export function OrgSummaryView({ org, view, startedAt, onCancel, onPause, onResume, onRetry, notificationToggle, showRunStatus = true, showPanels = true }: Props) {
  const visibleBuckets = PANEL_BUCKETS
    .filter((b) => b.id !== 'repos' && b.id !== 'recommendations')
    .map((bucket) => ({
      bucket,
      bucketPanels: bucket.panels
        .map((panelId) => ({ panelId, panel: view.panels[panelId] }))
        .filter((x): x is { panelId: typeof x.panelId; panel: NonNullable<typeof x.panel> } =>
          Boolean(x.panel) && (showRunStatus || isRealPanel(x.panelId))
        ),
    }))
    .filter((b) => b.bucketPanels.length > 0)

  const [activeTab, setActiveTab] = useState<PanelBucketId>(
    visibleBuckets[0]?.bucket.id ?? 'overview',
  )
  const active = visibleBuckets.find((b) => b.bucket.id === activeTab) ?? visibleBuckets[0]

  return (
    <div className="space-y-4">
      {showRunStatus ? (
        <RunStatusHeader
          org={org}
          header={view.status}
          onCancel={onCancel}
          onPause={onPause}
          onResume={onResume}
          notificationToggle={notificationToggle}
          hideHeading={!showPanels}
        />
      ) : null}

      {showRunStatus && startedAt && SHOW_PROGRESS_STATUSES.includes(view.status.status) ? (
        <ProgressIndicator
          succeeded={view.status.succeeded}
          failed={view.status.failed}
          total={view.status.total}
          status={view.status.status}
          startedAt={startedAt}
          etaMs={view.status.etaMs}
        />
      ) : null}

      {showRunStatus && (view.status.status === 'complete' || view.status.status === 'cancelled') ? (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => triggerDownload(buildOrgSummaryJsonExport(org, view))}
            className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            Export JSON
          </button>
          <button
            type="button"
            onClick={() => triggerDownload(buildOrgSummaryMarkdownExport(org, view))}
            className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            Export Markdown
          </button>
        </div>
      ) : null}

      {showRunStatus && view.status.pause && view.status.status === 'paused' ? (
        <RateLimitPausePanel
          kind={view.status.pause.kind}
          resumesAt={view.status.pause.resumesAt}
          reposToReDispatch={view.status.queued}
          pausesSoFar={view.status.pause.pausesSoFar}
          onCancel={onCancel}
        />
      ) : null}

      {!showPanels && visibleBuckets.length > 0 ? (
        <div className="space-y-3">
          {visibleBuckets
            .find((b) => b.bucket.id === 'overview')
            ?.bucketPanels.map(({ panelId, panel }) => (
              <div key={panelId}>{renderPanel(panelId, panel)}</div>
            ))}
        </div>
      ) : null}

      {showPanels && visibleBuckets.length > 0 ? (
        <>
          <div
            role="tablist"
            aria-label="Org summary sections"
            className="flex flex-wrap items-center gap-1.5"
          >
            {visibleBuckets.map(({ bucket }) => {
              const isActive = bucket.id === active?.bucket.id
              return (
                <button
                  key={bucket.id}
                  role="tab"
                  type="button"
                  aria-selected={isActive}
                  onClick={() => setActiveTab(bucket.id)}
                  className={
                    isActive
                      ? 'whitespace-nowrap rounded-full bg-slate-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-slate-100 dark:text-slate-900'
                      : 'whitespace-nowrap rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
                  }
                >
                  {bucket.label}
                </button>
              )
            })}
          </div>

          {active ? (
            <section
              role="tabpanel"
              aria-label={active.bucket.label}
              className="space-y-3"
            >
              {active.bucketPanels.map(({ panelId, panel }) => (
                <div key={panelId}>{renderPanel(panelId, panel)}</div>
              ))}
            </section>
          ) : null}
        </>
      ) : null}

      {showRunStatus ? (
        <>
          <PerRepoStatusList entries={view.perRepoStatusList} onRetry={onRetry} />
          {view.missingData.length > 0 ? (
            <section
              aria-label="Missing data"
              className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"
            >
              <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
                Missing data ({view.missingData.length})
              </h3>
              <ul role="list" className="divide-y divide-slate-200 dark:divide-slate-700">
                {view.missingData.map((m) => (
                  <li key={`${m.repo}:${m.signalKey}`} className="py-2 text-sm text-slate-700 dark:text-slate-300">
                    <span className="font-medium">{m.repo}</span>{' '}
                    <span className="text-slate-500 dark:text-slate-400">· {m.signalKey}</span>{' '}
                    <span className="text-slate-500 dark:text-slate-400">— {m.reason}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

        </>
      ) : null}
    </div>
  )
}
