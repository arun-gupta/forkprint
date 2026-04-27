/**
 * Auto-fix script for high-confidence fix-now tech-debt findings.
 *
 * Usage (in CI):
 *   COPILOT_TOKEN=<pat> TECH_DEBT_ISSUE=<issue#> npx tsx scripts/tech-debt-fix.ts
 *
 * Reads findings.json, picks the top MAX_FIX_PRS files with high-confidence
 * fix-now findings, asks the model to patch each file, then commits and opens
 * a draft PR per file referencing the tech-debt issue.
 */

import { execSync } from 'child_process'
import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'

const ROOT = process.cwd()
const MAX_FIX_PRS = 3
const MAX_FILE_CHARS = 24_000 // stay within model token budget

interface Finding {
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

  // MISSING_TESTS and OPTIMIZATIONS require creating new files or understanding
  // runtime behaviour — not safe to auto-patch source. Restrict to categories
  // where an in-place source edit is the correct fix.
  const AUTO_FIX_CATEGORIES = new Set(['DRY', 'CONSISTENCY', 'PATTERNS'])

  const candidates = (data.findings ?? []).filter(
    f => f.confidence === 'high' && f.severity === 'fix-now' && AUTO_FIX_CATEGORIES.has(f.category),
  )

  process.stderr.write(`  ${candidates.length} high-confidence fix-now candidates (DRY/CONSISTENCY/PATTERNS only)\n`)

  if (candidates.length === 0) {
    process.stderr.write('  Nothing to auto-fix.\n')
    return
  }

  // Group by file; take top MAX_FIX_PRS files (most findings first)
  const byFile = new Map<string, Finding[]>()
  for (const f of candidates) {
    const existing = byFile.get(f.file) ?? []
    existing.push(f)
    byFile.set(f.file, existing)
  }

  const topFiles = [...byFile.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, MAX_FIX_PRS)

  // Configure git identity for CI commits
  run('git config user.email "github-actions[bot]@users.noreply.github.com"')
  run('git config user.name "github-actions[bot]"')

  for (let i = 0; i < topFiles.length; i++) {
    const [filePath, findings] = topFiles[i]
    const primaryId = findings[0].id.toLowerCase().replace(/[^a-z0-9-]/g, '-')
    const branch = `tech-debt-autofix/${date}-${primaryId}`

    process.stderr.write(`\n  [${i + 1}/${topFiles.length}] ${filePath} (${findings.length} finding(s))\n`)

    if (i > 0) await sleep(12_000) // respect rate limit between API calls

    const fixedContent = await generateFix(pat, filePath, findings)
    if (!fixedContent) {
      process.stderr.write(`  Skipping ${filePath} — no fix generated\n`)
      continue
    }

    const original = readFileSync(filePath, 'utf8')
    if (fixedContent === original) {
      process.stderr.write(`  Skipping ${filePath} — model returned identical content\n`)
      continue
    }

    // Check if branch already exists remotely
    try {
      run(`git ls-remote --exit-code origin refs/heads/${branch}`)
      process.stderr.write(`  Branch ${branch} already exists, skipping\n`)
      continue
    } catch {
      // Branch doesn't exist — proceed
    }

    try {
      run(`git checkout -b ${branch}`)
      writeFileSync(filePath, fixedContent, 'utf8')
      run(`git add "${filePath}"`)

      const shortDesc = findings[0].description.slice(0, 60)
      run(`git commit -m "fix(tech-debt): ${findings[0].id} — ${shortDesc}"`)
      run(`git push origin ${branch}`)

      const findingLines = findings
        .map(f => `- **${f.id}** \`${f.file}:${f.lineStart}\` — ${f.description}`)
        .join('\n')

      const issueRef = issueNumber ? `\nCloses part of #${issueNumber}` : ''
      const prBody = [
        `Automated fix for **${findings.length}** high-confidence tech-debt finding(s) in \`${filePath}\`.`,
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
          --title "fix(tech-debt): ${findings[0].id} — ${shortDesc}" \
          --body-file - \
          --label techdebt \
          --label automated \
          --base ${baseBranch}`,
        { cwd: ROOT, input: prBody, stdio: ['pipe', 'inherit', 'inherit'], encoding: 'utf8' },
      )

      process.stderr.write(`  PR opened for ${filePath}\n`)
    } catch (err) {
      process.stderr.write(`  Error processing ${filePath}: ${String(err)}\n`)
    } finally {
      // Return to base branch for next iteration
      try {
        run(`git checkout ${baseBranch}`)
      } catch {
        run(`git checkout -f ${baseBranch}`)
      }
    }
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(err => {
    process.stderr.write(`${String(err)}\n`)
    process.exit(1)
  })
}
