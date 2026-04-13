type LogLevel = 'info' | 'warn' | 'error'

export interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
}

const MAX_ENTRIES = 500

const entries: LogEntry[] = []
const listeners = new Set<(entry: LogEntry) => void>()

function addEntry(level: LogLevel, args: unknown[]) {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message: args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' '),
  }
  entries.push(entry)
  if (entries.length > MAX_ENTRIES) entries.shift()
  for (const listener of listeners) listener(entry)
}

export function getEntries(): LogEntry[] {
  return [...entries]
}

export function subscribe(listener: (entry: LogEntry) => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

let installed = false

export function installLogger() {
  if (installed) return
  installed = true

  const originalLog = console.log
  const originalWarn = console.warn
  const originalError = console.error

  console.log = (...args: unknown[]) => {
    addEntry('info', args)
    originalLog.apply(console, args)
  }
  console.warn = (...args: unknown[]) => {
    addEntry('warn', args)
    originalWarn.apply(console, args)
  }
  console.error = (...args: unknown[]) => {
    addEntry('error', args)
    originalError.apply(console, args)
  }
}
