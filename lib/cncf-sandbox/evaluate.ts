import type { AnalysisResult, DocumentationResult, ReleaseHealthResult } from '@/lib/analyzer/analysis-result'
import type { AspirantField, AspirantReadinessResult, CNCFLandscapeData, SandboxApplicationIssue, TAGRecommendation } from './types'
import { CNCF_AUTO_FIELDS, CNCF_HUMAN_FIELDS, CNCF_ALLOWED_SPDX_IDS } from './config'
import { isRepoInLandscape, findSandboxApplication } from './landscape'
import { recommendTAG } from './tag-recommender'

export function evaluateAspirant(
  result: AnalysisResult,
  landscapeData: CNCFLandscapeData | null,
  sandboxIssues?: SandboxApplicationIssue[],
  knownSandboxIssueNumber?: number,
): AspirantReadinessResult {
  const doc = result.documentationResult !== 'unavailable' ? result.documentationResult : null
  const release = result.releaseHealthResult && result.releaseHealthResult !== 'unavailable'
    ? result.releaseHealthResult as ReleaseHealthResult
    : null

  const alreadyInLandscape = landscapeData != null && isRepoInLandscape(result.repo, landscapeData)

  const autoFields: AspirantField[] = []

  for (const cfg of CNCF_AUTO_FIELDS) {
    const field = evaluateField(cfg.id, cfg.label, cfg.weight, cfg.homeTab, doc, result, release, landscapeData)
    autoFields.push(field)
  }

  // Sort by pointsEarned ascending so highest-impact missing items appear first in "Needs work"
  autoFields.sort((a, b) => a.pointsEarned - b.pointsEarned)

  const humanOnlyFields: AspirantField[] = CNCF_HUMAN_FIELDS.map((cfg) => ({
    id: cfg.id,
    label: cfg.label,
    status: 'human-only' as const,
    weight: 0,
    pointsEarned: 0,
    explanatoryNote: cfg.explanatoryNote,
  }))

  const readinessScore = Math.round(autoFields.reduce((sum, f) => sum + f.pointsEarned, 0))
  const readyCount = autoFields.filter((f) => f.status === 'ready').length
  const totalAutoCheckable = autoFields.length

  const tagRecommendation: TAGRecommendation = recommendTAG(
    result.topics ?? [],
    extractReadmeFirstParagraph(doc?.readmeContent ?? null),
  )

  const sandboxApplication = sandboxIssues
    ? (knownSandboxIssueNumber
        ? (sandboxIssues.find((i) => i.issueNumber === knownSandboxIssueNumber) ?? null)
        : findSandboxApplication(result.repo, sandboxIssues))
    : null

  return {
    foundationTarget: 'cncf-sandbox',
    readinessScore,
    autoFields,
    humanOnlyFields,
    readyCount,
    totalAutoCheckable,
    alreadyInLandscape,
    tagRecommendation,
    sandboxApplication,
  }
}

function evaluateField(
  id: string,
  label: string,
  weight: number,
  homeTab: string | undefined,
  doc: DocumentationResult | null,
  result: AnalysisResult,
  release: ReleaseHealthResult | null,
  landscapeData: CNCFLandscapeData | null,
): AspirantField {
  switch (id) {
    case 'roadmap': return evaluateRoadmap(label, weight, homeTab, doc)
    case 'contributing': return evaluateContributing(label, weight, homeTab, doc)
    case 'coc': return evaluateCoC(label, weight, homeTab, doc)
    case 'maintainers': return evaluateMaintainers(label, weight, homeTab, doc)
    case 'security': return evaluateSecurity(label, weight, homeTab, doc)
    case 'license': return evaluateLicense(label, weight, homeTab, result)
    case 'adopters': return evaluateAdopters(label, weight, homeTab, doc)
    case 'landscape': return evaluateLandscape(label, weight, result, landscapeData)
    case 'lfx': return evaluateLFX(label, weight)
    case 'contributor-diversity': return evaluateContributorDiversity(label, weight, homeTab, result)
    case 'project-activity': return evaluateProjectActivity(label, weight, homeTab, result, release)
    default: return { id, label, status: 'missing', weight, pointsEarned: 0, homeTab }
  }
}

function makeField(
  id: string,
  label: string,
  weight: number,
  homeTab: string | undefined,
  status: AspirantField['status'],
  extras?: Partial<AspirantField>,
): AspirantField {
  const pointsEarned =
    status === 'ready' ? weight : status === 'partial' ? weight * 0.5 : 0
  return { id, label, status, weight, pointsEarned: Math.round(pointsEarned * 10) / 10, homeTab, ...extras }
}

function evaluateRoadmap(label: string, weight: number, homeTab: string | undefined, doc: DocumentationResult | null): AspirantField {
  if (!doc) return makeField('roadmap', label, weight, homeTab, 'missing', { remediationHint: 'Create ROADMAP.md or add a Roadmap section to your README.' })

  if (doc.roadmapFile) return makeField('roadmap', label, weight, homeTab, 'ready')

  // Check README for a Roadmap heading
  const hasReadmRoadmap = doc.readmeContent?.match(/^#+\s*roadmap\b/im) != null
  if (hasReadmRoadmap) return makeField('roadmap', label, weight, homeTab, 'ready')

  return makeField('roadmap', label, weight, homeTab, 'missing', {
    remediationHint: 'Create a ROADMAP.md file or add a "## Roadmap" section to your README outlining planned milestones.',
  })
}

function evaluateContributing(label: string, weight: number, homeTab: string | undefined, doc: DocumentationResult | null): AspirantField {
  if (!doc) return makeField('contributing', label, weight, homeTab, 'missing', { remediationHint: 'Add a CONTRIBUTING.md file describing how to contribute. Use the CNCF template as a starting point: github.com/cncf/project-template/blob/main/CONTRIBUTING.md' })
  const found = doc.fileChecks.find((f) => f.name === 'contributing')?.found ?? false
  if (found) return makeField('contributing', label, weight, homeTab, 'ready')
  return makeField('contributing', label, weight, homeTab, 'missing', {
    remediationHint: 'Add a CONTRIBUTING.md file. Even a brief guide covering how to file issues and submit PRs significantly helps reviewer confidence. Use the CNCF template as a starting point: github.com/cncf/project-template/blob/main/CONTRIBUTING.md',
  })
}

function evaluateCoC(label: string, weight: number, homeTab: string | undefined, doc: DocumentationResult | null): AspirantField {
  if (!doc) return makeField('coc', label, weight, homeTab, 'missing', { remediationHint: 'Add a CODE_OF_CONDUCT.md referencing the Contributor Covenant. Use the CNCF template: github.com/cncf/project-template/blob/main/CODE_OF_CONDUCT.md' })
  const found = doc.fileChecks.find((f) => f.name === 'code_of_conduct')?.found ?? false
  if (!found) {
    return makeField('coc', label, weight, homeTab, 'missing', {
      remediationHint: 'Add a CODE_OF_CONDUCT.md referencing the Contributor Covenant (v1.x or v2.x) — required for CNCF Sandbox. Use the CNCF template: github.com/cncf/project-template/blob/main/CODE_OF_CONDUCT.md',
    })
  }
  const content = doc.cocContent
  const lower = content?.toLowerCase() ?? ''
  const recognized =
    content && (
      lower.includes('contributor covenant') ||
      lower.includes('contributor-covenant.org') ||
      // Projects that defer to the CNCF CoC (which itself is based on Contributor Covenant)
      lower.includes('cncf/foundation') ||
      lower.includes('cncf code of conduct') ||
      lower.includes('cncf community code of conduct') ||
      lower.includes('conduct@cncf.io') ||
      /cncf\.io\/(community\/)?code-of-conduct/i.test(content) ||
      // Projects that link to an org-level CoC on GitHub (transitive CNCF/CC delegation)
      /https?:\/\/github\.com\/[^)]+\/(?:CODE-OF-CONDUCT|CODE_OF_CONDUCT|code-of-conduct|code_of_conduct)/i.test(content) ||
      /\[.*code of conduct.*\]\(https?:\/\//i.test(content)
    )
  if (recognized) {
    return makeField('coc', label, weight, homeTab, 'ready')
  }
  return makeField('coc', label, weight, homeTab, 'partial', {
    remediationHint: content
      ? 'Code of Conduct file found but does not appear to reference the Contributor Covenant or CNCF Code of Conduct — CNCF requires one of these.'
      : 'Code of Conduct file found; verify it references the Contributor Covenant (v1.x or v2.x) or the CNCF Code of Conduct.',
  })
}

function evaluateMaintainers(label: string, weight: number, homeTab: string | undefined, doc: DocumentationResult | null): AspirantField {
  if (!doc) return makeField('maintainers', label, weight, homeTab, 'missing', { remediationHint: 'Add a MAINTAINERS.md or CODEOWNERS file listing project maintainers. CNCF provides governance templates including MAINTAINERS.md and GOVERNANCE.md at github.com/cncf/project-template' })
  if (doc.maintainersFile) return makeField('maintainers', label, weight, homeTab, 'ready')
  return makeField('maintainers', label, weight, homeTab, 'missing', {
    remediationHint: 'Add a MAINTAINERS.md or CODEOWNERS file. This demonstrates governance maturity and is checked by TOC reviewers. CNCF provides governance templates including MAINTAINERS.md and GOVERNANCE.md at github.com/cncf/project-template',
  })
}

function evaluateSecurity(label: string, weight: number, homeTab: string | undefined, doc: DocumentationResult | null): AspirantField {
  if (!doc) return makeField('security', label, weight, homeTab, 'missing', { remediationHint: 'Add a SECURITY.md file describing your vulnerability disclosure policy.' })
  const found = doc.fileChecks.find((f) => f.name === 'security')?.found ?? false
  if (found) return makeField('security', label, weight, homeTab, 'ready')
  return makeField('security', label, weight, homeTab, 'missing', {
    remediationHint: 'Add a SECURITY.md file with a vulnerability disclosure process. GitHub\'s security advisories can help — see docs.github.com/en/code-security.',
  })
}

function evaluateLicense(label: string, weight: number, homeTab: string | undefined, result: AnalysisResult): AspirantField {
  const licensing = result.licensingResult !== 'unavailable' ? result.licensingResult : null
  const spdxId = licensing?.license.spdxId ?? null

  if (!spdxId) {
    return makeField('license', label, weight, homeTab, 'missing', {
      remediationHint: 'No license detected. Add an Apache-2.0, MIT, BSD-2-Clause, BSD-3-Clause, ISC, or MPL-2.0 LICENSE file.',
    })
  }

  if (CNCF_ALLOWED_SPDX_IDS.has(spdxId)) {
    return makeField('license', label, weight, homeTab, 'ready')
  }

  return makeField('license', label, weight, homeTab, 'partial', {
    remediationHint: `License detected (${spdxId}) but not on CNCF's approved list. Approved licenses: Apache-2.0, MIT, BSD-2-Clause, BSD-3-Clause, ISC, MPL-2.0. See cncf.io/allowed-third-party-license-policy.`,
  })
}

function evaluateAdopters(label: string, weight: number, homeTab: string | undefined, doc: DocumentationResult | null): AspirantField {
  if (doc?.adoptersFile) return makeField('adopters', label, weight, homeTab, 'ready')
  return makeField('adopters', label, weight, homeTab, 'partial', {
    remediationHint:
      'CNCF does not require existing adopters, but you must address this field. Even "No public adopters yet; here is our plan" is acceptable. Every rejected application left this field blank without comment; every approved application addressed it.',
  })
}

function evaluateLandscape(label: string, weight: number, result: AnalysisResult, landscapeData: CNCFLandscapeData | null): AspirantField {
  if (!landscapeData) {
    return makeField('landscape', label, weight, undefined, 'partial', {
      remediationHint: 'Unable to verify CNCF landscape listing — check manually at landscape.cncf.io.',
    })
  }
  const inLandscape = isRepoInLandscape(result.repo, landscapeData)
  if (inLandscape) return makeField('landscape', label, weight, undefined, 'ready')
  // Landscape listing happens automatically post-acceptance — not actionable pre-application.
  // Use partial (not missing) so it appears informational rather than penalising the score.
  return makeField('landscape', label, 0, undefined, 'partial', {
    remediationHint: 'Not yet listed in the CNCF landscape. This is added automatically after Sandbox acceptance — no action needed here.',
  })
}

function evaluateLFX(label: string, weight: number): AspirantField {
  return {
    id: 'lfx',
    label,
    status: 'partial',
    weight,
    pointsEarned: 0,
    remediationHint:
      'CNCF requires projects to be listed on LFX Insights — verify manually at insights.linuxfoundation.org and submit a listing request if not yet present.',
  }
}

function diversityEvidence(entries: [string, number][], result: AnalysisResult): string {
  const totalCommits = entries.reduce((s, [, c]) => s + c, 0)
  const orgCount = entries.length
  const maxCommits = orgCount > 0 ? Math.max(...entries.map(([, c]) => c)) : 0
  const dominancePct = totalCommits > 0 ? Math.round((maxCommits / totalCommits) * 100) : 0

  const parts: string[] = [`${orgCount} org${orgCount === 1 ? '' : 's'}`]
  if (orgCount >= 1) {
    const topOrg = entries.sort((a, b) => b[1] - a[1])[0]?.[0] ?? ''
    parts.push(`${dominancePct}% from ${topOrg}`)
  }

  const authors90d = typeof result.uniqueCommitAuthors90d === 'number' ? result.uniqueCommitAuthors90d : null
  const commits90d = typeof result.commits90d === 'number' ? result.commits90d : null
  if (authors90d !== null) parts.push(`${authors90d} contributor${authors90d === 1 ? '' : 's'} (90d)`)
  else if (commits90d !== null) parts.push(`${commits90d} commits (90d)`)

  return parts.join(' · ')
}

function evaluateContributorDiversity(label: string, weight: number, homeTab: string | undefined, result: AnalysisResult): AspirantField {
  const orgCounts = result.commitCountsByExperimentalOrg
  if (orgCounts === 'unavailable' || typeof orgCounts !== 'object') {
    return makeField('contributor-diversity', label, weight, homeTab, 'partial', {
      remediationHint:
        'Contributor organizational diversity could not be verified — consider making org affiliations public on GitHub.',
    })
  }

  const entries = Object.entries(orgCounts)
  if (entries.length === 0) {
    return makeField('contributor-diversity', label, weight, homeTab, 'partial', {
      remediationHint:
        'Contributor organizational diversity could not be verified — consider making org affiliations public on GitHub.',
    })
  }

  const totalCommits = entries.reduce((s, [, c]) => s + c, 0)
  const orgCount = entries.length
  const evidence = diversityEvidence([...entries], result)

  if (orgCount === 1) {
    return makeField('contributor-diversity', label, weight, homeTab, 'partial', {
      evidence,
      remediationHint:
        'CNCF TOC reviewers check for single-vendor concentration — recruit contributors from additional organizations or document a concrete plan to do so.',
    })
  }

  const maxCommits = Math.max(...entries.map(([, c]) => c))
  const dominanceRatio = totalCommits > 0 ? maxCommits / totalCommits : 0

  if (orgCount === 2) {
    return makeField('contributor-diversity', label, weight, homeTab, 'partial', {
      evidence,
      remediationHint:
        'Only 2 contributor organizations detected — CNCF reviewers look for broader org diversity; recruiting contributors from a third organization strengthens the application.',
    })
  }

  if (dominanceRatio > 0.5) {
    return makeField('contributor-diversity', label, weight, homeTab, 'partial', {
      evidence,
      remediationHint:
        'Contributor count spans multiple organizations but one org dominates — document a diversity plan in the application.',
    })
  }

  return makeField('contributor-diversity', label, weight, homeTab, 'ready', { evidence })
}

function activityEvidence(commits90d: number | null, commits30d: number | null, totalReleases: number | null, totalTags: number | null): string {
  const parts: string[] = []
  if (commits90d !== null) parts.push(`${commits90d} commits (90d)`)
  if (commits30d !== null) parts.push(`${commits30d} commits (30d)`)
  if (totalReleases !== null) parts.push(`${totalReleases} release${totalReleases === 1 ? '' : 's'} (12mo)`)
  else if (totalTags !== null && totalTags > 0) parts.push(`${totalTags} tag${totalTags === 1 ? '' : 's'}, no GitHub Releases`)
  return parts.join(' · ')
}

function evaluateProjectActivity(
  label: string,
  weight: number,
  homeTab: string | undefined,
  result: AnalysisResult,
  release: ReleaseHealthResult | null,
): AspirantField {
  const commits90d = typeof result.commits90d === 'number' ? result.commits90d : null
  const commits30d = typeof result.commits30d === 'number' ? result.commits30d : null
  const totalReleases = release ? release.totalReleasesAnalyzed : null
  const totalTags = release && typeof release.totalTags === 'number' ? release.totalTags : null
  const ageInDays = typeof result.ageInDays === 'number' ? result.ageInDays : null

  const evidence = activityEvidence(commits90d, commits30d, totalReleases, totalTags) || undefined

  // New project < 6 months with no releases
  if (ageInDays !== null && ageInDays < 180 && (totalReleases === null || totalReleases === 0)) {
    return makeField('project-activity', label, weight, homeTab, 'partial', {
      evidence,
      remediationHint:
        'No formal releases yet; document your planned release cadence in the application — new projects are held to a different standard.',
    })
  }

  // Visibility gap: has tags but no formal GitHub Releases
  if (totalTags !== null && totalTags > 0 && (totalReleases === null || totalReleases === 0)) {
    return makeField('project-activity', label, weight, homeTab, 'partial', {
      evidence,
      remediationHint:
        "Your releases are not surfaced as GitHub Releases with release notes; TOC reviewers may perceive the project as less active than it is. This was a documented factor in the Reloader rejection (8-0 against). Convert your version tags to formal GitHub Releases.",
    })
  }

  const sufficientReleases = totalReleases !== null && totalReleases >= 4
  const sufficientCommits = commits90d !== null && commits90d >= 10

  if (sufficientReleases && sufficientCommits) {
    return makeField('project-activity', label, weight, homeTab, 'ready', { evidence })
  }

  if (totalReleases !== null && totalReleases >= 1 && totalReleases < 4) {
    return makeField('project-activity', label, weight, homeTab, 'partial', {
      evidence,
      remediationHint:
        'Fewer than 4 formal releases in the past year; proactively describe your release cadence in the application.',
    })
  }

  if (commits90d !== null && commits90d >= 1 && commits90d < 10) {
    return makeField('project-activity', label, weight, homeTab, 'partial', {
      evidence,
      remediationHint: 'Low recent commit activity may concern reviewers; note your maintenance approach in the application.',
    })
  }

  return makeField('project-activity', label, weight, homeTab, 'partial', {
    evidence,
    remediationHint:
      'Project activity signals are low — describe your release cadence and maintenance approach in the application.',
  })
}

function extractReadmeFirstParagraph(readmeContent: string | null): string {
  if (!readmeContent) return ''
  const lines = readmeContent.split('\n')
  const paragraphLines: string[] = []
  let inParagraph = false
  for (const line of lines) {
    const trimmed = line.trim()
    if (!inParagraph) {
      if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('!') && !trimmed.startsWith('<')) {
        inParagraph = true
        paragraphLines.push(trimmed)
      }
    } else {
      if (!trimmed) break
      paragraphLines.push(trimmed)
    }
  }
  return paragraphLines.join(' ').slice(0, 500)
}
