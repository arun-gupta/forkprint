'use client'

interface TokenInputProps {
  initialValue: string
  error?: string | null
  onChange: (value: string) => void
}

export function TokenInput({ initialValue, error, onChange }: TokenInputProps) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-gray-900" htmlFor="github-token">
        GitHub Personal Access Token
      </label>
      <input
        id="github-token"
        type="password"
        value={initialValue}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded border border-gray-300 p-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <p className="mt-1 text-sm text-gray-600">Required scope: `public_repo` (read-only)</p>
      {error ? (
        <p role="alert" data-testid="token-error" className="mt-1 text-sm text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  )
}
