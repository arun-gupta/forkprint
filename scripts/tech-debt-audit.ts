/**
 * Daily tech-debt and DRY-violation audit via GitHub Copilot API.
 *
 * Usage: COPILOT_TOKEN=<pat> npx tsx scripts/tech-debt-audit.ts
 *
 * Writes findings to the path in FINDINGS_OUTPUT env var (default: findings.json).
 */

import { createHash } from 'crypto'
import { readdirSync, readFileSync, writeFileSync } from 'fs'
import { join, relative } from 'path'
import { fileURLToPath } from 'url'

const ROOT = process.cwd()
// ~6 000 tokens of source text per chunk, leaving headroom for the prompt template and response
const MAX_CHUNK_TOKENS = 6_000
const TOKENS_PER_CHAR = 1 / 4 // rough heuristic: 1 token ≈ 4 chars

interface Finding {
  id: string
  category: 'DRY' | 'CONSISTENCY' | 'PATTERNS' | 'OPTIMIZATIONS' | 'MISSING_TESTS'
  file: string
  lineStart: number
  lineEnd: number
  description: string
  severity: 'fix-now' | 'fix-soon' | 'low-priority'
  recommendation: string
}

const SOURCE_DIRS = ['app', 'lib', 'scripts']
const INCLUDE_EXTS = new Set(['.ts', '.tsx'])
const EXCLUDE_RE = /\.test\.|\.spec\.|node_modules|\.next/

function walkDir(dir: string, results: string[] = []): string[] {
  let entries
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return results
  }
  for (const entry of entries) {
    if (EXCLUDE_RE.test(entry.name)) continue
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      walkDir(fullPath, results)
    } else if (entry.isFile()) {
      const dot = entry.name.lastIndexOf('.')
      if (dot !== -1 && INCLUDE_EXTS.has(entry.name.slice(dot))) {
        results.push(fullPath)
      }
    }
  }
  return results
}

function collectFiles(): string[] {
  return SOURCE_DIRS.flatMap(dir => walkDir(join(ROOT, dir)))
}

interface FileData {
  relPath: string
  content: string
  size: number
}

function loadFiles(files: string[]): FileData[] {
  const fileData = files.flatMap(filePath => {
    try {
      const content = readFileSync(filePath, 'utf8')
      return [{ relPath: relative(ROOT, filePath), content, size: content.length }]
    } catch {
      return []
    }
  })
  // Largest files first — biggest debt risk and god-module signal
  fileData.sort((a, b) => b.size - a.size)
  return fileData
}

export function buildChunks(fileData: FileData[]): Array<{ payload: string; fileCount: number; estimatedTokens: number }> {
  const chunks: Array<{ payload: string; fileCount: number; estimatedTokens: number }> = []
  const maxBytes = MAX_CHUNK_TOKENS / TOKENS_PER_CHAR

  let parts: string[] = []
  let chunkBytes = 0

  for (const { relPath, content } of fileData) {
    let entry = `// --- ${relPath} ---\n${content}`
    // Truncate files that would exceed the per-chunk budget even alone
    if (entry.length > maxBytes) {
      const note = '\n// [truncated — file exceeds per-chunk token budget]'
      entry = entry.slice(0, maxBytes - note.length) + note
    }
    if (parts.length > 0 && chunkBytes + entry.length > maxBytes) {
      const payload = parts.join('\n\n')
      chunks.push({ payload, fileCount: parts.length, estimatedTokens: Math.round(payload.length * TOKENS_PER_CHAR) })
      parts = []
      chunkBytes = 0
    }
    parts.push(entry)
    chunkBytes += entry.length
  }

  if (parts.length > 0) {
    const payload = parts.join('\n\n')
    chunks.push({ payload, fileCount: parts.length, estimatedTokens: Math.round(payload.length * TOKENS_PER_CHAR) })
  }

  return chunks
}

const AUDIT_PROMPT = `You are a senior TypeScript/Next.js code quality auditor.
Analyse the source files below and identify technical debt.

Detection categories:
- DRY: copy-pasted logic, duplicated literals, repeated structural patterns
- CONSISTENCY: hardcoded thresholds, diverging error shapes, mixed null/undefined/unavailable patterns
- PATTERNS: god modules (>500 lines), stale-closure eslint-disable suppressions, unsafe \`as unknown as\` casts, missing useMemo on expensive derivations
- OPTIMIZATIONS: synchronous chart imports, O(n²) patterns, unused GraphQL fields
- MISSING_TESTS: API routes with zero unit tests, scoring modules with no boundary tests

Output ONLY a JSON array — no prose, no markdown fences:
[
  {
    "id": "DRY-<n>",
    "category": "DRY|CONSISTENCY|PATTERNS|OPTIMIZATIONS|MISSING_TESTS",
    "file": "relative/path.ts",
    "lineStart": 10,
    "lineEnd": 40,
    "description": "one sentence",
    "severity": "fix-now|fix-soon|low-priority",
    "recommendation": "one sentence"
  }
]`

async function callCopilot(pat: string, payload: string): Promise<Finding[]> {
  const res = await fetch('https://models.inference.ai.azure.com/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${pat}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: `${AUDIT_PROMPT}\n\n<files>\n${payload}\n</files>`,
        },
      ],
      temperature: 0,
    }),
  })

  if (!res.ok) {
    throw new Error(`Copilot API error: ${res.status} ${await res.text()}`)
  }

  const data = (await res.json()) as {
    choices: Array<{ message: { content: string } }>
  }
  const raw = data.choices[0]?.message?.content?.trim() ?? '[]'
  // Strip markdown code fences the model sometimes wraps around JSON
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
  try {
    return JSON.parse(cleaned) as Finding[]
  } catch {
    process.stderr.write(`  Warning: could not parse findings JSON from model response; skipping chunk\n`)
    return []
  }
}

function fingerprint(f: Finding): string {
  return createHash('sha256').update(f.file + f.lineStart + f.category).digest('hex')
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function main(): Promise<void> {
  const pat = process.env.COPILOT_TOKEN
  if (!pat) {
    process.stderr.write('Error: COPILOT_TOKEN environment variable is required\n')
    process.exit(1)
  }

  process.stderr.write('Collecting source files...\n')
  const files = collectFiles()
  process.stderr.write(`  ${files.length} files found\n`)

  const fileData = loadFiles(files)
  const chunks = buildChunks(fileData)
  process.stderr.write(`  Split into ${chunks.length} chunk(s)\n`)

  process.stderr.write('Running Copilot analysis...\n')

  const seen = new Set<string>()
  const allFindings: Finding[] = []

  for (let i = 0; i < chunks.length; i++) {
    const { payload, fileCount, estimatedTokens } = chunks[i]
    process.stderr.write(`  Chunk ${i + 1}/${chunks.length}: ${fileCount} files, ~${estimatedTokens} tokens\n`)

    if (i > 0) {
      // GitHub Models free tier: 40 000 tokens/min. Each chunk is ~6 000 tokens in + prompt +
      // response, so ~7 500 tokens/request → max ~5 requests/min → need ≥12 s between requests.
      await sleep(12_000)
    }

    const findings = await callCopilot(pat, payload)
    process.stderr.write(`    ${findings.length} findings returned\n`)

    for (const f of findings) {
      const fp = fingerprint(f)
      if (!seen.has(fp)) {
        seen.add(fp)
        allFindings.push(f)
      }
    }
  }

  process.stderr.write(`  ${allFindings.length} unique findings total\n`)

  const output = {
    date: new Date().toISOString().slice(0, 10),
    findings: allFindings,
    fingerprints: allFindings.map(fingerprint),
  }

  const outputPath = process.env.FINDINGS_OUTPUT ?? 'findings.json'
  writeFileSync(outputPath, JSON.stringify(output, null, 2))
  process.stderr.write(`Wrote ${allFindings.length} findings to ${outputPath}\n`)
}

// Only run main() when executed directly (not when imported by tests)
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(err => {
    process.stderr.write(`${String(err)}\n`)
    process.exit(1)
  })
}
