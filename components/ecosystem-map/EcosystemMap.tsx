'use client'

import 'chart.js/auto'
import { Bubble } from 'react-chartjs-2'
import type { AnalysisResult } from '@/lib/analyzer/analysis-result'
import { buildBubbleChartPoints, buildEcosystemRows } from '@/lib/ecosystem-map/chart-data'

interface EcosystemMapProps {
  results: AnalysisResult[]
}

export function EcosystemMap({ results }: EcosystemMapProps) {
  const rows = buildEcosystemRows(results)
  const bubblePoints = buildBubbleChartPoints(results)

  if (rows.length === 0) {
    return null
  }

  return (
    <section aria-label="Ecosystem map" className="rounded border border-gray-200 bg-gray-50 p-4">
      <h2 className="font-semibold text-gray-900">Ecosystem map</h2>
      {bubblePoints.length > 0 ? (
        <section className="mt-3 rounded border border-sky-200 bg-white p-3">
          <div role="img" aria-label="Ecosystem bubble chart" className="rounded border border-sky-100 bg-sky-50 p-3">
            <div className="h-72">
              <Bubble data={buildChartData(bubblePoints)} options={bubbleChartOptions} />
            </div>
            <div className="mt-3 text-sm text-sky-900">
              <p>Stars (X-axis)</p>
              <p>Forks (Y-axis)</p>
              <p>Watchers (bubble size)</p>
            </div>
          </div>
        </section>
      ) : null}
      <div className="mt-3 space-y-3">
        {rows.map((row) => (
          <article key={row.repo} className="rounded border border-gray-200 bg-white p-3">
            <h3 className="font-medium text-gray-900">{row.repo}</h3>
            <div className="mt-2 grid gap-1 text-sm text-gray-700">
              <p>Stars: {row.starsLabel}</p>
              <p>Forks: {row.forksLabel}</p>
              <p>Watchers: {row.watchersLabel}</p>
            </div>
            {row.plotStatusNote ? <p className="mt-2 text-sm text-amber-700">{row.plotStatusNote}</p> : null}
          </article>
        ))}
      </div>
    </section>
  )
}

const bubbleChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  animation: false,
  plugins: {
    legend: {
      display: false,
    },
    tooltip: {
      enabled: false,
    },
  },
  scales: {
    x: {
      title: {
        display: true,
        text: 'Stars',
      },
    },
    y: {
      title: {
        display: true,
        text: 'Forks',
      },
    },
  },
}

function buildChartData(points: Array<{ repo: string; x: number; y: number; r: number }>) {
  return {
    datasets: [
      {
        label: 'Repositories',
        data: points,
        parsing: false,
        backgroundColor: 'rgba(14, 116, 144, 0.35)',
        borderColor: 'rgba(14, 116, 144, 0.9)',
        borderWidth: 1.5,
      },
    ],
  }
}
