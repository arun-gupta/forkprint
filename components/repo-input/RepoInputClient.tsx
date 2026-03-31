'use client'

import { useState } from 'react'
import { TokenInput } from '@/components/token-input/TokenInput'
import { readToken, writeToken } from '@/lib/token-storage'
import { RepoInputForm } from './RepoInputForm'

interface RepoInputClientProps {
  hasServerToken: boolean
  onAnalyze?: (repos: string[], token: string | null) => void
}

export function RepoInputClient({ hasServerToken, onAnalyze }: RepoInputClientProps) {
  const [token, setToken] = useState(() => (hasServerToken ? '' : readToken() ?? ''))
  const [tokenError, setTokenError] = useState<string | null>(null)

  function handleSubmit(repos: string[]) {
    const trimmedToken = token.trim()

    if (!hasServerToken && !trimmedToken) {
      writeToken(token)
      setTokenError('A GitHub Personal Access Token is required to continue.')
      return
    }

    setTokenError(null)

    if (!hasServerToken) {
      writeToken(token)
    }

    onAnalyze?.(repos, hasServerToken ? null : trimmedToken)
  }

  return (
    <div className="space-y-6">
      {!hasServerToken ? (
        <TokenInput
          initialValue={token}
          error={tokenError}
          onChange={(value) => {
            setToken(value)
            setTokenError(null)
          }}
        />
      ) : null}
      <RepoInputForm onSubmit={handleSubmit} />
    </div>
  )
}
