import Image from 'next/image'
import Link from 'next/link'
import { BaselineView } from '@/components/baseline/BaselineView'
import { BackToAnalyzerLink } from '@/components/baseline/BackToAnalyzerLink'
import { ThemeToggle } from '@/components/theme/ThemeToggle'

export const metadata = {
  title: 'Scoring Methodology — RepoPulse',
  description: 'How RepoPulse computes the OSS Health Score — calibration thresholds and percentile distributions.',
}

export default function BaselinePage() {
  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="w-full bg-sky-900 text-white dark:bg-slate-900">
        <div className="mx-auto flex max-w-5xl items-start justify-between gap-4 px-4 py-5">
          <div>
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <Image
                src="/repo-pulse-banner.png"
                alt=""
                width={32}
                height={32}
                className="h-8 w-8 rounded object-cover"
                aria-hidden="true"
              />
              <h1 className="text-2xl font-semibold tracking-tight text-white">RepoPulse</h1>
            </Link>
            <p className="mt-1 text-sm text-sky-100 md:text-base">Scoring Methodology</p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <BackToAnalyzerLink />
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-4 py-6">
        <BaselineView />
      </div>
    </main>
  )
}
