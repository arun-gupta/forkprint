import { BaselineView } from '@/components/baseline/BaselineView'

export const metadata = {
  title: 'Scoring Baseline — RepoPulse',
  description: 'Calibration thresholds and percentile distributions used for RepoPulse scoring.',
}

export default function BaselinePage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <header className="w-full bg-sky-900 text-white">
        <div className="mx-auto flex max-w-5xl items-start justify-between gap-4 px-4 py-5">
          <div>
            <a href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <img src="/repo-pulse-banner.png" alt="" className="h-8 w-8 rounded object-cover" aria-hidden="true" />
              <h1 className="text-2xl font-semibold tracking-tight text-white">RepoPulse</h1>
            </a>
            <p className="mt-1 text-sm text-sky-100 md:text-base">Scoring Baseline</p>
          </div>
          <a
            href="/"
            className="rounded-full border border-sky-700 bg-sky-950/25 px-4 py-2 text-sm font-medium text-sky-50 transition hover:border-sky-400 hover:bg-sky-950/40 hover:text-white"
          >
            Back to analyzer
          </a>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-4 py-6">
        <BaselineView />
      </div>
    </main>
  )
}
