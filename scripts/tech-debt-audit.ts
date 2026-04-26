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

const ROOT = process.cwd()
const MAX_PAYLOAD_BYTES = 200 * 1024

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

function buildPayload(files: string[]): string {
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

  const parts: string[] = []
  let total = 0
  for (const { relPath, content, size } of fileData) {
    if (total + size > MAX_PAYLOAD_BYTES) break
    parts.push(`// --- ${relPath} ---\n${content}`)
    total += size
  }
  return parts.join('\n\n')
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
  return JSON.parse(raw) as Finding[]
}

function fingerprint(f: Finding): string {
  return createHash('sha256').update(f.file + f.lineStart + f.category).digest('hex')
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

  const payload = buildPayload(files)
  process.stderr.write(`  Payload: ${payload.length} bytes\n`)

  process.stderr.write('Running Copilot analysis...\n')
  const findings = await callCopilot(pat, payload)
  process.stderr.write(`  ${findings.length} findings returned\n`)

  const output = {
    date: new Date().toISOString().slice(0, 10),
    findings,
    fingerprints: findings.map(fingerprint),
  }

  const outputPath = process.env.FINDINGS_OUTPUT ?? 'findings.json'
  writeFileSync(outputPath, JSON.stringify(output, null, 2))
  process.stderr.write(`Wrote ${findings.length} findings to ${outputPath}\n`)
}

main().catch(err => {
  process.stderr.write(`${String(err)}\n`)
  process.exit(1)
})
