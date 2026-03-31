'use client'

import { RepoInputForm } from './RepoInputForm'

export function RepoInputClient() {
  function handleSubmit(repos: string[]) {
    // P1-F04 will replace this with real data fetching
    console.log('repos to analyze:', repos)
  }

  return <RepoInputForm onSubmit={handleSubmit} />
}
