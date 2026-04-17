'use client'

import { useEffect, useRef, useState } from 'react'

interface LogEntry {
  timestamp: string
  level: 'info' | 'warn' | 'error'
  message: string
}

const levelColors: Record<string, string> = {
  info: 'text-blue-400',
  warn: 'text-yellow-400',
  error: 'text-red-400',
}

export function DevToolsLink() {
  if (process.env.NODE_ENV !== 'development') return null

  return <LogPanel />
}

function LogPanel() {
  const [open, setOpen] = useState(false)
  const [entries, setEntries] = useState<LogEntry[]>([])
  const [connected, setConnected] = useState(false)
  const [filter, setFilter] = useState<string>('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    const eventSource = new EventSource('/api/debug/logs')

    eventSource.onopen = () => setConnected(true)

    eventSource.onmessage = (event) => {
      const entry = JSON.parse(event.data) as LogEntry
      setEntries((prev) => {
        const next = [...prev, entry]
        return next.length > 500 ? next.slice(-500) : next
      })
    }

    eventSource.onerror = () => {
      setConnected(false)
      eventSource.close()
    }

    return () => eventSource.close()
  }, [open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [entries])

  const filtered = filter ? entries.filter((e) => e.level === filter) : entries

  if (!open) {
    return (
      <div className="fixed bottom-2 right-2 z-50">
        <button
          onClick={() => setOpen(true)}
          className="rounded bg-gray-800 px-2 py-1 text-xs text-gray-400 hover:text-white"
        >
          Logs
        </button>
      </div>
    )
  }

  return (
    <div className="fixed bottom-0 right-0 z-50 w-[600px] max-w-full h-80 flex flex-col bg-gray-950 border border-gray-700 rounded-tl-lg shadow-2xl font-mono text-sm">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <span className="text-gray-100 font-bold text-xs">Backend Logs</span>
          <span
            className={`inline-block w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}
            title={connected ? 'Connected' : 'Disconnected'}
          />
        </div>
        <div className="flex items-center gap-2">
          {['', 'info', 'warn', 'error'].map((level) => (
            <button
              key={level}
              onClick={() => setFilter(level)}
              className={`px-2 py-0.5 rounded text-xs ${ filter === level ? 'bg-gray-700 text-white' : 'bg-gray-800 text-gray-400 hover:text-gray-200' }`}
            >
              {level || 'all'}
            </button>
          ))}
          <button
            onClick={() => setEntries([])}
            className="px-2 py-0.5 rounded text-xs bg-gray-800 text-gray-400 hover:text-gray-200"
          >
            clear
          </button>
          <button
            onClick={() => setOpen(false)}
            className="px-2 py-0.5 rounded text-xs bg-gray-800 text-gray-400 hover:text-gray-200"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
        {filtered.length === 0 && (
          <p className="text-gray-500">No log entries yet.</p>
        )}
        {filtered.map((entry, i) => (
          <div key={i} className="flex gap-3">
            <span className="text-gray-600 shrink-0">
              {new Date(entry.timestamp).toLocaleTimeString()}
            </span>
            <span className={`shrink-0 uppercase w-12 ${levelColors[entry.level]}`}>
              {entry.level}
            </span>
            <span className="text-gray-300 break-all">{entry.message}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
