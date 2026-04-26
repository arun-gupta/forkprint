import { describe, expect, it } from 'vitest'
import { buildChunks } from './tech-debt-audit'

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
