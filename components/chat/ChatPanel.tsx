'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import type { AnalysisResult } from '@/lib/analyzer/analysis-result'
import type { OrgSummaryViewModel } from '@/lib/org-aggregation/types'
import { serializeReposContext, serializeOrgContext } from './serialize-context'

// ---- Types ----------------------------------------------------------------

type Model = 'claude-haiku-4-5' | 'claude-sonnet-4-6'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'error'
  content: string
  /** Original user question preserved when an error happens so they can retry */
  retryContent?: string
}

export interface ChatPanelProps {
  contextType: 'repos' | 'org'
  /** Repos-tab context */
  repoResults?: AnalysisResult[]
  /** Org-tab context */
  orgView?: OrgSummaryViewModel
  org?: string
  githubToken: string
  /** Reset key — when it changes, conversation is cleared */
  resetKey?: number
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

const MODEL_LABELS: Record<Model, { icon: string; label: string; hint: string }> = {
  'claude-haiku-4-5': { icon: '⚡', label: 'Fast', hint: 'Best for quick lookups and factual questions about the data' },
  'claude-sonnet-4-6': { icon: '🧠', label: 'Deep', hint: 'Better for multi-hop reasoning, comparisons, and nuanced recommendations' },
}

const LOCAL_STORAGE_MODEL_KEY = 'repopulse:chat:model'
const SESSION_STORAGE_EXPANDED_KEY = 'repopulse:chat:expanded'

// ---- Helpers --------------------------------------------------------------

function uid(): string {
  return Math.random().toString(36).slice(2)
}

function readStoredModel(): Model {
  try {
    const v = localStorage.getItem(LOCAL_STORAGE_MODEL_KEY)
    if (v === 'claude-haiku-4-5' || v === 'claude-sonnet-4-6') return v
  } catch {}
  return 'claude-haiku-4-5'
}

function readStoredExpanded(): boolean {
  try {
    return sessionStorage.getItem(SESSION_STORAGE_EXPANDED_KEY) === 'true'
  } catch {}
  return false
}

// ---- Simple markdown renderer (bold + paragraphs + code blocks) -----------

function renderMarkdown(text: string): React.ReactNode {
  // Split by code fences first
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
    // Process inline: bold, code, paragraphs
    return part.split('\n\n').filter(Boolean).map((para, j) => {
      const spans = para.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((seg, k) => {
        if (seg.startsWith('**') && seg.endsWith('**')) {
          return <strong key={k}>{seg.slice(2, -2)}</strong>
        }
        if (seg.startsWith('`') && seg.endsWith('`')) {
          return <code key={k} className="rounded bg-slate-100 px-1 font-mono text-xs dark:bg-slate-800">{seg.slice(1, -1)}</code>
        }
        return <span key={k}>{seg}</span>
      })
      return (
        <p key={`${i}-${j}`} className="mb-2 last:mb-0">
          {spans}
        </p>
      )
    })
  })
}

// ---- Main component -------------------------------------------------------

export function ChatPanel({ contextType, repoResults, orgView, org, githubToken, resetKey }: ChatPanelProps) {
  const [expanded, setExpanded] = useState(false)
  const [model, setModel] = useState<Model>('claude-haiku-4-5')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [orgRepoCount, setOrgRepoCount] = useState(500)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Hydrate from storage after mount
  useEffect(() => {
    setModel(readStoredModel())
    setExpanded(readStoredExpanded())
  }, [])

  // Reset conversation when resetKey changes
  useEffect(() => {
    if (resetKey === undefined) return
    setMessages([])
    setInputValue('')
    abortRef.current?.abort()
    abortRef.current = null
    setIsStreaming(false)
    try { sessionStorage.removeItem(SESSION_STORAGE_EXPANDED_KEY) } catch {}
    setExpanded(false)
  }, [resetKey])

  // Scroll to latest message
  useEffect(() => {
    if (expanded) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, expanded])

  function handleExpandToggle() {
    const next = !expanded
    setExpanded(next)
    try { sessionStorage.setItem(SESSION_STORAGE_EXPANDED_KEY, String(next)) } catch {}
  }

  function handleModelChange(m: Model) {
    setModel(m)
    try { localStorage.setItem(LOCAL_STORAGE_MODEL_KEY, m) } catch {}
  }

  function handleOrgRepoCountChange(count: number) {
    if (count !== orgRepoCount) {
      setOrgRepoCount(count)
      setMessages([])
    }
  }

  function buildContext(): string {
    if (contextType === 'repos' && repoResults) {
      return serializeReposContext(repoResults).text
    }
    if (contextType === 'org' && orgView && org) {
      return serializeOrgContext(org, orgView, { maxRepos: orgRepoCount }).text
    }
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

    // Build the message list to send: all prior turns + new user message
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
          model,
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({})) as { error?: { message?: string; code?: string } }
        const code = payload.error?.code
        const msg =
          code === 'NOT_CONFIGURED'
            ? "AI chat isn't available in this deployment."
            : payload.error?.message ?? 'Something went wrong — please try again in a moment.'
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, role: 'error', content: msg, retryContent: text }
              : m,
          ),
        )
        return
      }

      const reader = response.body?.getReader()
      if (!reader) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, role: 'error', content: 'Streaming is not supported in this environment — please try again.', retryContent: text }
              : m,
          ),
        )
        return
      }

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const json = line.slice(6)
          let event: { type: string; text?: string; code?: string; message?: string }
          try { event = JSON.parse(json) } catch { continue }

          if (event.type === 'delta' && event.text) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, content: m.content + event.text! } : m,
              ),
            )
          } else if (event.type === 'error') {
            const noRetry = event.code === 'NOT_CONFIGURED' || event.code === 'CONTEXT_TOO_LARGE'
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? {
                      ...m,
                      role: 'error',
                      content: event.message ?? 'Something went wrong.',
                      retryContent: noRetry ? undefined : text,
                    }
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
  }, [isStreaming, messages, contextType, githubToken, model, orgRepoCount, repoResults, orgView, org])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    void sendMessage(inputValue)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void sendMessage(inputValue)
    }
  }

  function handleChipClick(chip: string) {
    void sendMessage(chip)
  }

  function handleRetry(retryContent: string) {
    // Remove the error message and resend
    setMessages((prev) => prev.filter((m) => m.retryContent !== retryContent))
    void sendMessage(retryContent)
  }

  function handleNewConversation() {
    abortRef.current?.abort()
    abortRef.current = null
    setMessages([])
    setIsStreaming(false)
  }

  const starterChips = contextType === 'repos' ? REPOS_STARTER_CHIPS : ORG_STARTER_CHIPS
  const showChips = messages.length === 0 && !isStreaming
  const isOrgAndLarge = contextType === 'org' && (orgView?.status.total ?? 0) > 500

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
            <span className="flex-1">Ask a question about this analysis</span>
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
                {(Object.entries(MODEL_LABELS) as [Model, (typeof MODEL_LABELS)[Model]][]).map(([m, info]) => (
                  <button
                    key={m}
                    type="button"
                    title={info.hint}
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
              {isOrgAndLarge ? (
                <>
                  <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                    <label htmlFor="chat-repo-count" className="whitespace-nowrap">Analyzing top</label>
                    <input
                      id="chat-repo-count"
                      type="range"
                      min="50"
                      max="500"
                      step="50"
                      value={orgRepoCount}
                      onChange={(e) => handleOrgRepoCountChange(Number(e.target.value))}
                      className="w-24 accent-sky-600"
                    />
                    <span className="w-8 text-right font-medium">{orgRepoCount}</span>
                    <span>repos</span>
                  </div>
                </>
              ) : null}

              <div className="ml-auto flex items-center gap-2">
                {messages.length > 0 ? (
                  <button
                    type="button"
                    onClick={handleNewConversation}
                    className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  >
                    New conversation
                  </button>
                ) : null}
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

            {/* Message history */}
            <div
              className="flex h-[40vh] flex-col overflow-y-auto px-4 py-3 space-y-3"
              aria-live="polite"
              aria-label="Chat messages"
            >
              {showChips ? (
                <div className="flex flex-wrap gap-2">
                  {starterChips.map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => handleChipClick(chip)}
                      className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              ) : null}

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
                        {msg.retryContent ? (
                          <button
                            type="button"
                            onClick={() => handleRetry(msg.retryContent!)}
                            className="mt-1 text-xs font-medium underline hover:no-underline"
                          >
                            Retry
                          </button>
                        ) : null}
                      </div>
                    </div>
                  )
                }
                // assistant
                return (
                  <div key={msg.id} className="flex justify-start">
                    <div className="max-w-[85%] rounded-2xl bg-slate-100 px-4 py-2 text-sm text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                      {msg.content ? (
                        <div className="prose prose-sm max-w-none dark:prose-invert">
                          {renderMarkdown(msg.content)}
                        </div>
                      ) : (
                        <span className="animate-pulse text-slate-400">●</span>
                      )}
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <form onSubmit={handleSubmit} className="border-t border-slate-200 px-4 py-3 dark:border-slate-700">
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
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
      </div>
    </div>
  )
}
