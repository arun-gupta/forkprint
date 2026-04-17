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

  // When inline (showPanels=false), we render everything inside one collapsible card
  if (!showPanels && showRunStatus) {
    return <InlineOrgSummary
      org={org}
      view={view}
      startedAt={startedAt}
      onCancel={onCancel}
      onPause={onPause}
      onResume={onResume}
      onRetry={onRetry}
      notificationToggle={notificationToggle}
      visibleBuckets={visibleBuckets}
    />
  }

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
            className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:bg-slate-900"
          >
            Export JSON
          </button>
          <button
            type="button"
            onClick={() => triggerDownload(buildOrgSummaryMarkdownExport(org, view))}
            className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:bg-slate-900"
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
                  <li key={`${m.repo}:${m.signalKey}`} className="py-2 text-sm text-slate-700 dark:text-slate-300 dark:text-slate-200">
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

/** Inline variant — everything inside one collapsible bordered card */
function InlineOrgSummary({
  org,
  view,
  startedAt,
  onCancel,
  onPause,
  onResume,
  onRetry,
  notificationToggle,
  visibleBuckets,
}: {
  org: string
  view: OrgSummaryViewModel
  startedAt?: Date
  onCancel?: () => void
  onPause?: () => void
  onResume?: () => void
  onRetry?: (repo: string) => void
  notificationToggle?: React.ReactNode
  visibleBuckets: Array<{
    bucket: { id: string; label: string; panels: string[] }
    bucketPanels: Array<{ panelId: string; panel: NonNullable<unknown> }>
  }>
}) {
  const [expanded, setExpanded] = useState(true)

  const statusLabel =
    view.status.status === 'complete'
      ? null
      : view.status.status === 'cancelled'
        ? null
        : view.status.status === 'paused'
          ? `Rate-limited — auto-resumes at ${view.status.pause?.resumesAt.toLocaleTimeString() ?? ''}`
          : null

  const showCancel = view.status.status === 'in-progress' || view.status.status === 'paused'
  const showPause = view.status.status === 'in-progress' && Boolean(onPause)
  const showResume = view.status.status === 'paused' && Boolean(onResume)
  const isTerminal = view.status.status === 'complete' || view.status.status === 'cancelled'

  return (
    <section
      aria-label="Analysis run"
      className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900"
    >
      {/* Header row — always visible */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex items-start gap-2">
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            aria-label={expanded ? 'Collapse analysis run' : 'Expand analysis run'}
            aria-expanded={expanded}
            className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`h-4 w-4 transition-transform ${expanded ? '' : '-rotate-90'}`}
            >
              <path d="M4 6l4 4 4-4" />
            </svg>
          </button>
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Analysis Run ({view.status.succeeded + view.status.failed} of {view.status.total})
              {view.status.status === 'in-progress' ? (
                <span className="ml-2 text-xs font-normal text-sky-600 dark:text-sky-400">In Progress</span>
              ) : null}
            </p>
            {statusLabel ? <p className="text-xs text-slate-500 dark:text-slate-400">{statusLabel}</p> : null}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {showPause && onPause ? (
            <button type="button" onClick={onPause} aria-label="Pause run" title="Pause run"
              className="inline-flex h-8 w-8 items-center justify-center rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:bg-slate-900">
              <svg aria-hidden="true" viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor"><rect x="4" y="3" width="3" height="10" rx="0.5" /><rect x="9" y="3" width="3" height="10" rx="0.5" /></svg>
            </button>
          ) : null}
          {showResume && onResume ? (
            <button type="button" onClick={onResume} aria-label="Resume run" title="Resume run"
              className="inline-flex h-8 w-8 items-center justify-center rounded border border-sky-500 bg-sky-600 text-white hover:bg-sky-700 dark:border-sky-400 dark:bg-sky-500 dark:hover:bg-sky-600">
              <svg aria-hidden="true" viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor"><path d="M4 3v10l9-5-9-5z" /></svg>
            </button>
          ) : null}
          {showCancel && onCancel ? (
            <button type="button" onClick={onCancel} aria-label="Cancel run" title="Cancel run"
              className="inline-flex h-8 w-8 items-center justify-center rounded border border-slate-300 bg-white text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:border-slate-600 dark:bg-slate-800 dark:text-rose-400 dark:hover:bg-slate-700 dark:bg-slate-900">
              <svg aria-hidden="true" viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor"><rect x="3.5" y="3.5" width="9" height="9" rx="1" /></svg>
            </button>
          ) : null}
        </div>
      </div>

      {/* Collapsible body */}
      {expanded ? (
        <div className="space-y-4 border-t border-slate-200 p-4 dark:border-slate-700">
          {/* Stats */}
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <Stat label="Total" value={view.status.total} />
            <Stat label="Succeeded" value={view.status.succeeded} tone="good" />
            <Stat label="Failed" value={view.status.failed} tone={view.status.failed > 0 ? 'bad' : 'neutral'} />
            <Stat label="In progress" value={view.status.inProgress} />
            <Stat label="Queued" value={view.status.queued} />
          </dl>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-4 text-xs text-slate-600 dark:text-slate-400 dark:text-slate-300">
              <span>Elapsed: {formatDuration(view.status.elapsedMs)}</span>
              {view.status.etaMs !== null ? <span>ETA: {formatDuration(view.status.etaMs)}</span> : null}
              <span>Concurrency: {view.status.concurrency.chosen}</span>
            </div>
            <div className="flex items-center gap-3">
              {notificationToggle}
              {isTerminal ? (
                <div className="flex gap-2">
                  <button type="button" onClick={() => triggerDownload(buildOrgSummaryJsonExport(org, view))}
                    className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:bg-slate-900">
                    Export JSON
                  </button>
                  <button type="button" onClick={() => triggerDownload(buildOrgSummaryMarkdownExport(org, view))}
                    className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:bg-slate-900">
                    Export Markdown
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          {/* Progress bar */}
          {startedAt && SHOW_PROGRESS_STATUSES.includes(view.status.status) ? (
            <ProgressIndicator
              succeeded={view.status.succeeded}
              failed={view.status.failed}
              total={view.status.total}
              status={view.status.status}
              startedAt={startedAt}
              etaMs={view.status.etaMs}
            />
          ) : null}

          {/* Rate limit pause */}
          {view.status.pause && view.status.status === 'paused' ? (
            <RateLimitPausePanel
              kind={view.status.pause.kind}
              resumesAt={view.status.pause.resumesAt}
              reposToReDispatch={view.status.queued}
              pausesSoFar={view.status.pause.pausesSoFar}
              onCancel={onCancel}
            />
          ) : null}

          {/* Overview panels */}
          {visibleBuckets.length > 0 ? (
            <div className="space-y-3">
              {visibleBuckets
                .find((b) => b.bucket.id === 'overview')
                ?.bucketPanels.map(({ panelId, panel }) => (
                  <div key={panelId}>{renderPanel(panelId as Parameters<typeof renderPanel>[0], panel as Parameters<typeof renderPanel>[1])}</div>
                ))}
            </div>
          ) : null}

          {/* Per-repo status */}
          <PerRepoStatusList entries={view.perRepoStatusList} onRetry={onRetry} />

          {/* Missing data */}
          {view.missingData.length > 0 ? (
            <section
              aria-label="Missing data"
              className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800"
            >
              <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
                Missing data ({view.missingData.length})
              </h3>
              <ul role="list" className="divide-y divide-slate-200 dark:divide-slate-700">
                {view.missingData.map((m) => (
                  <li key={`${m.repo}:${m.signalKey}`} className="py-2 text-sm text-slate-700 dark:text-slate-300 dark:text-slate-200">
                    <span className="font-medium">{m.repo}</span>{' '}
                    <span className="text-slate-500 dark:text-slate-400">· {m.signalKey}</span>{' '}
                    <span className="text-slate-500 dark:text-slate-400">— {m.reason}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}

function Stat({ label, value, tone = 'neutral' }: { label: string; value: number; tone?: 'neutral' | 'good' | 'bad' }) {
  const toneClass =
    tone === 'good'
      ? 'text-emerald-700 dark:text-emerald-400'
      : tone === 'bad'
        ? 'text-rose-700 dark:text-rose-400'
        : 'text-slate-900 dark:text-slate-100'
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className={`text-xl font-semibold ${toneClass}`}>{value}</dd>
    </div>
  )
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000))
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  const parts = [] as string[]
  if (h) parts.push(`${h}h`)
  if (h || m) parts.push(`${m}m`)
  parts.push(`${s}s`)
  return parts.join(' ')
}
