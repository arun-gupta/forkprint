import { RepoInputClient } from '@/components/repo-input/RepoInputClient'

export default function Home() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="mb-2 text-3xl font-bold tracking-tight">ForkPrint</h1>
      <p className="mb-8 text-gray-600">
        CHAOSS-aligned GitHub repository health analyzer. Enter one or more repositories to analyze.
      </p>
      <RepoInputClient />
    </main>
  )
}
