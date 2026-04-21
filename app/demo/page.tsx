import Image from 'next/image'
import Link from 'next/link'
import fixture from '@/fixtures/demo/repositories.json'
import orgFixture from '@/fixtures/demo/org-ossf.json'
import { DemoBanner } from '@/components/demo/DemoBanner'

export const metadata = {
  title: 'RepoPulse — Demo',
  description: 'Explore RepoPulse with pre-analyzed public repositories. No sign-in required.',
}

export default function DemoLanding() {
  const generatedAt = (fixture as { generatedAt?: string }).generatedAt
    ?? (orgFixture as { generatedAt?: string }).generatedAt
    ?? new Date().toISOString()

  return (
    <>
      <DemoBanner generatedAt={generatedAt} />
      <main className="min-h-screen bg-slate-50 px-4 py-10 dark:bg-slate-950 sm:py-16">
        <div className="mx-auto max-w-4xl space-y-8">
          <header className="text-center">
            <Image
              src="/repo-pulse-banner.png"
              alt="RepoPulse"
              width={480}
              height={320}
              className="mx-auto h-16 w-auto rounded-xl shadow-lg sm:h-20"
            />
            <h1 className="mt-4 text-2xl font-semibold text-slate-900 sm:text-3xl dark:text-slate-100">See RepoPulse in action</h1>
            <p className="mx-auto mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300 sm:text-base">
              Explore real, pre-analyzed data from six open-source repositories and one
              organization. No sign-in required. All interactive elements work against
              the fixture data — the only thing disabled is running a fresh analysis.
            </p>
          </header>

          <div className="grid gap-4 sm:grid-cols-2">
            <Link
              href="/demo/repositories"
              className="group block rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-400 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:hover:border-sky-500"
            >
              <div className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-lg text-sky-700 dark:bg-sky-900/40 dark:text-sky-200"
                >
                  📦
                </span>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 group-hover:text-sky-700 dark:group-hover:text-sky-300">
                  Repositories
                </h2>
              </div>
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                Six repositories spanning the readiness spectrum — from a small solo
                project to CNCF Graduated workhorses. See the full results shell with
                scorecards, metric cards, side-by-side comparison, and tailored
                recommendations.
              </p>
              <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                simonw/llm-echo · 333fred/compiler-developer-sdk · ossf/security-insights-spec · fluxcd/helm-controller · projectcalico/calico · prometheus/prometheus
              </p>
            </Link>

            <Link
              href="/demo/organization"
              className="group block rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-400 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:hover:border-sky-500"
            >
              <div className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-lg text-sky-700 dark:bg-sky-900/40 dark:text-sky-200"
                >
                  🏢
                </span>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 group-hover:text-sky-700 dark:group-hover:text-sky-300">
                  Organization
                </h2>
              </div>
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                Browse the full public repository inventory for the OpenSSF
                organization — 78 repositories across multiple languages, with
                filters, sorting, and the same controls available in the live
                product.
              </p>
              <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                ossf — 78 repositories
              </p>
            </Link>
          </div>

          <p className="text-center text-xs text-slate-500 dark:text-slate-400">
            Data refreshes weekly. When you&apos;re ready to analyze your own projects,{' '}
            <Link href="/" className="font-medium text-sky-700 hover:text-sky-800 dark:text-sky-300 dark:hover:text-sky-200">
              sign in with GitHub →
            </Link>
          </p>
        </div>
      </main>
    </>
  )
}
