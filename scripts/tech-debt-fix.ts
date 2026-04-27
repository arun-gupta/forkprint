/**
 * Auto-fix script for high-confidence fix-now tech-debt findings.
 *
 * Usage (in CI):
 *   COPILOT_TOKEN=<pat> TECH_DEBT_ISSUE=<issue#> npx tsx scripts/tech-debt-fix.ts
 *
 * Reads findings.json, partitions high-confidence fix-now findings into two
 * buckets (source fixes: DRY/CONSISTENCY/PATTERNS; missing tests: MISSING_TESTS),
 * and opens one consolidated PR per non-empty bucket.
 */

import { execSync } from 'child_process'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'

const ROOT = process.cwd()
const MAX_FILE_CHARS = 24_000 // stay within model token budget

export interface Finding {
  id: string
  category: string
  file: string
  lineStart: number
  lineEnd: number
  description: string
  severity: string
  confidence: string
  recommendation: string
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function run(cmd: string): string {
  return execSync(cmd, { cwd: ROOT, encoding: 'utf8' }).trim()
}

function stripFences(raw: string): string {
  return raw.replace(/^```[^\n]*\n?/m, '').replace(/\n?```$/m, '').trim()
}

async function generateFix(
  pat: string,
  filePath: string,
  findings: Finding[],
): Promise<string | null> {
  let content: string
  try {
    content = readFileSync(filePath, 'utf8')
  } catch {
    process.stderr.write(`  Cannot read ${filePath}\n`)
    return null
  }

  if (content.length > MAX_FILE_CHARS) {
    content = content.slice(0, MAX_FILE_CHARS) + '\n// [file truncated for context window]'
  }

  const findingsList = findings
    .map(
      f =>
        `  - ${f.id} (lines ${f.lineStart}–${f.lineEnd}): ${f.description}\n    Fix: ${f.recommendation}`,
    )
    .join('\n')

  const prompt = `You are a TypeScript/Next.js engineer applying a targeted tech-debt fix.

File: ${filePath}
Findings to fix:
${findingsList}

Rules:
- Apply ONLY the listed fixes. Do not refactor anything else.
- Preserve all existing behaviour, exports, and types.
- Return ONLY the complete corrected file content — no markdown fences, no commentary.

File content:
${content}`

  const res = await fetch('https://models.inference.ai.azure.com/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${pat}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0,
    }),
  })

  if (!res.ok) {
    process.stderr.write(`  Fix API error ${res.status} for ${filePath}\n`)
    return null
  }

  const data = (await res.json()) as { choices: Array<{ message: { content: string } }> }
  const raw = data.choices[0]?.message?.content?.trim() ?? ''
  return stripFences(raw) || null
}

export async function openSourceFixPR(
  pat: string,
  sourceCandidates: Finding[],
  baseBranch: string,
  date: string,
  issueNumber: string,
): Promise<void> {
  if (sourceCandidates.length === 0) return

  const branch = `tech-debt-autofix/${date}-source-fixes`

  try {
    run(`git ls-remote --exit-code origin refs/heads/${branch}`)
    process.stderr.write(`  Source-fix branch ${branch} already exists, skipping\n`)
    return
  } catch {
    // Branch doesn't exist — proceed
  }

  // Group by file
  const byFile = new Map<string, Finding[]>()
  for (const f of sourceCandidates) {
    const arr = byFile.get(f.file) ?? []
    arr.push(f)
    byFile.set(f.file, arr)
  }

  process.stderr.write(`\n  Generating source fixes for ${byFile.size} file(s)...\n`)

  const patched: Array<{ filePath: string; fixedContent: string; findings: Finding[] }> = []

  let i = 0
  for (const [filePath, findings] of byFile) {
    if (i > 0) await sleep(12_000)
    process.stderr.write(`  [${i + 1}/${byFile.size}] ${filePath} (${findings.length} finding(s))\n`)

    const fixedContent = await generateFix(pat, filePath, findings)
    if (!fixedContent) {
      process.stderr.write(`  Skipping ${filePath} — no fix generated\n`)
      i++
      continue
    }

    const original = readFileSync(filePath, 'utf8')
    if (fixedContent === original) {
      process.stderr.write(`  Skipping ${filePath} — model returned identical content\n`)
      i++
      continue
    }

    patched.push({ filePath, fixedContent, findings })
    i++
  }

  if (patched.length === 0) {
    process.stderr.write('  No source fixes to commit, skipping PR\n')
    return
  }

  try {
    run(`git checkout -b ${branch}`)

    for (const { filePath, fixedContent } of patched) {
      writeFileSync(filePath, fixedContent, 'utf8')
      run(`git add "${filePath}"`)
    }

    const totalFindings = patched.reduce((n, p) => n + p.findings.length, 0)
    run(`git commit -m "fix(tech-debt): ${totalFindings} high-confidence source fix(es) across ${patched.length} file(s)"`)
    run(`git push origin ${branch}`)

    const findingLines = patched
      .flatMap(({ filePath: fp, findings }) =>
        findings.map(f => `- **${f.id}** \`${fp}:${f.lineStart}\` — ${f.description}`),
      )
      .join('\n')

    const issueRef = issueNumber ? `\nCloses part of #${issueNumber}` : ''
    const prBody = [
      `Automated source fixes for **${totalFindings}** high-confidence tech-debt finding(s) across **${patched.length}** file(s) (DRY / CONSISTENCY / PATTERNS).`,
      '',
      findingLines,
      issueRef,
      '',
      '> ⚠️ Auto-generated — review the diff carefully before merging.',
      '',
      '🤖 Generated with [Claude Code](https://claude.com/claude-code)',
    ]
      .join('\n')
      .trim()

    execSync(
      `gh pr create \
        --title "fix(tech-debt): ${totalFindings} source fix(es) across ${patched.length} file(s)" \
        --body-file - \
        --label techdebt \
        --label automated \
        --base ${baseBranch}`,
      { cwd: ROOT, input: prBody, stdio: ['pipe', 'inherit', 'inherit'], encoding: 'utf8' },
    )

    process.stderr.write(`  Source-fix PR opened (${patched.length} file(s), ${totalFindings} finding(s))\n`)
  } catch (err) {
    process.stderr.write(`  Error creating source-fix PR: ${String(err)}\n`)
  } finally {
    try {
      run(`git checkout ${baseBranch}`)
    } catch {
      run(`git checkout -f ${baseBranch}`)
    }
  }
}

export function testFilePath(sourceFile: string): string {
  // lib/foo/bar.ts → lib/foo/bar.test.ts
  return sourceFile.replace(/\.tsx?$/, '') + '.test.ts'
}

async function generateTestFile(pat: string, sourceFile: string, findings: Finding[]): Promise<string | null> {
  let content: string
  try {
    content = readFileSync(sourceFile, 'utf8')
  } catch {
    process.stderr.write(`  Cannot read ${sourceFile}\n`)
    return null
  }

  if (content.length > MAX_FILE_CHARS) {
    content = content.slice(0, MAX_FILE_CHARS) + '\n// [file truncated for context window]'
  }

  const findingsList = findings
    .map(f => `  - ${f.id} (lines ${f.lineStart}–${f.lineEnd}): ${f.description}`)
    .join('\n')

  const prompt = `You are a TypeScript/Next.js engineer writing unit tests with Vitest.

The following functions in \`${sourceFile}\` are missing unit tests:
${findingsList}

Write a complete Vitest test file that covers these functions.

Rules:
- Use Vitest: import { describe, it, expect, vi } from 'vitest'
- Test only the listed functions — do not test private helpers
- Cover the happy path and at least one edge/error case per function
- Mock external dependencies (fetch, fs, database calls) with vi.mock or vi.fn()
- Return ONLY the complete test file content — no markdown fences, no commentary

Source file:
${content}`

  const res = await fetch('https://models.inference.ai.azure.com/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${pat}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0,
    }),
  })

  if (!res.ok) {
    process.stderr.write(`  Test-gen API error ${res.status} for ${sourceFile}\n`)
    return null
  }

  const data = (await res.json()) as { choices: Array<{ message: { content: string } }> }
  const raw = data.choices[0]?.message?.content?.trim() ?? ''
  return stripFences(raw) || null
}

export async function openMissingTestsPR(
  pat: string,
  testCandidates: Finding[],
  baseBranch: string,
  date: string,
  issueNumber: string,
): Promise<void> {
  if (testCandidates.length === 0) return

  const branch = `tech-debt-autofix/${date}-missing-tests`

  try {
    run(`git ls-remote --exit-code origin refs/heads/${branch}`)
    process.stderr.write(`  Missing-tests branch ${branch} already exists, skipping\n`)
    return
  } catch {
    // Branch doesn't exist — proceed
  }

  // Group by source file
  const byFile = new Map<string, Finding[]>()
  for (const f of testCandidates) {
    const arr = byFile.get(f.file) ?? []
    arr.push(f)
    byFile.set(f.file, arr)
  }

  process.stderr.write(`\n  Generating test files for ${byFile.size} source file(s)...\n`)

  const generated: Array<{ testPath: string; content: string; sourceFile: string; findings: Finding[] }> = []

  let i = 0
  for (const [sourceFile, findings] of byFile) {
    if (i > 0) await sleep(12_000)
    process.stderr.write(`  [${i + 1}/${byFile.size}] Generating tests for ${sourceFile}\n`)
    const content = await generateTestFile(pat, sourceFile, findings)
    if (content) {
      generated.push({ testPath: testFilePath(sourceFile), content, sourceFile, findings })
    }
    i++
  }

  if (generated.length === 0) {
    process.stderr.write('  No test files generated, skipping PR\n')
    return
  }

  try {
    run(`git checkout -b ${branch}`)

    const committed: Array<{ testPath: string; content: string; sourceFile: string; findings: Finding[] }> = []
    for (const entry of generated) {
      const { testPath, content } = entry
      if (existsSync(testPath)) {
        process.stderr.write(`  Skipping ${testPath} — file already exists\n`)
        continue
      }
      writeFileSync(testPath, content, 'utf8')
      run(`git add "${testPath}"`)
      committed.push(entry)
    }

    if (committed.length === 0) {
      process.stderr.write('  All test paths already exist, skipping PR\n')
      return
    }

    run(`git commit -m "test(tech-debt): add missing unit tests for ${committed.length} module(s)"`)
    run(`git push origin ${branch}`)

    const totalFindings = committed.reduce((n, g) => n + g.findings.length, 0)
    const fileLines = committed
      .map(({ testPath, findings }) => `- \`${testPath}\` — covers ${findings.map(f => f.id).join(', ')}`)
      .join('\n')

    const issueRef = issueNumber ? `\nCloses part of #${issueNumber}` : ''
    const prBody = [
      `Automated test generation for **${totalFindings}** high-confidence missing-test finding(s) across **${committed.length}** module(s).`,
      '',
      '## Test files added',
      '',
      fileLines,
      issueRef,
      '',
      '> ⚠️ Auto-generated — review test coverage and assertions before merging.',
      '',
      '🤖 Generated with [Claude Code](https://claude.com/claude-code)',
    ]
      .join('\n')
      .trim()

    execSync(
      `gh pr create \
        --title "test(tech-debt): add missing unit tests (${totalFindings} finding(s))" \
        --body-file - \
        --label techdebt \
        --label automated \
        --base ${baseBranch}`,
      { cwd: ROOT, input: prBody, stdio: ['pipe', 'inherit', 'inherit'], encoding: 'utf8' },
    )

    process.stderr.write(`  Missing-tests PR opened (${committed.length} test file(s))\n`)
  } catch (err) {
    process.stderr.write(`  Error creating missing-tests PR: ${String(err)}\n`)
  } finally {
    try {
      run(`git checkout ${baseBranch}`)
    } catch {
      run(`git checkout -f ${baseBranch}`)
    }
  }
}

const SOURCE_FIX_CATEGORIES = new Set(['DRY', 'CONSISTENCY', 'PATTERNS'])

export function partitionFindings(findings: Finding[]): {
  sourceCandidates: Finding[]
  testCandidates: Finding[]
} {
  const isHighFixNow = (f: Finding) => f.confidence === 'high' && f.severity === 'fix-now'
  return {
    sourceCandidates: findings.filter(f => isHighFixNow(f) && SOURCE_FIX_CATEGORIES.has(f.category)),
    testCandidates: findings.filter(f => isHighFixNow(f) && f.category === 'MISSING_TESTS'),
  }
}

async function main(): Promise<void> {
  const pat = process.env.COPILOT_TOKEN
  if (!pat) {
    process.stderr.write('COPILOT_TOKEN not set\n')
    process.exit(1)
  }

  const issueNumber = process.env.TECH_DEBT_ISSUE ?? ''
  const findingsPath = process.env.FINDINGS_OUTPUT ?? 'findings.json'
  const baseBranch = process.env.GITHUB_REF_NAME ?? 'main'
  const date = new Date().toISOString().slice(0, 10)

  const data = JSON.parse(readFileSync(findingsPath, 'utf8')) as {
    findings: Finding[]
  }

  const { sourceCandidates, testCandidates } = partitionFindings(data.findings ?? [])

  process.stderr.write(
    `  ${sourceCandidates.length} source-fix candidates (DRY/CONSISTENCY/PATTERNS), ` +
      `${testCandidates.length} missing-test candidates\n`,
  )

  if (sourceCandidates.length === 0 && testCandidates.length === 0) {
    process.stderr.write('  Nothing to auto-fix.\n')
    return
  }

  // Configure git identity for CI commits
  run('git config user.email "github-actions[bot]@users.noreply.github.com"')
  run('git config user.name "github-actions[bot]"')

  // --- Consolidated source-fix PR (all DRY / CONSISTENCY / PATTERNS findings) ---
  await openSourceFixPR(pat, sourceCandidates, baseBranch, date, issueNumber)

  // --- Consolidated missing-tests PR (all MISSING_TESTS findings) ---
  if (sourceCandidates.length > 0 && testCandidates.length > 0) {
    await sleep(12_000) // respect rate limit between the two PR jobs
  }
  await openMissingTestsPR(pat, testCandidates, baseBranch, date, issueNumber)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(err => {
    process.stderr.write(`${String(err)}\n`)
    process.exit(1)
  })
}
