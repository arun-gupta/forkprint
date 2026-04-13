import { describe, it, expect, beforeEach, vi } from 'vitest'

// Each test gets a fresh module instance
async function freshLogger() {
  vi.resetModules()
  return await import('./logger')
}

describe('debug logger', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('captures console.log as info entries', async () => {
    const { installLogger, getEntries } = await freshLogger()
    installLogger()
    console.log('test message')
    const entries = getEntries()
    expect(entries.length).toBeGreaterThanOrEqual(1)
    const last = entries[entries.length - 1]
    expect(last.level).toBe('info')
    expect(last.message).toBe('test message')
    expect(last.timestamp).toBeTruthy()
  })

  it('captures console.warn as warn entries', async () => {
    const { installLogger, getEntries } = await freshLogger()
    installLogger()
    console.warn('warning')
    const entries = getEntries()
    const last = entries[entries.length - 1]
    expect(last.level).toBe('warn')
    expect(last.message).toBe('warning')
  })

  it('captures console.error as error entries', async () => {
    const { installLogger, getEntries } = await freshLogger()
    installLogger()
    console.error('bad thing')
    const entries = getEntries()
    const last = entries[entries.length - 1]
    expect(last.level).toBe('error')
    expect(last.message).toBe('bad thing')
  })

  it('stringifies non-string arguments', async () => {
    const { installLogger, getEntries } = await freshLogger()
    installLogger()
    console.log('obj:', { key: 'value' })
    const entries = getEntries()
    const last = entries[entries.length - 1]
    expect(last.message).toBe('obj: {"key":"value"}')
  })

  it('notifies subscribers of new entries', async () => {
    const { installLogger, subscribe } = await freshLogger()
    installLogger()
    const received: unknown[] = []
    subscribe((entry) => received.push(entry))
    console.log('sub test')
    expect(received.length).toBeGreaterThanOrEqual(1)
  })

  it('unsubscribe stops notifications', async () => {
    const { installLogger, subscribe } = await freshLogger()
    installLogger()
    const received: unknown[] = []
    const unsub = subscribe((entry) => received.push(entry))
    unsub()
    console.log('after unsub')
    expect(received).toHaveLength(0)
  })
})
