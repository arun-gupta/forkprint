'use client'

import { useState } from 'react'
import { parseRepos } from '@/lib/parse-repos'

interface RepoInputFormProps {
  onSubmit: (repos: string[]) => void
}

export function RepoInputForm({ onSubmit }: RepoInputFormProps) {
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const result = parseRepos(value)
    if (!result.valid) {
      setError(result.error)
      return
    }
    setError(null)
    onSubmit(result.repos)
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={'facebook/react\ntorvalds/linux\nhttps://github.com/microsoft/typescript'}
        rows={5}
        className="w-full rounded border border-gray-300 p-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label="Repository list"
        aria-describedby={error ? 'repo-input-error' : undefined}
      />
      {error && (
        <p id="repo-input-error" role="alert" className="mt-1 text-sm text-red-600">
          {error}
        </p>
      )}
      <button
        type="submit"
        className="mt-3 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        Analyze
      </button>
    </form>
  )
}
