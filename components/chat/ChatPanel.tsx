'use client'

import React, { useEffect, useRef, useState, useMemo } from 'react'
import { useChat } from 'ai/react'
import type { Message } from 'ai'
import type { AnalysisResult } from '@/lib/analyzer/analysis-result'
import type { OrgInventoryResponse, OrgRepoSummary } from '@/lib/analyzer/org-inventory'
import type { OrgSummaryViewModel } from '@/lib/org-aggregation/types'
import { parseStructuredSearchQuery, matchesStructuredSearch } from '@/lib/org-inventory/structured-search'
import { serializeReposContext, serializeOrgContext, serializeOrgInventoryContext } from './serialize-context'
import { PROVIDERS, type ProviderId } from './providers'

// ---- Types ----------------------------------------------------------------

export interface ChatPanelProps {
  contextType: 'repos' | 'org'
  repoResults?: AnalysisResult[]
  orgView?: OrgSummaryViewModel
  org?: string
  orgRepos?: OrgRepoSummary[]
  orgInventory?: OrgInventoryResponse
  githubToken: string
  resetKey?: number
  repoQuery?: string
  onRepoQueryChange?: (q: string) => void
}

// ---- Constants ------------------------------------------------------------

const FREE_LIMIT = 5

const REPOS_STARTER_CHIPS = [
  'Why is the security score low?',
  "What's the biggest gap between these repos?",
  'Which repo should I fix first?',
  'Which repos are missing a CODE_OF_CONDUCT?',
  "What's the most common issue across these repos?",
  'Which repos have the best documentation?',
]

const ORG_STARTER_CHIPS = [
  'Which repos need the most urgent attention?',
  "What's the overall security posture?",
  'Which repos are best positioned for CNCF Sandbox?',
  'What are the biggest contributors to low health scores?',
  'Which repos need contributors the most?',
  'Compare the top 3 repos by health score',
]

const ORG_INVENTORY_STARTER_CHIPS = [
  "Which repos haven't been active in over a year?",
  'What languages are most common across this org?',
  'Which repos have the most open issues?',
  'Which repos have no license?',
  'Which repos are forks?',
  'Show repos with high stars but no recent activity',
]

const MAX_CONTEXT_REPOS = 300

const COMPLETION_VALUES: Record<string, string[]> = {
  lang:     ['go', 'python', 'typescript', 'javascript', 'java', 'rust', 'c++', 'c', 'ruby', 'kotlin', 'swift', 'scala', 'shell'],
  archived: ['false', 'true'],
  stars:    ['>100', '>500', '>1000', '>5000', '<100', '<50'],
  forks:    ['>10', '>50', '>100', '<10'],
  issues:   ['>10', '>50', '>100', '0', '<10'],
  pushed:   ['>2025-01-01', '>2024-01-01', '>2023-01-01', '<2023-01-01', '<2022-01-01'],
  topic:    ['kubernetes', 'machine-learning', 'security', 'cli', 'api', 'docker', 'ai', 'devops'],
  license:  ['apache-2.0', 'mit', 'gpl-3.0', 'bsd-3-clause', 'mpl-2.0'],
}

const SEARCH_PREFIX_HINTS: { key: string; description: string; example: string }[] = [
  { key: 'lang',     description: 'Programming language',  example: 'lang:go' },
  { key: 'archived', description: 'Archived status',       example: 'archived:false' },
  { key: 'stars',    description: 'Star count',            example: 'stars:>500' },
  { key: 'forks',    description: 'Fork count',            example: 'forks:>10' },
  { key: 'issues',   description: 'Open issues count',     example: 'issues:<50' },
  { key: 'pushed',   description: 'Last push date',        example: 'pushed:>2024-01-01' },
  { key: 'topic',    description: 'Repository topic',      example: 'topic:kubernetes' },
  { key: 'license',  description: 'License type',          example: 'license:apache-2.0' },
]

const LS_KEY_PROVIDER  = 'repopulse:chat:provider'
const SS_KEY_EXPANDED  = 'repopulse:chat:expanded'
const SS_KEY_PROVIDER  = 'repopulse:chat:provider:session'
const SS_KEY_API_KEY   = 'repopulse:chat:apiKey'

// ---- Helpers --------------------------------------------------------------

function computeCompletions(query: string): string[] {
  const lastToken = query.match(/(?:^|\s)(\S*)$/)?.[1] ?? ''
  if (!lastToken) return []
  const colonIdx = lastToken.indexOf(':')
  if (colonIdx !== -1) {
    const key = lastToken.slice(0, colonIdx).toLowerCase()
    const valuePrefix = lastToken.slice(colonIdx + 1)
    const values = COMPLETION_VALUES[key]
    if (!values) return []
    return values.filter((v) => v.startsWith(valuePrefix)).map((v) => `${key}:${v}`)
  }
  return SEARCH_PREFIX_HINTS
    .filter((p) => p.key.startsWith(lastToken.toLowerCase()))
    .map((p) => `${p.key}:`)
}

function applyCompletion(query: string, completion: string): string {
  return query.replace(/(\s*)(\S*)$/, (_, space) => `${space}${completion} `).trimStart()
}

function parseApiError(message: string): { code: string; userMessage: string } | null {
  try {
    const parsed = JSON.parse(message) as { error?: { code?: string; message?: string } }
    if (parsed.error?.code) {
      return { code: parsed.error.code, userMessage: parsed.error.message ?? message }
    }
  } catch {}
  return null
}

function formatCost(usd: number): string {
  if (usd < 0.0001) return '<$0.0001'
  return `$${usd.toFixed(4)}`
}

function formatTokens(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n)
}

function calcCost(promptTokens: number, completionTokens: number, provider: ProviderId): number {
  const spec = PROVIDERS[provider].models['fast']
  return (promptTokens * spec.inputRate + completionTokens * spec.outputRate) / 1_000_000
}

// ---- Markdown renderer ----------------------------------------------------

function renderMarkdown(text: string): React.ReactNode {
  const parts = text.split(/(```[\s\S]*?```)/g)
  return parts.map((part, i) => {
    if (part.startsWith('```')) {
      const inner = part.replace(/^```[^\n]*\n?/, '').replace(/```$/, '')
      return (
        <pre key={i} className="my-2 overflow-x-auto rounded bg-slate-100 p-3 text-xs dark:bg-slate-800">
          <code>{inner}</code>
        </pre>
      )
    }
    return part.split('\n\n').filter(Boolean).map((para, j) => {
      const spans = para.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((seg, k) => {
        if (seg.startsWith('**') && seg.endsWith('**'))
          return <strong key={k}>{seg.slice(2, -2)}</strong>
        if (seg.startsWith('`') && seg.endsWith('`'))
          return <code key={k} className="rounded bg-slate-100 px-1 font-mono text-xs dark:bg-slate-800">{seg.slice(1, -1)}</code>
        return <span key={k}>{seg}</span>
      })
      return <p key={`${i}-${j}`} className="mb-2 last:mb-0">{spans}</p>
    })
  })
}

// ---- Structured search filter with completion -----------------------------

function SearchFilter({ value, onChange }: { value: string; onChange: (q: string) => void }) {
  const [completions, setCompletions] = useState<string[]>([])
  const [activeIdx, setActiveIdx] = useState(-1)
  const blurRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const parsed = parseStructuredSearchQuery(value)

  function open(q: string) { const c = computeCompletions(q); setCompletions(c); setActiveIdx(-1) }
  function close() { setCompletions([]); setActiveIdx(-1) }
  function pick(c: string) { onChange(applyCompletion(value, c)); close() }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (completions.length === 0) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, completions.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, -1)) }
    else if (e.key === 'Enter' && activeIdx >= 0) { e.preventDefault(); pick(completions[activeIdx]) }
    else if (e.key === 'Escape') close()
    else if (e.key === 'Tab' && completions.length > 0) { e.preventDefault(); pick(completions[activeIdx >= 0 ? activeIdx : 0]) }
  }

  return (
    <div className="border-b border-slate-200 px-4 py-2 dark:border-slate-700">
      <div className="relative flex items-center gap-2">
        <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-3.5 w-3.5 shrink-0 text-slate-400">
          <circle cx="6.5" cy="6.5" r="4" /><path strokeLinecap="round" d="M11 11l3 3" />
        </svg>
        <div className="relative flex-1">
          <input
            type="text"
            value={value}
            onChange={(e) => { onChange(e.target.value); open(e.target.value) }}
            onFocus={() => open(value)}
            onBlur={() => { blurRef.current = setTimeout(close, 150) }}
            onKeyDown={handleKeyDown}
            placeholder="Filter repos: lang:go stars:>500 archived:false"
            autoComplete="off"
            spellCheck={false}
            className="w-full rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500"
          />
          {completions.length > 0 && (
            <ul role="listbox" className="absolute bottom-full left-0 z-50 mb-1 w-full overflow-hidden rounded border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
              {completions.map((c, i) => (
                <li key={c} role="option" aria-selected={i === activeIdx}>
                  <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); if (blurRef.current) clearTimeout(blurRef.current); pick(c) }}
                    className={`w-full px-3 py-1.5 text-left font-mono text-xs ${i === activeIdx ? 'bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300' : 'text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'}`}
                  >
                    {c}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {value && (
          <button type="button" onClick={() => onChange('')} aria-label="Clear filter"
            className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">✕</button>
        )}
      </div>
      {parsed.invalidTokens.length > 0 && (
        <p className="mt-1 text-[10px] text-amber-600 dark:text-amber-400">Ignored: {parsed.invalidTokens.join(', ')}</p>
      )}
      <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
        {SEARCH_PREFIX_HINTS.map(({ key, description, example }) => (
          <span key={key} className="group relative cursor-help">
            <span className="text-[10px] text-slate-400 underline decoration-dotted underline-offset-2 dark:text-slate-500">{key}:</span>
            <span className="pointer-events-none invisible absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap rounded bg-slate-800 px-2.5 py-1.5 opacity-0 shadow-lg transition-opacity group-hover:visible group-hover:opacity-100 dark:bg-slate-700">
              <span className="block text-[11px] font-medium text-white">{description}</span>
              <span className="block font-mono text-[10px] text-slate-300">{example}</span>
              <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-slate-800 dark:border-t-slate-700" />
            </span>
          </span>
        ))}
      </div>
    </div>
  )
}

// ---- Key entry form -------------------------------------------------------

const DIRECT_PROVIDERS: ProviderId[] = ['anthropic', 'openai', 'google', 'groq']

function KeyEntryForm({
  onSave,
  onCancel,
  exhausted = false,
  notConfigured = false,
}: {
  onSave: (provider: ProviderId, key: string) => void
  onCancel?: () => void
  exhausted?: boolean
  notConfigured?: boolean
}) {
  const [tab, setTab] = useState<'openrouter' | 'direct'>('openrouter')
  const [directProvider, setDirectProvider] = useState<ProviderId>('anthropic')
  const [keyValue, setKeyValue] = useState('')

  const activeProvider: ProviderId = tab === 'openrouter' ? 'openrouter' : directProvider
  const config = PROVIDERS[activeProvider]

  function handleSave() {
    if (!keyValue.trim()) return
    onSave(activeProvider, keyValue.trim())
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      {onCancel && (
        <button type="button" onClick={onCancel}
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="h-3 w-3"><path strokeLinecap="round" strokeLinejoin="round" d="M10 4L6 8l4 4" /></svg>
          Back to free chat
        </button>
      )}
      {(exhausted || notConfigured) && (
        <div className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
          <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 h-4 w-4 shrink-0">
            <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
          </svg>
          {exhausted
            ? `You've used all ${FREE_LIMIT} free chats. Add an API key for unlimited access.`
            : 'No server API key configured — add your own key to start chatting.'}
        </div>
      )}

      {/* Provider tabs */}
      <div className="flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800">
        <button
          type="button"
          onClick={() => { setTab('openrouter'); setKeyValue('') }}
          className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${tab === 'openrouter' ? 'bg-white shadow-sm text-slate-900 dark:bg-slate-700 dark:text-slate-100' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
        >
          OpenRouter
          <span className="ml-1.5 rounded-full bg-sky-100 px-1.5 py-0.5 text-[9px] font-semibold text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">recommended</span>
        </button>
        <button
          type="button"
          onClick={() => { setTab('direct'); setKeyValue('') }}
          className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${tab === 'direct' ? 'bg-white shadow-sm text-slate-900 dark:bg-slate-700 dark:text-slate-100' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
        >
          Direct provider
        </button>
      </div>

      {/* Direct provider selector */}
      {tab === 'direct' && (
        <div className="flex gap-1">
          {DIRECT_PROVIDERS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => { setDirectProvider(p); setKeyValue('') }}
              className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${directProvider === p ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900' : 'border border-slate-200 text-slate-600 hover:border-slate-400 dark:border-slate-700 dark:text-slate-400 dark:hover:border-slate-500'}`}
            >
              {PROVIDERS[p].name}
            </button>
          ))}
        </div>
      )}

      {/* Tagline */}
      <p className="text-xs text-slate-500 dark:text-slate-400">{config.tagline}</p>

      {/* Key input */}
      <div>
        <input
          type="password"
          value={keyValue}
          onChange={(e) => setKeyValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSave() }}
          placeholder={config.keyPlaceholder}
          autoComplete="off"
          spellCheck={false}
          className="w-full rounded border border-slate-300 bg-slate-50 px-3 py-1.5 font-mono text-xs text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500"
        />
        <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">
          Your key is sent only to {config.name} to generate responses. Never logged or stored on our servers.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <a href={config.consoleUrl} target="_blank" rel="noopener noreferrer"
          className="text-xs text-sky-700 hover:underline dark:text-sky-400">
          Get a key at {config.consoleLabel} →
        </a>
        <div className="flex items-center gap-2">
          {onCancel && (
            <button type="button" onClick={onCancel}
              className="text-xs text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300">
              Cancel
            </button>
          )}
          <button type="button" disabled={!keyValue.trim()} onClick={handleSave}
            className="rounded bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-40 dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-white">
            Save key
          </button>
        </div>
      </div>
    </div>
  )
}

// ---- Main component -------------------------------------------------------

export function ChatPanel({
  contextType, repoResults, orgView, org, orgRepos = [], orgInventory, githubToken, resetKey,
  repoQuery = '', onRepoQueryChange,
}: ChatPanelProps) {
  const [expanded, setExpanded] = useState(false)
  const [provider, setProvider] = useState<ProviderId>('openrouter')
  const [userKey, setUserKey] = useState('')
  const [freeRemaining, setFreeRemaining] = useState<number | null>(null)
  const [needsKey, setNeedsKey] = useState(false)
  const [keyFormOpen, setKeyFormOpen] = useState(false)
  const [serverProvider, setServerProvider] = useState<ProviderId | null>(null)
  const [sessionCost, setSessionCost] = useState(0)
  const [sessionMsgCount, setSessionMsgCount] = useState(0)
  const [contextNotices, setContextNotices] = useState<{ afterIndex: number; label: string }[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Hydrate from storage after mount
  useEffect(() => {
    try {
      const p = sessionStorage.getItem(SS_KEY_PROVIDER) ?? localStorage.getItem(LS_KEY_PROVIDER)
      if (p && p in PROVIDERS) setProvider(p as ProviderId)
      const k = sessionStorage.getItem(SS_KEY_API_KEY) ?? ''
      setUserKey(k)
      setExpanded(sessionStorage.getItem(SS_KEY_EXPANDED) === 'true')
    } catch {}
  }, [])

  // Check server key configuration on mount
  useEffect(() => {
    fetch('/api/chat')
      .then((r) => r.json())
      .then((data: { configured: boolean; provider?: ProviderId }) => {
        if (data.configured) {
          setFreeRemaining(FREE_LIMIT)
          if (data.provider) setServerProvider(data.provider)
        } else {
          setNeedsKey(true)
        }
      })
      .catch(() => {})
  }, [])

  // Insert context notice when filter changes during an active conversation
  const prevRepoQuery = useRef(repoQuery)
  useEffect(() => {
    const prev = prevRepoQuery.current
    prevRepoQuery.current = repoQuery
    if (prev === repoQuery || messages.length === 0) return
    const label = repoQuery.trim()
      ? `Context updated: scoped to filter "${repoQuery.trim()}"`
      : 'Context updated: filter cleared — using full org'
    setContextNotices((n) => [...n, { afterIndex: messages.length, label }])
  }, [repoQuery])

  const filteredInventory = useMemo(() => {
    if (!orgInventory || !repoQuery.trim()) return orgInventory
    const parsed = parseStructuredSearchQuery(repoQuery)
    return { ...orgInventory, results: orgInventory.results.filter((r) => matchesStructuredSearch(r, parsed)) }
  }, [orgInventory, repoQuery])

  const context = useMemo(() => {
    if (contextType === 'repos' && repoResults) return serializeReposContext(repoResults).text
    if (contextType === 'org' && orgView && org) return serializeOrgContext(org, orgView, { maxRepos: MAX_CONTEXT_REPOS, sortBy: 'stars', orgRepos }).text
    if (contextType === 'org' && filteredInventory) return serializeOrgInventoryContext(filteredInventory, { maxRepos: MAX_CONTEXT_REPOS, sortBy: 'stars' }).text
    return ''
  }, [contextType, repoResults, orgView, org, orgRepos, filteredInventory])

  const activeProvider = userKey ? provider : (serverProvider ?? 'anthropic')

  const { messages, input, setInput, handleSubmit, isLoading, stop, setMessages, data, append, error: chatError } = useChat({
    api: '/api/chat',
    body: {
      context,
      contextType,
      githubToken,
      provider: activeProvider,
      model: PROVIDERS[activeProvider].models['fast'].id,
      apiKey: userKey || undefined,
    },
    onFinish: (_message: Message, options: { usage?: { promptTokens: number; completionTokens: number } }) => {
      const usage = options?.usage
      if (usage && Number.isFinite(usage.promptTokens) && Number.isFinite(usage.completionTokens)) {
        const cost = calcCost(usage.promptTokens, usage.completionTokens, activeProvider)
        setSessionCost((prev) => prev + cost)
      }
      setSessionMsgCount((prev) => prev + 1)
    },
    onError: (error: Error) => {
      const parsed = parseApiError(error.message)
      const code = parsed?.code ?? ''
      if (code === 'FREE_LIMIT_REACHED' || error.message.includes('free chats')) {
        setFreeRemaining(0)
      }
      if (code === 'NOT_CONFIGURED') {
        setNeedsKey(true)
      }
    },
  })

  // Sync freeRemaining from stream data
  useEffect(() => {
    if (!data?.length) return
    const last = [...data].reverse().find((d) => typeof (d as { remaining?: number }).remaining === 'number')
    if (last) setFreeRemaining((last as { remaining: number }).remaining)
  }, [data])

  // Scroll to latest message
  useEffect(() => {
    if (expanded) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, expanded])

  // Reset on resetKey change
  useEffect(() => {
    if (resetKey === undefined) return
    setMessages([])
    setInput('')
    setSessionCost(0)
    setSessionMsgCount(0)
    setContextNotices([])
    stop()
    try { sessionStorage.removeItem(SS_KEY_EXPANDED) } catch {}
    setExpanded(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey])

  function handleExpandToggle() {
    const next = !expanded
    setExpanded(next)
    try { sessionStorage.setItem(SS_KEY_EXPANDED, String(next)) } catch {}
  }

  function handleSaveKey(p: ProviderId, key: string) {
    setProvider(p)
    setUserKey(key)
    setNeedsKey(false)
    setKeyFormOpen(false)
    try {
      sessionStorage.setItem(SS_KEY_PROVIDER, p)
      sessionStorage.setItem(SS_KEY_API_KEY, key)
      localStorage.setItem(LS_KEY_PROVIDER, p)
    } catch {}
    setMessages([])
    setSessionCost(0)
    setSessionMsgCount(0)
  }

  function handleClearKey() {
    setUserKey('')
    try {
      sessionStorage.removeItem(SS_KEY_API_KEY)
      sessionStorage.removeItem(SS_KEY_PROVIDER)
    } catch {}
    setMessages([])
    setSessionCost(0)
    setSessionMsgCount(0)
  }


  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as unknown as React.FormEvent)
    }
  }

  const hasKey = !!userKey
  const limitReached = !hasKey && freeRemaining !== null && freeRemaining === 0
  const showKeyForm = limitReached || needsKey || keyFormOpen
  const isInventoryPhase = contextType === 'org' && !orgView && !!orgInventory
  const starterChips = contextType === 'repos' ? REPOS_STARTER_CHIPS : isInventoryPhase ? ORG_INVENTORY_STARTER_CHIPS : ORG_STARTER_CHIPS
  const showChips = messages.length === 0 && !isLoading
  const activeModelSpec = PROVIDERS[activeProvider].models['fast']

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 mx-auto max-w-5xl px-4">
      <div className="rounded-t-2xl border border-b-0 border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">

        {/* Collapsed bar */}
        {!expanded ? (
          <button type="button" onClick={handleExpandToggle}
            className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800">
            <span aria-hidden="true" className="text-base">✨</span>
            <span className="flex-1">
              Ask a question about this analysis
              {repoQuery && (
                <span className="ml-2 rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-medium text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">
                  {repoQuery}
                </span>
              )}
            </span>
            <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 10l4-4 4 4" />
            </svg>
          </button>
        ) : (
          <>
            {/* Panel header */}
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-4 py-2 dark:border-slate-700">
              <span className="mr-1 font-semibold text-slate-900 dark:text-slate-100">Ask AI</span>
              <span className="rounded border border-slate-200 px-2 py-0.5 text-[10px] text-slate-500 dark:border-slate-700 dark:text-slate-400">
                {PROVIDERS[activeProvider].name}
              </span>



              {/* Session cost — only shown when user has their own key */}
              {hasKey && sessionMsgCount > 0 && (
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  {sessionMsgCount} {sessionMsgCount === 1 ? 'msg' : 'msgs'}{sessionCost > 0 ? ` · ${formatCost(sessionCost)}` : ''}
                </span>
              )}


              <div className="ml-auto flex items-center gap-2">
                <button type="button"
                  onClick={() => { if (hasKey) handleClearKey(); else setKeyFormOpen((v) => !v) }}
                  className="text-xs text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300">
                  {hasKey ? 'Change key' : keyFormOpen ? 'Cancel' : 'Add key'}
                </button>
                {messages.length > 0 && (
                  <button type="button" onClick={() => { setMessages([]); setSessionCost(0); setSessionMsgCount(0); setContextNotices([]); stop() }}
                    className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
                    New conversation
                  </button>
                )}
                <button type="button" onClick={handleExpandToggle} aria-label="Collapse chat"
                  className="inline-flex h-6 w-6 items-center justify-center rounded text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200">
                  <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6l4 4 4-4" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Structured search filter */}
            {contextType === 'org' && onRepoQueryChange && (
              <SearchFilter value={repoQuery} onChange={onRepoQueryChange} />
            )}

            {/* Chat section label */}
            <div className="flex items-center gap-2 px-4 pt-2 pb-0">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">Chat with AI</span>
              {repoQuery.trim() && filteredInventory && (
                <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-medium text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">
                  scoped to {filteredInventory.results.length} filtered repos
                </span>
              )}
              {/* Show dots here only when the flow guide isn't visible */}
              {!hasKey && !(isInventoryPhase && showChips) && (
                <div className={`relative flex items-center gap-1 ${freeRemaining === null ? 'group/free cursor-help' : ''}`}>
                  {Array.from({ length: FREE_LIMIT }, (_, i) => (
                    <span key={i} className={`inline-block h-1.5 w-1.5 rounded-full transition-colors ${freeRemaining === null ? 'bg-slate-200 dark:bg-slate-700' : i < freeRemaining ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
                  ))}
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">
                    {freeRemaining === null ? `${FREE_LIMIT} free` : freeRemaining > 0 ? `${freeRemaining} free` : 'limit reached'}
                  </span>
                  {freeRemaining === null && (
                    <span className="pointer-events-none invisible absolute bottom-full left-0 z-50 mb-2 w-52 rounded bg-slate-800 px-2.5 py-2 opacity-0 shadow-lg transition-opacity group-hover/free:visible group-hover/free:opacity-100 dark:bg-slate-700">
                      <span className="block text-[11px] leading-snug text-white">Free quota requires a server API key (<code className="rounded bg-slate-700 px-1 font-mono text-[10px]">ANTHROPIC_API_KEY</code>, <code className="rounded bg-slate-700 px-1 font-mono text-[10px]">OPENAI_API_KEY</code>, etc.). Add your own key below to chat without limits.</span>
                      <span className="absolute left-3 top-full border-4 border-transparent border-t-slate-800 dark:border-t-slate-700" />
                    </span>
                  )}
                </div>
              )}
              <div className="flex-1 border-t border-slate-200 dark:border-slate-700" />
            </div>

            {/* Key entry or chat */}
            {showKeyForm ? (
              <KeyEntryForm onSave={handleSaveKey} exhausted={limitReached} notConfigured={needsKey && !limitReached}
                onCancel={keyFormOpen && !limitReached && !needsKey ? () => setKeyFormOpen(false) : undefined} />
            ) : (
              <>
                {/* Message history */}
                <div className="flex h-[40vh] flex-col overflow-y-auto px-4 py-3 space-y-3" aria-live="polite" aria-label="Chat messages">
                  {showChips && isInventoryPhase ? (
                    <div className="flex flex-col gap-3 py-2">
                      {/* Step 1 */}
                      <div className="flex gap-3">
                        {repoQuery.trim() ? (
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-500 text-white">
                            <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" className="h-3 w-3"><path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" /></svg>
                          </span>
                        ) : (
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-600 text-[10px] font-bold text-white">1</span>
                        )}
                        <div className="flex flex-col gap-1.5">
                          <p className={`text-xs font-medium ${repoQuery.trim() ? 'text-slate-400 dark:text-slate-500' : 'text-slate-700 dark:text-slate-200'}`}>
                            Filter repos above to narrow your scope
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {['lang:go', 'archived:false', 'stars:>500', 'pushed:>2024-01-01'].map((f) => (
                              <button key={f} type="button"
                                onClick={() => {
                                  const tokens = repoQuery.trim().split(/\s+/).filter(Boolean)
                                  const next = tokens.includes(f)
                                    ? tokens.filter((t) => t !== f).join(' ')
                                    : [...tokens, f].join(' ')
                                  onRepoQueryChange?.(next)
                                }}
                                className={`rounded border px-2 py-0.5 font-mono text-[11px] transition-colors ${repoQuery.split(/\s+/).includes(f) ? 'border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-700 dark:bg-sky-900/20 dark:text-sky-300' : 'border-slate-200 bg-slate-50 text-slate-500 hover:bg-sky-50 hover:border-sky-300 hover:text-sky-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500 dark:hover:bg-sky-900/20 dark:hover:text-sky-300'}`}>
                                {f}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                      {/* Connector */}
                      <div className="ml-2.5 h-4 w-px bg-slate-200 dark:bg-slate-700" />
                      {/* Step 2 */}
                      <div className="flex gap-3">
                        <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${repoQuery.trim() ? 'bg-sky-600 text-white' : 'border border-slate-300 text-slate-400 dark:border-slate-600 dark:text-slate-500'}`}>2</span>
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2">
                            <p className={`text-xs ${repoQuery.trim() ? 'font-medium text-slate-700 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500'}`}>
                              Ask AI about the filtered repos
                            </p>
                            {!hasKey && (
                              <div className={`relative flex items-center gap-1 ${freeRemaining === null ? 'group/free cursor-help' : ''}`}>
                                {Array.from({ length: FREE_LIMIT }, (_, i) => (
                                  <span key={i} className={`inline-block h-1.5 w-1.5 rounded-full transition-colors ${freeRemaining === null ? 'bg-slate-200 dark:bg-slate-700' : i < freeRemaining ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
                                ))}
                                <span className="text-[10px] text-slate-400 dark:text-slate-500">
                                  {freeRemaining === null ? `${FREE_LIMIT} free` : freeRemaining > 0 ? `${freeRemaining} free` : 'limit reached'}
                                </span>
                                {freeRemaining === null && (
                                  <span className="pointer-events-none invisible absolute bottom-full left-0 z-50 mb-2 w-52 rounded bg-slate-800 px-2.5 py-2 opacity-0 shadow-lg transition-opacity group-hover/free:visible group-hover/free:opacity-100 dark:bg-slate-700">
                                    <span className="block text-[11px] leading-snug text-white">Free quota requires a server API key (<code className="rounded bg-slate-700 px-1 font-mono text-[10px]">ANTHROPIC_API_KEY</code>, <code className="rounded bg-slate-700 px-1 font-mono text-[10px]">OPENAI_API_KEY</code>, etc.). Add your own key below to chat without limits.</span>
                                    <span className="absolute left-3 top-full border-4 border-transparent border-t-slate-800 dark:border-t-slate-700" />
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {ORG_INVENTORY_STARTER_CHIPS.map((chip) => (
                              <button key={chip} type="button"
                                disabled={!repoQuery.trim()}
                                onClick={() => void append({ role: 'user', content: chip })}
                                className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${repoQuery.trim() ? 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700' : 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-600'}`}>
                                {chip}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {messages.map((msg, idx) => (
                    <React.Fragment key={msg.id}>
                      {contextNotices.filter((n) => n.afterIndex === idx).map((n, ni) => (
                        <div key={`notice-${idx}-${ni}`} className="flex items-center gap-2 py-1">
                          <div className="flex-1 border-t border-dashed border-slate-200 dark:border-slate-700" />
                          <span className="text-[10px] text-slate-400 dark:text-slate-500">{n.label}</span>
                          <div className="flex-1 border-t border-dashed border-slate-200 dark:border-slate-700" />
                        </div>
                      ))}
                      {msg.role === 'user' ? (
                        <div className="flex justify-end">
                          <div className="max-w-[80%] rounded-2xl bg-sky-600 px-4 py-2 text-sm text-white">{msg.content}</div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-start gap-1">
                          <div className="max-w-[85%] rounded-2xl bg-slate-100 px-4 py-2 text-sm text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                            {msg.content ? (
                              <div className="prose prose-sm max-w-none dark:prose-invert">{renderMarkdown(msg.content)}</div>
                            ) : (
                              <span className="animate-pulse text-slate-400">●</span>
                            )}
                          </div>
                        </div>
                      )}
                    </React.Fragment>
                  ))}
                  {/* Notices added after all current messages */}
                  {contextNotices.filter((n) => n.afterIndex >= messages.length).map((n, ni) => (
                    <div key={`notice-end-${ni}`} className="flex items-center gap-2 py-1">
                      <div className="flex-1 border-t border-dashed border-slate-200 dark:border-slate-700" />
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">{n.label}</span>
                      <div className="flex-1 border-t border-dashed border-slate-200 dark:border-slate-700" />
                    </div>
                  ))}

                  {/* Persistent suggestion chips — always visible, not just before first message */}
                  {!isLoading && !(isInventoryPhase && showChips) && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {starterChips.map((chip) => (
                        <button key={chip} type="button"
                          onClick={() => void append({ role: 'user', content: chip })}
                          className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700">
                          {chip}
                        </button>
                      ))}
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Error banner — only for errors that aren't handled by showing the key form */}
                {chatError && (() => {
                  const parsed = parseApiError(chatError.message)
                  if (parsed?.code === 'NOT_CONFIGURED' || parsed?.code === 'FREE_LIMIT_REACHED') return null
                  const displayMsg = parsed?.userMessage ?? chatError.message ?? 'Something went wrong — please try again.'
                  return (
                    <div className="mx-4 mb-2 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-700/50 dark:bg-amber-900/20 dark:text-amber-200">
                      <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 h-4 w-4 shrink-0">
                        <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
                      </svg>
                      <span>{displayMsg}</span>
                    </div>
                  )
                })()}

                {/* Input */}
                <form onSubmit={handleSubmit} className="border-t border-slate-200 px-4 py-3 dark:border-slate-700">
                  <div className="flex items-end gap-2">
                    <textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Ask a question…"
                      rows={1}
                      disabled={isLoading}
                      className="flex-1 resize-none rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500"
                      style={{ minHeight: '38px', maxHeight: '120px' }}
                    />
                    {isLoading ? (
                      <button type="button" onClick={stop}
                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-200 text-slate-600 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-300">
                        <svg aria-label="Stop" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                          <rect x="4" y="4" width="12" height="12" rx="1" />
                        </svg>
                      </button>
                    ) : (
                      <button type="submit" disabled={!input.trim()} aria-label="Send message"
                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-40 dark:bg-sky-500 dark:hover:bg-sky-400">
                        <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                          <path d="M3.105 2.288a.75.75 0 0 0-.826.95l1.414 4.925A1.5 1.5 0 0 0 5.135 9.25h6.115a.75.75 0 0 1 0 1.5H5.135a1.5 1.5 0 0 0-1.442 1.087L2.28 16.762a.75.75 0 0 0 .826.95 28.897 28.897 0 0 0 15.208-7.787.75.75 0 0 0 0-1.049A28.897 28.897 0 0 0 3.105 2.288Z" />
                        </svg>
                      </button>
                    )}
                  </div>
                </form>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
