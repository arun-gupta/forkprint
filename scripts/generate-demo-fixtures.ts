/**
 * Fixture generator for the /demo route (issue #213).
 *
 * Runs the analyzer against a locked roster of 6 repos + 1 org (inventory,
 * top-5 repos analyzed for aggregation, governance signals) and writes
 * JSON fixtures to fixtures/demo/. Each fixture embeds a `generatedAt`
 * timestamp (ISO 8601) consumed by the in-app "Demo data · generated …"
 * banner.
 *
 * Usage:
 *   tsx scripts/generate-demo-fixtures.ts
 *
 * Env vars (tried in order):
 *   GITHUB_TOKEN_1, GITHUB_TOKEN_2, ...   (numbered — rotated)
 *   GITHUB_TOKENS                         (comma-separated)
 *   GITHUB_TOKEN                          (single)
 *   DEV_GITHUB_PAT                        (calibration scripts' PAT)
 */

import { loadEnvConfig } from '@next/env'
import { mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'

loadEnvConfig(process.cwd())

import { analyze } from '../lib/analyzer/analyze'
import { analyzeOrgInventory, type OrgRepoSummary } from '../lib/analyzer/org-inventory'
import { GET as twoFactorGET } from '../app/api/org/two-factor/route'
import { GET as staleAdminsGET } from '../app/api/org/stale-admins/route'
import { GET as memberPermissionGET } from '../app/api/org/member-permissions/route'
import type { TwoFactorEnforcementSection } from '../lib/governance/two-factor'
import type { StaleAdminsSection } from '../lib/governance/stale-admins'
import type { MemberPermissionDistributionSection } from '../lib/governance/member-permissions'

export const DEMO_REPOS = [
  'simonw/llm-echo',
  '333fred/compiler-developer-sdk',
  'ossf/security-insights-spec',
  'fluxcd/helm-controller',
  'projectcalico/calico',
  'prometheus/prometheus',
] as const

export const DEMO_ORG = 'ossf'
const DEMO_ORG_TOP_N = 5

const OUTPUT_DIR = join(process.cwd(), 'fixtures', 'demo')

function firstToken(): string {
  for (const [key, value] of Object.entries(process.env)) {
    if (/^GITHUB_TOKENS?_\d+$/i.test(key) && value?.trim()) return value.trim()
  }
  if (process.env.GITHUB_TOKENS) {
    const t = process.env.GITHUB_TOKENS.split(',').map((x) => x.trim()).filter(Boolean)
    if (t.length) return t[0]!
  }
  if (process.env.GITHUB_TOKEN?.trim()) return process.env.GITHUB_TOKEN.trim()
  if (process.env.DEV_GITHUB_PAT?.trim()) return process.env.DEV_GITHUB_PAT.trim()
  throw new Error('No GitHub token found. Set GITHUB_TOKEN_1..N, GITHUB_TOKENS, GITHUB_TOKEN, or DEV_GITHUB_PAT in .env.local.')
}

async function fetchTwoFactor(org: string, token: string): Promise<TwoFactorEnforcementSection> {
  const req = new Request(
    `http://localhost/api/org/two-factor?org=${encodeURIComponent(org)}&ownerType=Organization`,
    { headers: { Authorization: `Bearer ${token}` } },
  )
  const resp = await twoFactorGET(req)
  const body = (await resp.json()) as { section: TwoFactorEnforcementSection }
  return body.section
}

async function fetchStaleAdmins(org: string, token: string): Promise<StaleAdminsSection> {
  const req = new Request(
    `http://localhost/api/org/stale-admins?org=${encodeURIComponent(org)}&ownerType=Organization`,
    { headers: { Authorization: `Bearer ${token}` } },
  )
  const resp = await staleAdminsGET(req)
  const body = (await resp.json()) as { section: StaleAdminsSection }
  return body.section
}

async function fetchMemberPermissions(org: string, token: string): Promise<MemberPermissionDistributionSection> {
  const req = new Request(
    `http://localhost/api/org/member-permissions?org=${encodeURIComponent(org)}&ownerType=Organization`,
    { headers: { Authorization: `Bearer ${token}` } },
  )
  const resp = await memberPermissionGET(req)
  const body = (await resp.json()) as { section: MemberPermissionDistributionSection }
  return body.section
}

function pickTopReposByStars(results: OrgRepoSummary[], n: number): string[] {
  return results
    .filter((r) => !r.archived && !r.isFork)
    .filter((r) => typeof r.stars === 'number')
    .sort((a, b) => (b.stars as number) - (a.stars as number))
    .slice(0, n)
    .map((r) => r.repo)
}

async function main() {
  const token = firstToken()
  mkdirSync(OUTPUT_DIR, { recursive: true })
  const generatedAt = new Date().toISOString()

  // Repos — one analyze() call with all 6 so shape matches the /api/analyze response
  console.log(`[demo-fixtures] analyzing ${DEMO_REPOS.length} repos`)
  const reposResponse = await analyze({ repos: [...DEMO_REPOS], token })
  const reposPayload = { generatedAt, ...reposResponse }
  writeFileSync(
    join(OUTPUT_DIR, 'repositories.json'),
    JSON.stringify(reposPayload, null, 2) + '\n',
  )
  console.log(`[demo-fixtures] wrote repositories.json (${reposResponse.results.length} ok, ${reposResponse.failures.length} failed)`)

  // Org inventory
  console.log(`[demo-fixtures] analyzing org "${DEMO_ORG}"`)
  const orgResponse = await analyzeOrgInventory({ org: DEMO_ORG, token })

  // Top-N repos — run full analyzer so the demo org page can render the
  // aggregated Contributors / Activity / Responsiveness / Documentation /
  // Security / Recommendations tabs from real pre-computed data (#213).
  const topRepos = pickTopReposByStars(orgResponse.results, DEMO_ORG_TOP_N)
  console.log(`[demo-fixtures] analyzing top ${topRepos.length} ${DEMO_ORG} repos for aggregation:`, topRepos.join(', '))
  const topAnalysis = await analyze({ repos: topRepos, token })

  // Governance signals for the org
  console.log(`[demo-fixtures] fetching governance signals for "${DEMO_ORG}"`)
  const [twoFactor, staleAdmins, memberPermission] = await Promise.all([
    fetchTwoFactor(DEMO_ORG, token),
    fetchStaleAdmins(DEMO_ORG, token),
    fetchMemberPermissions(DEMO_ORG, token),
  ])

  // Sort results by repo name so the fixture diff only reflects real data
  // changes, not ordering churn caused by the API returning repos sorted by
  // pushedAt (which shifts every refresh).
  const sortedOrgResults = [...orgResponse.results].sort((a, b) =>
    a.repo.localeCompare(b.repo),
  )

  const orgPayload = {
    generatedAt,
    ...orgResponse,
    results: sortedOrgResults,
    governance: { twoFactor, staleAdmins, memberPermission },
    topReposAnalyzed: [...topAnalysis.results].sort((a, b) => a.repo.localeCompare(b.repo)),
  }
  writeFileSync(
    join(OUTPUT_DIR, `org-${DEMO_ORG}.json`),
    JSON.stringify(orgPayload, null, 2) + '\n',
  )
  console.log(`[demo-fixtures] wrote org-${DEMO_ORG}.json (${orgResponse.results.length} inventory, ${topAnalysis.results.length} analyzed, governance baked)`)

  // Manifest indexing what we just wrote
  const manifest = {
    generatedAt,
    repos: DEMO_REPOS,
    org: DEMO_ORG,
    orgTopReposAnalyzed: topRepos,
  }
  writeFileSync(join(OUTPUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n')
  console.log(`[demo-fixtures] wrote manifest.json`)
}

main().catch((error) => {
  console.error('[demo-fixtures] failed:', error)
  process.exit(1)
})
