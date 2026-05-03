'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import type { AnalysisResult } from '@/lib/analyzer/analysis-result'
import type { OrgInventoryResponse, OrgRepoSummary } from '@/lib/analyzer/org-inventory'
import type { OrgSummaryViewModel } from '@/lib/org-aggregation/types'
import { parseStructuredSearchQuery } from '@/lib/org-inventory/structured-search'
import { serializeReposContext, serializeOrgContext, serializeOrgInventoryContext, type OrgSortBy } from './serialize-context'

// ---- Types ----------------------------------------------------------------

type Model = 'claude-haiku-4-5' | 'claude-sonnet-4-6'

interface MessageUsage {
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'error'
  content: string
  usage?: MessageUsage
  retryContent?: string
}

export interface ChatPanelProps {
  contextType: 'repos' | 'org'
  repoResults?: AnalysisResult[]
  orgView?: OrgSummaryViewModel
  org?: string
  orgRepos?: OrgRepoSummary[]
  orgInventory?: OrgInventoryResponse
  githubToken: string
  resetKey?: number
  /** Controlled repo filter query — synced with the org inventory table */
  repoQuery?: string
  onRepoQueryChange?: (q: string) => void
}

// ---- Constants ------------------------------------------------------------

const REPOS_STARTER_CHIPS = [
  'Why is the security score low?',
  "What's the biggest gap between these repos?",
  'Which repo should I fix first?',
  'What do these repos have in common?',
]

const ORG_STARTER_CHIPS = [
  'Which repos need the most urgent attention?',
  "What's the overall security posture?",
  'Which repos are best positioned for CNCF Sandbox?',
  'Are there repos with low activity but high star counts?',
]

const ORG_INVENTORY_STARTER_CHIPS = [
  "Which repos haven't been active in over a year?",
  'What languages are most common across this org?',
  'Which repos have the most open issues?',
  'Are there any archived or forked repos?',
]

const MODEL_META: Record<Model, { icon: string; label: string; hint: string; inputRate: number; outputRate: number; cacheReadRate: number }> = {
  'claude-haiku-4-5': {
    icon: '⚡', label: 'Fast',
    hint: 'Best for quick lookups and factual questions about the data',
    inputRate: 0.80, outputRate: 4.00, cacheReadRate: 0.08,
  },
  'claude-sonnet-4-6': {
    icon: '🧠', label: 'Deep',
    hint: 'Better for multi-hop reasoning, comparisons, and nuanced recommendations',
    inputRate: 3.00, outputRate: 15.00, cacheReadRate: 0.30,
  },
}

const SORT_OPTIONS: { value: OrgSortBy; label: string }[] = [
  { value: 'stars', label: '⭐ Top by stars' },
  { value: 'health', label: '🔴 Lowest health first' },
  { value: 'activity', label: '⚡ Most recently active' },
]

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

const SS_KEY_ANTHROPIC = 'repopulse:chat:anthropicKey'
const LS_KEY_MODEL = 'repopulse:chat:model'
const SS_KEY_EXPANDED = 'repopulse:chat:expanded'

// ---- Helpers --------------------------------------------------------------

function uid(): string {
  return Math.random().toString(36).slice(2)
}

function readStoredModel(): Model {
  try {
    const v = localStorage.getItem(LS_KEY_MODEL)
    if (v === 'claude-haiku-4-5' || v === 'claude-sonnet-4-6') return v
  } catch {}
  return 'claude-haiku-4-5'
}

function readStoredExpanded(): boolean {
  try { return sessionStorage.getItem(SS_KEY_EXPANDED) === 'true' } catch {}
  return false
}

function readStoredKey(): string {
  try { return sessionStorage.getItem(SS_KEY_ANTHROPIC) ?? '' } catch {}
  return ''
}

function calcCost(usage: MessageUsage, model: Model): number {
  const { inputRate, outputRate, cacheReadRate } = MODEL_META[model]
  return (
    (usage.inputTokens * inputRate +
      usage.outputTokens * outputRate +
      usage.cacheReadTokens * cacheReadRate) /
    1_000_000
  )
}

function formatCost(usd: number): string {
  if (usd < 0.0001) return '<$0.0001'
  return `$${usd.toFixed(4)}`
}

function formatTokens(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n)
}

// ---- Markdown renderer (paragraphs, bold, inline code, fenced code) -------

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

// ---- Key entry form -------------------------------------------------------

function KeyEntryForm({ onSave }: { onSave: (key: string) => void }) {
  const [value, setValue] = useState('')
  return (
    <div className="flex flex-col gap-3 p-4">
      <div>
        <label htmlFor="chat-anthropic-key" className="block text-sm font-medium text-slate-800 dark:text-slate-200">
          Anthropic API key
        </label>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
          Your key is sent only to Anthropic to generate responses. It is never logged, stored on our
          servers, or used for anything other than this chat session.
        </p>
      </div>
      <input
        id="chat-anthropic-key"
        type="password"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="sk-ant-…"
        autoComplete="off"
        spellCheck={false}
        className="w-full rounded border border-slate-300 bg-slate-50 px-3 py-1.5 font-mono text-xs text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500"
      />
      <div className="flex items-center justify-between gap-3">
        <a
          href="https://console.anthropic.com/settings/keys"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-sky-700 hover:underline dark:text-sky-400"
        >
          Get a free key at console.anthropic.com →
        </a>
        <button
          type="button"
          disabled={!value.trim()}
          onClick={() => onSave(value.trim())}
          className="rounded bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-40 dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-white"
        >
          Save key
        </button>
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
  const [model, setModel] = useState<Model>('claude-haiku-4-5')
  const [anthropicKey, setAnthropicKey] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [orgRepoCount, setOrgRepoCount] = useState(500)
  const [sortBy, setSortBy] = useState<OrgSortBy>('stars')
  const [sessionUsage, setSessionUsage] = useState<{ messages: number; totalCost: number }>({ messages: 0, totalCost: 0 })
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Hydrate from storage after mount
  useEffect(() => {
    setModel(readStoredModel())
    setExpanded(readStoredExpanded())
    setAnthropicKey(readStoredKey())
  }, [])

  // Reset conversation when resetKey changes
  useEffect(() => {
    if (resetKey === undefined) return
    setMessages([])
    setInputValue('')
    setSessionUsage({ messages: 0, totalCost: 0 })
    abortRef.current?.abort()
    abortRef.current = null
    setIsStreaming(false)
    try { sessionStorage.removeItem(SS_KEY_EXPANDED) } catch {}
    setExpanded(false)
  }, [resetKey])

  // Scroll to latest message
  useEffect(() => {
    if (expanded) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, expanded])

  function handleExpandToggle() {
    const next = !expanded
    setExpanded(next)
    try { sessionStorage.setItem(SS_KEY_EXPANDED, String(next)) } catch {}
  }

  function handleModelChange(m: Model) {
    setModel(m)
    try { localStorage.setItem(LS_KEY_MODEL, m) } catch {}
  }

  function handleSaveKey(key: string) {
    setAnthropicKey(key)
    try { sessionStorage.setItem(SS_KEY_ANTHROPIC, key) } catch {}
  }

  function handleClearKey() {
    setAnthropicKey('')
    try { sessionStorage.removeItem(SS_KEY_ANTHROPIC) } catch {}
    setMessages([])
    setSessionUsage({ messages: 0, totalCost: 0 })
  }

  function handleOrgRepoCountChange(count: number) {
    if (count !== orgRepoCount) {
      setOrgRepoCount(count)
      setMessages([])
      setSessionUsage({ messages: 0, totalCost: 0 })
    }
  }

  function handleSortByChange(s: OrgSortBy) {
    if (s !== sortBy) {
      setSortBy(s)
      setMessages([])
      setSessionUsage({ messages: 0, totalCost: 0 })
    }
  }

  function buildContext(): string {
    if (contextType === 'repos' && repoResults)
      return serializeReposContext(repoResults).text
    if (contextType === 'org' && orgView && org)
      return serializeOrgContext(org, orgView, { maxRepos: orgRepoCount, sortBy, orgRepos }).text
    if (contextType === 'org' && orgInventory)
      return serializeOrgInventoryContext(orgInventory, { maxRepos: orgRepoCount, sortBy }).text
    return ''
  }

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isStreaming) return

    const userMsg: ChatMessage = { id: uid(), role: 'user', content: text }
    const assistantId = uid()

    setMessages((prev) => [...prev, userMsg, { id: assistantId, role: 'assistant', content: '' }])
    setInputValue('')
    setIsStreaming(true)

    const controller = new AbortController()
    abortRef.current = controller

    const apiMessages = [
      ...messages
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user' as const, content: text },
    ]

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          context: buildContext(),
          contextType,
          githubToken,
          anthropicKey: anthropicKey || undefined,
          model,
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({})) as { error?: { message?: string; code?: string } }
        const code = payload.error?.code
        const msg =
          code === 'NOT_CONFIGURED'
            ? "AI chat isn't available — please provide an Anthropic API key."
            : payload.error?.message ?? 'Something went wrong — please try again in a moment.'
        setMessages((prev) =>
          prev.map((m) => m.id === assistantId ? { ...m, role: 'error', content: msg, retryContent: text } : m),
        )
        return
      }

      const reader = response.body?.getReader()
      if (!reader) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, role: 'error', content: 'Streaming is not supported in this environment.', retryContent: text }
              : m,
          ),
        )
        return
      }

      const decoder = new TextDecoder()
      let buffer = ''
      let msgUsage: MessageUsage | undefined

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          let event: { type: string; text?: string; code?: string; message?: string; inputTokens?: number; outputTokens?: number; cacheReadTokens?: number }
          try { event = JSON.parse(line.slice(6)) } catch { continue }

          if (event.type === 'delta' && event.text) {
            setMessages((prev) =>
              prev.map((m) => m.id === assistantId ? { ...m, content: m.content + event.text! } : m),
            )
          } else if (event.type === 'usage') {
            msgUsage = {
              inputTokens: event.inputTokens ?? 0,
              outputTokens: event.outputTokens ?? 0,
              cacheReadTokens: event.cacheReadTokens ?? 0,
            }
            setMessages((prev) =>
              prev.map((m) => m.id === assistantId ? { ...m, usage: msgUsage } : m),
            )
            const cost = calcCost(msgUsage, model)
            setSessionUsage((prev) => ({ messages: prev.messages + 1, totalCost: prev.totalCost + cost }))
          } else if (event.type === 'error') {
            const noRetry = event.code === 'NOT_CONFIGURED' || event.code === 'CONTEXT_TOO_LARGE'
            const showKeyLink = event.code === 'INVALID_KEY'
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, role: 'error', content: event.message ?? 'Something went wrong.', retryContent: noRetry ? undefined : text, ...(showKeyLink ? { isKeyError: true } : {}) }
                  : m,
              ),
            )
          }
        }
      }
    } catch (err: unknown) {
      if ((err as { name?: string }).name === 'AbortError') return
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, role: 'error', content: 'Something went wrong — please try again in a moment.', retryContent: text }
            : m,
        ),
      )
    } finally {
      setIsStreaming(false)
      abortRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStreaming, messages, contextType, githubToken, anthropicKey, model, orgRepoCount, sortBy, repoResults, orgView, org, orgRepos])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    void sendMessage(inputValue)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void sendMessage(inputValue) }
  }

  function handleRetry(retryContent: string) {
    setMessages((prev) => prev.filter((m) => m.retryContent !== retryContent))
    void sendMessage(retryContent)
  }

  function handleNewConversation() {
    abortRef.current?.abort()
    abortRef.current = null
    setMessages([])
    setSessionUsage({ messages: 0, totalCost: 0 })
    setIsStreaming(false)
  }

  const isInventoryPhase = contextType === 'org' && !orgView && !!orgInventory
  const starterChips = contextType === 'repos'
    ? REPOS_STARTER_CHIPS
    : isInventoryPhase
      ? ORG_INVENTORY_STARTER_CHIPS
      : ORG_STARTER_CHIPS
  const showChips = messages.length === 0 && !isStreaming
  const orgTotal = orgView?.status.total ?? orgInventory?.results.length ?? 0
  const isOrgAndLarge = contextType === 'org' && orgTotal > 500
  const hasKey = !!anthropicKey

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 mx-auto max-w-5xl px-4">
      <div className="rounded-t-2xl border border-b-0 border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">

        {/* Collapsed bar */}
        {!expanded ? (
          <button
            type="button"
            onClick={handleExpandToggle}
            className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
          >
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
              <span className="mr-1 font-semibold text-slate-900 dark:text-slate-100">Ask Claude</span>

              {/* Model switcher */}
              <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-700 dark:bg-slate-800">
                {(Object.entries(MODEL_META) as [Model, typeof MODEL_META[Model]][]).map(([m, info]) => (
                  <button
                    key={m}
                    type="button"
                    title={`${info.hint} · Input $${info.inputRate}/1M · Output $${info.outputRate}/1M`}
                    onClick={() => handleModelChange(m)}
                    className={
                      model === m
                        ? 'rounded-full bg-white px-2.5 py-1 text-xs font-medium shadow-sm dark:bg-slate-700 text-slate-900 dark:text-slate-100'
                        : 'rounded-full px-2.5 py-1 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                    }
                  >
                    {info.icon} {info.label}
                  </button>
                ))}
              </div>

              {/* Org controls */}
              {isOrgAndLarge && (
                <>
                  <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                    <label htmlFor="chat-repo-count" className="whitespace-nowrap">Top</label>
                    <input
                      id="chat-repo-count"
                      type="range"
                      min="50"
                      max="500"
                      step="50"
                      value={orgRepoCount}
                      onChange={(e) => handleOrgRepoCountChange(Number(e.target.value))}
                      className="w-20 accent-sky-600"
                    />
                    <span className="w-8 text-right font-medium">{orgRepoCount}</span>
                    <span>repos</span>
                  </div>
                  <select
                    value={sortBy}
                    onChange={(e) => handleSortByChange(e.target.value as OrgSortBy)}
                    className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  >
                    {SORT_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </>
              )}

              {/* Session cost */}
              {sessionUsage.messages > 0 && (
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  Session: {sessionUsage.messages} {sessionUsage.messages === 1 ? 'msg' : 'msgs'} · {formatCost(sessionUsage.totalCost)}
                </span>
              )}

              <div className="ml-auto flex items-center gap-2">
                {/* Change key */}
                {hasKey && (
                  <button
                    type="button"
                    onClick={handleClearKey}
                    className="text-xs text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                    title="Clear stored API key"
                  >
                    Change key
                  </button>
                )}
                {messages.length > 0 && (
                  <button
                    type="button"
                    onClick={handleNewConversation}
                    className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  >
                    New conversation
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleExpandToggle}
                  aria-label="Collapse chat"
                  className="inline-flex h-6 w-6 items-center justify-center rounded text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                >
                  <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6l4 4 4-4" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Structured search filter (org tab only, always visible when expanded) */}
            {contextType === 'org' && onRepoQueryChange && (() => {
              const parsed = parseStructuredSearchQuery(repoQuery)
              return (
                <div className="border-b border-slate-200 px-4 py-2 dark:border-slate-700">
                  <div className="flex items-center gap-2">
                    <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-3.5 w-3.5 shrink-0 text-slate-400">
                      <circle cx="6.5" cy="6.5" r="4" /><path strokeLinecap="round" d="M11 11l3 3" />
                    </svg>
                    <input
                      type="text"
                      value={repoQuery}
                      onChange={(e) => onRepoQueryChange(e.target.value)}
                      placeholder="Filter repos: lang:go stars:>500 archived:false"
                      className="flex-1 rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500"
                    />
                    {repoQuery && (
                      <button
                        type="button"
                        onClick={() => onRepoQueryChange('')}
                        className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                        aria-label="Clear filter"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  {parsed.invalidTokens.length > 0 && (
                    <p className="mt-1 text-[10px] text-amber-600 dark:text-amber-400">
                      Ignored: {parsed.invalidTokens.join(', ')}
                    </p>
                  )}
                  <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
                    {SEARCH_PREFIX_HINTS.map(({ key, description, example }) => (
                      <span key={key} className="group relative cursor-help">
                        <span className="text-[10px] text-slate-400 underline decoration-dotted underline-offset-2 dark:text-slate-500">
                          {key}:
                        </span>
                        <span className="pointer-events-none invisible absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap rounded bg-slate-800 px-2.5 py-1.5 opacity-0 shadow-lg transition-opacity group-hover:visible group-hover:opacity-100 dark:bg-slate-700">
                          <span className="block text-[11px] font-medium text-white">{description}</span>
                          <span className="block text-[10px] text-slate-300 font-mono">{example}</span>
                          <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-slate-800 dark:border-t-slate-700" />
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              )
            })()}

            {/* Chat section label */}
            <div className="flex items-center gap-2 px-4 pt-2 pb-0">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">Chat with Claude</span>
              <div className="flex-1 border-t border-slate-200 dark:border-slate-700" />
            </div>

            {/* Key entry form or chat */}
            {!hasKey ? (
              <KeyEntryForm onSave={handleSaveKey} />
            ) : (
              <>
                {/* Message history */}
                <div
                  className="flex h-[40vh] flex-col overflow-y-auto px-4 py-3 space-y-3"
                  aria-live="polite"
                  aria-label="Chat messages"
                >
                  {showChips && (
                    <div className="flex flex-wrap gap-2">
                      {starterChips.map((chip) => (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => void sendMessage(chip)}
                          className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                  )}

                  {messages.map((msg) => {
                    if (msg.role === 'user') {
                      return (
                        <div key={msg.id} className="flex justify-end">
                          <div className="max-w-[80%] rounded-2xl bg-sky-600 px-4 py-2 text-sm text-white">
                            {msg.content}
                          </div>
                        </div>
                      )
                    }

                    if (msg.role === 'error') {
                      return (
                        <div key={msg.id} className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-700/50 dark:bg-amber-900/20 dark:text-amber-200">
                          <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 h-4 w-4 shrink-0">
                            <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
                          </svg>
                          <div className="flex-1">
                            <p>{msg.content}</p>
                            {msg.retryContent && (
                              <button
                                type="button"
                                onClick={() => handleRetry(msg.retryContent!)}
                                className="mt-1 text-xs font-medium underline hover:no-underline"
                              >
                                Retry
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    }

                    // assistant
                    return (
                      <div key={msg.id} className="flex flex-col items-start gap-1">
                        <div className="max-w-[85%] rounded-2xl bg-slate-100 px-4 py-2 text-sm text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                          {msg.content ? (
                            <div className="prose prose-sm max-w-none dark:prose-invert">
                              {renderMarkdown(msg.content)}
                            </div>
                          ) : (
                            <span className="animate-pulse text-slate-400">●</span>
                          )}
                        </div>
                        {msg.usage && (
                          <p className="px-1 text-[10px] text-slate-400 dark:text-slate-500">
                            ↑ {formatTokens(msg.usage.inputTokens)} · ↓ {formatTokens(msg.usage.outputTokens)} · {formatCost(calcCost(msg.usage, model))}
                            {msg.usage.cacheReadTokens > 0 && ` · ${formatTokens(msg.usage.cacheReadTokens)} cached`}
                          </p>
                        )}
                      </div>
                    )
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input area */}
                <form onSubmit={handleSubmit} className="border-t border-slate-200 px-4 py-3 dark:border-slate-700">
                  <div className="flex items-end gap-2">
                    <textarea
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Ask a question…"
                      rows={1}
                      disabled={isStreaming}
                      className="flex-1 resize-none rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500"
                      style={{ minHeight: '38px', maxHeight: '120px' }}
                    />
                    <button
                      type="submit"
                      disabled={!inputValue.trim() || isStreaming}
                      aria-label="Send message"
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-40 dark:bg-sky-500 dark:hover:bg-sky-400"
                    >
                      <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                        <path d="M3.105 2.288a.75.75 0 0 0-.826.95l1.414 4.925A1.5 1.5 0 0 0 5.135 9.25h6.115a.75.75 0 0 1 0 1.5H5.135a1.5 1.5 0 0 0-1.442 1.087L2.28 16.762a.75.75 0 0 0 .826.95 28.897 28.897 0 0 0 15.208-7.787.75.75 0 0 0 0-1.049A28.897 28.897 0 0 0 3.105 2.288Z" />
                      </svg>
                    </button>
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
