import { BaselineView } from '@/components/baseline/BaselineView'
import { BackToAnalyzerLink } from '@/components/baseline/BackToAnalyzerLink'

export const metadata = {
  title: 'Scoring Methodology — RepoPulse',
  description: 'How RepoPulse computes the OSS Health Score — calibration thresholds and percentile distributions.',
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
            <p className="mt-1 text-sm text-sky-100 md:text-base">Scoring Methodology</p>
          </div>
          <BackToAnalyzerLink />
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-4 py-6">
        <BaselineView />
      </div>
    </main>
  )
}
