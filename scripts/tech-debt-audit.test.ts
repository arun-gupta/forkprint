import { describe, expect, it, vi, afterEach } from 'vitest'
import { buildChunks, parseFindings, callCopilot, DailyBudgetExhaustedError, MAX_RETRY_WAIT_S } from './tech-debt-audit'

// MAX_CHUNK_TOKENS = 6_000, TOKENS_PER_CHAR = 1/4
// → maxBytes = 6_000 / 0.25 = 24_000 chars per chunk

describe('buildChunks', () => {
  it('returns empty array for no files', () => {
    expect(buildChunks([])).toHaveLength(0)
  })

  it('returns a single chunk when all files fit within the budget', () => {
    const fileData = [
      { relPath: 'a.ts', content: 'const x = 1', size: 11 },
      { relPath: 'b.ts', content: 'const y = 2', size: 11 },
    ]
    const chunks = buildChunks(fileData)
    expect(chunks).toHaveLength(1)
    expect(chunks[0].fileCount).toBe(2)
    expect(chunks[0].estimatedTokens).toBeGreaterThan(0)
    expect(chunks[0].payload).toContain('// --- a.ts ---')
    expect(chunks[0].payload).toContain('// --- b.ts ---')
  })

  it('splits into multiple chunks when files exceed the 24_000-char budget', () => {
    // 20_000 chars per file → 2 files = 40_000 chars > 24_000 → must split
    const bigContent = 'x'.repeat(20_000)
    const fileData = [
      { relPath: 'a.ts', content: bigContent, size: 20_000 },
      { relPath: 'b.ts', content: bigContent, size: 20_000 },
    ]
    const chunks = buildChunks(fileData)
    expect(chunks.length).toBeGreaterThan(1)
    // Each file should appear in exactly one chunk
    const allPayload = chunks.map(c => c.payload).join('\n')
    expect(allPayload).toContain('// --- a.ts ---')
    expect(allPayload).toContain('// --- b.ts ---')
  })

  it('each chunk has estimated tokens no greater than MAX_CHUNK_TOKENS (6 000)', () => {
    // 3 files × 10 000 chars = 2 500 tokens each; first two fit (5 000), third overflows
    const content = 'x'.repeat(10_000)
    const fileData = [
      { relPath: 'a.ts', content, size: 10_000 },
      { relPath: 'b.ts', content, size: 10_000 },
      { relPath: 'c.ts', content, size: 10_000 },
    ]
    const chunks = buildChunks(fileData)
    for (const chunk of chunks) {
      expect(chunk.estimatedTokens).toBeLessThanOrEqual(6_000)
    }
  })

  it('places an oversized single file alone in its own chunk', () => {
    // A 30_000-char file exceeds 24_000 maxBytes; it should still be sent as its own chunk
    const hugeContent = 'y'.repeat(30_000)
    const smallContent = 'z'.repeat(100)
    const fileData = [
      { relPath: 'small.ts', content: smallContent, size: 100 },
      { relPath: 'huge.ts', content: hugeContent, size: 30_000 },
    ]
    const chunks = buildChunks(fileData)
    // small file is first in the array (already sorted by caller), huge file forces a new chunk
    expect(chunks.length).toBeGreaterThanOrEqual(2)
    const hugeChunk = chunks.find(c => c.payload.includes('// --- huge.ts ---'))
    expect(hugeChunk).toBeDefined()
  })

  it('places an oversized file alone when it is the first file', () => {
    // Oversized file gets truncated to maxBytes then placed alone; small file goes in its own chunk
    const hugeContent = 'y'.repeat(30_000)
    const smallContent = 'z'.repeat(100)
    const fileData = [
      { relPath: 'huge.ts', content: hugeContent, size: 30_000 },
      { relPath: 'small.ts', content: smallContent, size: 100 },
    ]
    const chunks = buildChunks(fileData)
    expect(chunks.length).toBeGreaterThanOrEqual(2)
    const hugeChunk = chunks.find(c => c.payload.includes('// --- huge.ts ---'))
    const smallChunk = chunks.find(c => c.payload.includes('// --- small.ts ---'))
    expect(hugeChunk).toBeDefined()
    expect(smallChunk).toBeDefined()
    expect(hugeChunk).not.toBe(smallChunk)
  })

  it('truncates a single file that exceeds maxBytes and keeps estimatedTokens within budget', () => {
    // A 100_000-char file (25_000 tokens) must be truncated to ≤24_000 chars before sending
    const hugeContent = 'x'.repeat(100_000)
    const chunks = buildChunks([{ relPath: 'big.ts', content: hugeContent, size: 100_000 }])
    expect(chunks).toHaveLength(1)
    expect(chunks[0].estimatedTokens).toBeLessThanOrEqual(6_000)
    expect(chunks[0].payload).toContain('// [truncated')
  })

  it('fileCount matches the number of files in each chunk', () => {
    const content = 'x'.repeat(10_000)
    const fileData = Array.from({ length: 5 }, (_, i) => ({
      relPath: `file${i}.ts`,
      content,
      size: 10_000,
    }))
    const chunks = buildChunks(fileData)
    const totalFiles = chunks.reduce((sum, c) => sum + c.fileCount, 0)
    expect(totalFiles).toBe(5)
  })
})

describe('parseFindings', () => {
  const sampleFinding = {
    id: 'DRY-1',
    category: 'DRY',
    file: 'lib/foo.ts',
    lineStart: 1,
    lineEnd: 10,
    description: 'Duplicated logic',
    severity: 'fix-soon',
    recommendation: 'Extract a shared helper',
  }

  it('parses plain JSON array without fences', () => {
    const raw = JSON.stringify([sampleFinding])
    const result = parseFindings(raw)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('DRY-1')
  })

  it('strips ```json fences before parsing', () => {
    const raw = '```json\n' + JSON.stringify([sampleFinding]) + '\n```'
    const result = parseFindings(raw)
    expect(result).toHaveLength(1)
    expect(result[0].category).toBe('DRY')
  })

  it('strips plain ``` fences before parsing', () => {
    const raw = '```\n' + JSON.stringify([sampleFinding]) + '\n```'
    const result = parseFindings(raw)
    expect(result).toHaveLength(1)
    expect(result[0].file).toBe('lib/foo.ts')
  })

  it('returns empty array and emits a warning for malformed JSON', () => {
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
    const result = parseFindings('not valid json {{{')
    expect(result).toEqual([])
    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('could not parse findings JSON'))
    stderrSpy.mockRestore()
  })

  it('returns empty array for malformed JSON wrapped in fences', () => {
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
    const raw = '```json\nbroken { json\n```'
    const result = parseFindings(raw)
    expect(result).toEqual([])
    stderrSpy.mockRestore()
  })
})

describe('callCopilot rate-limiting', () => {
  const FAKE_PAT = 'test-pat'
  const FAKE_PAYLOAD = 'const x = 1'

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('throws DailyBudgetExhaustedError when Retry-After exceeds MAX_RETRY_WAIT_S', async () => {
    const largeWait = MAX_RETRY_WAIT_S + 1
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        headers: { get: (h: string) => (h === 'Retry-After' ? String(largeWait) : null) },
        text: async () => 'rate limited',
      }),
    )

    await expect(callCopilot(FAKE_PAT, FAKE_PAYLOAD)).rejects.toBeInstanceOf(DailyBudgetExhaustedError)
  })

  it('DailyBudgetExhaustedError message says "will write partial results"', async () => {
    const largeWait = MAX_RETRY_WAIT_S + 3600
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        headers: { get: (h: string) => (h === 'Retry-After' ? String(largeWait) : null) },
        text: async () => 'rate limited',
      }),
    )

    let caught: unknown
    try {
      await callCopilot(FAKE_PAT, FAKE_PAYLOAD)
    } catch (err) {
      caught = err
    }

    expect(caught).toBeInstanceOf(DailyBudgetExhaustedError)
    expect((caught as Error).message).toContain('will write partial results')
  })

  it('throws DailyBudgetExhaustedError on 503 with large Retry-After', async () => {
    const largeWait = MAX_RETRY_WAIT_S + 1
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        headers: { get: (h: string) => (h === 'Retry-After' ? String(largeWait) : null) },
        text: async () => 'service unavailable',
      }),
    )

    await expect(callCopilot(FAKE_PAT, FAKE_PAYLOAD)).rejects.toBeInstanceOf(DailyBudgetExhaustedError)
  })

  it('does not throw DailyBudgetExhaustedError when Retry-After is within the normal limit', async () => {
    vi.useFakeTimers()
    const smallWait = MAX_RETRY_WAIT_S - 1
    const findingPayload = JSON.stringify([
      {
        id: 'DRY-1',
        category: 'DRY',
        file: 'lib/foo.ts',
        lineStart: 1,
        lineEnd: 5,
        description: 'test',
        severity: 'fix-soon',
        confidence: 'high',
        recommendation: 'fix it',
      },
    ])
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          headers: { get: (h: string) => (h === 'Retry-After' ? String(smallWait) : null) },
          text: async () => 'rate limited',
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: { get: () => null },
          json: async () => ({ choices: [{ message: { content: findingPayload } }] }),
        }),
    )

    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
    const callPromise = callCopilot(FAKE_PAT, FAKE_PAYLOAD)
    // Advance time past the sleep duration so the retry fires
    await vi.advanceTimersByTimeAsync(smallWait * 1000 + 100)
    const results = await callPromise
    stderrSpy.mockRestore()
    vi.useRealTimers()

    expect(results).toHaveLength(1)
    expect(results[0].id).toBe('DRY-1')
  })

  it('DailyBudgetExhaustedError does not propagate — the chunk loop catches it and still returns accumulated findings', async () => {
    // Simulate: first chunk succeeds, second chunk triggers daily budget exhaustion.
    // The catch block in the loop should break out and the accumulated findings should be available.
    const finding = {
      id: 'DRY-1',
      category: 'DRY',
      file: 'lib/foo.ts',
      lineStart: 1,
      lineEnd: 5,
      description: 'test',
      severity: 'fix-soon',
      confidence: 'high',
      recommendation: 'fix it',
    }
    const largeWait = MAX_RETRY_WAIT_S + 3600

    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        // First chunk succeeds
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: { get: () => null },
          json: async () => ({ choices: [{ message: { content: JSON.stringify([finding]) } }] }),
        })
        // Second chunk exhausts daily budget
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          headers: { get: (h: string) => (h === 'Retry-After' ? String(largeWait) : null) },
          text: async () => 'rate limited',
        }),
    )

    // Verify that DailyBudgetExhaustedError is catchable and accumulated findings from prior chunks survive
    const accumulatedFindings: typeof finding[] = []
    const chunks = [{ payload: 'chunk1', fileCount: 1, estimatedTokens: 100 }, { payload: 'chunk2', fileCount: 1, estimatedTokens: 100 }]

    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
    for (const chunk of chunks) {
      try {
        const findings = await callCopilot(FAKE_PAT, chunk.payload)
        accumulatedFindings.push(...findings)
      } catch (err) {
        if (err instanceof DailyBudgetExhaustedError) {
          break
        }
        throw err
      }
    }
    stderrSpy.mockRestore()

    expect(accumulatedFindings).toHaveLength(1)
    expect(accumulatedFindings[0].id).toBe('DRY-1')
  })
})
