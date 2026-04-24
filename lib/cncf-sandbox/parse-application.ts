import type { ApplicationFieldAssessment, ParsedApplicationField } from './types'
import type { ApprovedCorpusSummary } from './approved-corpus'
import { detectCorpusProjects } from './approved-corpus'

// Maps ### headings in the issue template to our human-only field IDs
const HEADING_TO_FIELD_ID: Array<[RegExp, string]> = [
  [/why cncf/i, 'why-cncf'],
  [/benefit to the landscape/i, 'benefit-to-landscape'],
  [/cloud native .fit|cloud native .integration|cloud native .overlap/i, 'cloud-native-fit'],
  [/business product or service to project separation/i, 'business-separation'],
  [/similar projects/i, 'similar-projects'],
  [/domain technical review/i, 'tag-engagement'],
  [/application contact email/i, 'contact-email'],
  [/contributing or sponsoring entity signatory/i, 'signatory'],
  [/cncf contacts/i, 'cncf-contacts'],
  [/require a license exception/i, 'license-exception'],
  [/trademark and accounts|ip policy/i, 'trademark-ip'],
]

const EMPTY_VALUES = new Set(['n/a', '_no response_', 'no response', 'none', ''])

function isEffectivelyEmpty(content: string): boolean {
  const lower = content.trim().toLowerCase().replace(/[_*`]/g, '')
  return EMPTY_VALUES.has(lower) || lower.length === 0
}

function extractSections(body: string): Map<string, string> {
  const sections = new Map<string, string>()
  // Split on ### headings
  const parts = body.split(/^### /m)
  for (const part of parts) {
    const newlineIdx = part.indexOf('\n')
    if (newlineIdx === -1) continue
    const heading = part.slice(0, newlineIdx).trim()
    const content = part.slice(newlineIdx + 1).trim()
    sections.set(heading, content)
  }
  return sections
}

function fieldIdFromHeading(heading: string): string | null {
  for (const [pattern, fieldId] of HEADING_TO_FIELD_ID) {
    if (pattern.test(heading)) return fieldId
  }
  return null
}

function fieldPatternPct(
  corpus: ApprovedCorpusSummary | undefined,
  fieldId: string,
  patternLabel: string,
): { pct: number; total: number } | null {
  const stats = corpus?.fieldStats?.[fieldId]
  if (!stats || stats.totalSampled === 0) return null
  const p = stats.patterns.find((x) => x.label === patternLabel)
  if (!p) return null
  return { pct: p.pct, total: stats.totalSampled }
}

function corpusProjectHint(
  corpus: ApprovedCorpusSummary | undefined,
  content: string,
  take = 4,
): string {
  if (!corpus || corpus.topCNCFProjects.length === 0) return ''

  const mentioned = detectCorpusProjects(content)

  // Projects the applicant already cited that appear in the approved corpus
  const alreadyCited = corpus.topCNCFProjects.filter((p) => mentioned.has(p.name))

  // Top projects from the corpus that the applicant has NOT yet cited
  const missing = corpus.topCNCFProjects
    .filter((p) => !mentioned.has(p.name))
    .slice(0, take)

  if (missing.length === 0) return ''

  const missingStr = missing.map((p) => `${p.name} (${p.pct}%)`).join(', ')

  if (alreadyCited.length > 0) {
    const citedStr = alreadyCited.map((p) => `${p.name} (${p.pct}% of last ${corpus.totalSampled})`).join(', ')
    return ` You named ${citedStr} — good. Among the last ${corpus.totalSampled} approved sandbox projects, commonly cited projects you haven't mentioned include: ${missingStr}.`
  }

  return ` Among the last ${corpus.totalSampled} approved sandbox projects, the most commonly cited were: ${missingStr}.`
}

function assessAndRecommend(
  fieldId: string,
  content: string,
  corpus?: ApprovedCorpusSummary,
): { assessment: ApplicationFieldAssessment; recommendation: string | null } {
  if (isEffectivelyEmpty(content)) {
    return {
      assessment: 'empty',
      recommendation: getEmptyRecommendation(fieldId),
    }
  }

  const lower = content.toLowerCase()
  const wordCount = content.trim().split(/\s+/).length

  switch (fieldId) {
    case 'why-cncf': {
      const hasGovernance = /governance|vendor.neutral|multi.stakeholder|neutral/i.test(content)
      const hasSpecifics = /tag|working group|toc|adjacent|alongside/i.test(content)
      const hasCommercial = /commercial exposure|visibility|marketing|brand/i.test(content)
      if (hasCommercial) {
        return { assessment: 'weak', recommendation: "Remove commercial-motivation language — citing visibility or marketing as primary drivers is a documented rejection factor. Focus on governance benefit and ecosystem fit." }
      }
      if (hasGovernance && hasSpecifics && wordCount > 60) return { assessment: 'strong', recommendation: null }
      if (hasGovernance && wordCount > 30) {
        const tagStat = fieldPatternPct(corpus, 'why-cncf', 'names a specific TAG or working group')
        const tagHint = tagStat ? `${tagStat.pct}% of the last ${tagStat.total} approved applications named a specific TAG or working group. ` : ''
        return { assessment: 'adequate', recommendation: `${tagHint}Strengthen by identifying where this project fits in the CNCF technical landscape — name the relevant TAG or working group, and explain why now is the right time to apply.` }
      }
      const govStat = fieldPatternPct(corpus, 'why-cncf', 'mentions governance or vendor neutrality')
      const govHint = govStat ? `${govStat.pct}% of the last ${govStat.total} approved applications cited governance or vendor neutrality as the primary benefit. ` : ''
      return { assessment: 'weak', recommendation: `${govHint}Name a concrete governance benefit (not just 'visibility'), identify the relevant TAG or working group, and explain the timing.` }
    }

    case 'benefit-to-landscape': {
      // Should name 2+ CNCF projects and answer from ecosystem perspective
      const cncfProjectMentions = (content.match(/\b(kubernetes|prometheus|envoy|grpc|fluentd|jaeger|vitess|argo|flux|helm|linkerd|harbor|rook|cert-manager|opa|spiffe|cortex|thanos|dragonfly|keda|crossplane|cluster api|open cluster management|kcp|backstage|dapr|knative|notary|falco|chaos mesh|litmus|opentelemetry|openmetrics|kyverno|pixie|slime|emissary|curiefense|porter|nocalhost|superedge|wasm|krustlet|aeraki|sealer|opensergo|kube-ovn|cilium|longhorn|contour|tekton|istio)\b/gi) ?? []).length
      const hint = corpusProjectHint(corpus, content)
      if (cncfProjectMentions >= 2 && wordCount > 40) return { assessment: 'strong', recommendation: null }
      if (cncfProjectMentions >= 1) return { assessment: 'adequate', recommendation: `Name at least 2 existing CNCF projects that become more complete or valuable in combination with yours, and describe how.${hint}` }
      return { assessment: 'weak', recommendation: `Answer from the ecosystem's perspective: what was absent or broken before this project? Name 2+ CNCF projects that benefit from combining with yours.${hint}` }
    }

    case 'cloud-native-fit': {
      const cncfMentions = (content.match(/\b(kubernetes|cncf|prometheus|envoy|opentelemetry|kcp|crossplane|cert-manager|argo|flux|helm|linkerd|keda|dapr|knative|opa|falco|cilium|tekton|istio|longhorn|contour|harbor|kyverno|thanos|jaeger|backstage|fluentd|containerd|etcd|coredns|spiffe|spire)\b/gi) ?? []).length
      const hint = corpusProjectHint(corpus, content)
      if (cncfMentions >= 4 && wordCount > 80) return { assessment: 'strong', recommendation: null }
      if (cncfMentions >= 2) return { assessment: 'adequate', recommendation: `Name 4–8 CNCF projects with a one-line architectural relationship each (data plane, API consumer, plugin extension, etc.). 'Runs on Kubernetes' is insufficient.${hint}` }
      return { assessment: 'weak', recommendation: `This is the field most often flagged by reviewers. Name 4–8 CNCF projects and describe the specific technical relationship for each — not just 'compatible' or 'runs on Kubernetes'.${hint}` }
    }

    case 'business-separation': {
      const isNa = /^\s*n\/a\s*$/i.test(content.trim())
      // Detect explicit statements that there is no commercial tie of any kind
      const noCommercialTie =
        /no commercial/i.test(content) ||
        /no (product|service|business) (tie|connection|relation|affiliation|link)/i.test(content) ||
        /no ties? to (any )?(commercial|corporate|vendor|company|business)/i.test(content) ||
        /not (related|associated|tied|connected|backed|funded|sponsored|owned|driven) (to|by) any (commercial|corporate|vendor|company|product|business|entity)/i.test(content) ||
        /unrelated to any (product|service|commercial)/i.test(content) ||
        /no (company|corporate|vendor|commercial) (backing|sponsor|funding|affiliation)/i.test(content) ||
        /(?:purely|entirely|solely|completely) (?:open.?source|community|independent|volunteer)/i.test(content) ||
        /(?:independent|community.driven|volunteer.driven|community.led|community.owned) (?:project|initiative|effort)/i.test(content) ||
        /no (commercial|corporate|vendor) (entity|interest|involvement|affiliation)/i.test(content) ||
        /not (for.profit|commercially (driven|motivated|backed))/i.test(content)

      if (noCommercialTie) {
        // "n/a" alone is minimal — just adequate; a real statement is strong
        if (isNa) {
          return { assessment: 'adequate', recommendation: "Rather than N/A, explicitly state that no commercial product is based on this project — a one-sentence statement pre-empts reviewer questions." }
        }
        return { assessment: 'strong', recommendation: null }
      }
      const hasSeparation = /separate|distinct|extension point|different roadmap|open.?source/i.test(content)
      if (hasSeparation && wordCount > 40) return { assessment: 'strong', recommendation: null }
      return { assessment: 'weak', recommendation: "Name the commercial product explicitly, explain governance separation, and describe how the commercial product uses the OSS project (ideally through extension points, not direct distribution)." }
    }

    case 'similar-projects': {
      if (/n\/a/i.test(content) || /no similar/i.test(content) || /no overlap/i.test(content)) {
        return {
          assessment: 'weak',
          recommendation: "Claiming no overlap when obvious comparators may exist damages credibility. Search the CNCF landscape for your category and address each one — even if the overlap is architectural rather than functional.",
        }
      }
      const projectMentions = (content.match(/\b[A-Z][a-zA-Z-]+\b/g) ?? []).length
      if (projectMentions >= 3 && wordCount > 60) return { assessment: 'strong', recommendation: null }
      const simStat = fieldPatternPct(corpus, 'similar-projects', 'names 3 or more comparable projects')
      const simHint = simStat ? `${simStat.pct}% of the last ${simStat.total} approved applications named 3 or more comparable projects. ` : ''
      return { assessment: 'adequate', recommendation: `${simHint}Name every CNCF project a reviewer could find in your category and write one sentence explaining the architectural or capability difference for each.` }
    }

    case 'tag-engagement': {
      const hasEngagement = /tag|presented|meeting|slack|chair|review/i.test(content)
      if (!hasEngagement || lower === '_no response_' || lower === 'no response') {
        const engageStat = fieldPatternPct(corpus, 'tag-engagement', 'has a TAG presentation or meeting')
        const engageHint = engageStat ? `${engageStat.pct}% of the last ${engageStat.total} approved applications had an actual TAG presentation or meeting. ` : ''
        return {
          assessment: 'empty',
          recommendation: `${engageHint}Contact the relevant TAG chairs on CNCF Slack to request a presentation slot before your TOC vote.`,
        }
      }
      if (/presented|meeting|reviewed/i.test(content)) return { assessment: 'strong', recommendation: null }
      return { assessment: 'adequate', recommendation: "Confirm you have a scheduled or completed TAG presentation — 'intend to present' carries less weight than 'presented on [date]'." }
    }

    case 'cncf-contacts': {
      const hasNamedContact = /@\w+|toc member|tag lead|ambassador/i.test(content)
      if (!hasNamedContact && wordCount < 10) {
        return { assessment: 'weak', recommendation: "Name a specific person (TOC member, TAG lead, or CNCF Ambassador) who knows your project. Projects with named contacts have shorter review cycles." }
      }
      if (hasNamedContact) return { assessment: 'strong', recommendation: null }
      return { assessment: 'adequate', recommendation: null }
    }

    case 'license-exception': {
      if (/no |apache|mit|bsd/i.test(lower)) return { assessment: 'strong', recommendation: null }
      if (wordCount < 5) return { assessment: 'weak', recommendation: "Explicitly state whether any dependency uses a non-allowlist license. Proactive disclosure is valued; silence on known IP issues is a rejection risk." }
      return { assessment: 'adequate', recommendation: null }
    }

    case 'contact-email': {
      const hasEmail = /\S+@\S+\.\S+/.test(content)
      if (hasEmail) return { assessment: 'strong', recommendation: null }
      return { assessment: 'weak', recommendation: "Provide at least one valid email address for the primary submitter." }
    }

    case 'signatory':
    case 'trademark-ip': {
      if (wordCount >= 3) return { assessment: 'strong', recommendation: null }
      return { assessment: 'weak', recommendation: null }
    }

    default: {
      if (wordCount < 5) return { assessment: 'weak', recommendation: null }
      if (wordCount > 20) return { assessment: 'strong', recommendation: null }
      return { assessment: 'adequate', recommendation: null }
    }
  }
}

function getEmptyRecommendation(fieldId: string): string {
  const map: Record<string, string> = {
    'why-cncf': "This field is required and cannot be blank. Name a specific governance benefit, the relevant CNCF technical context (TAGs, adjacent projects), and why now is the right time.",
    'benefit-to-landscape': "Required. Answer from the ecosystem's perspective — what was absent before this project? Name 2+ CNCF projects that become more valuable alongside yours.",
    'cloud-native-fit': "Required and heavily weighted by reviewers. Name 4–8 CNCF projects and describe the one-line architectural relationship for each.",
    'business-separation': "If no commercial product exists, state that explicitly. If one does, describe governance separation — do not leave blank.",
    'similar-projects': "Leaving this blank is a red flag. Search the CNCF landscape for your category and address each project you find, even if you believe there is no overlap.",
    'tag-engagement': "Critical gap. Contact the relevant TAG chairs on CNCF Slack to schedule a presentation before the TOC vote.",
    'cncf-contacts': "Name a specific CNCF contact (TOC member, TAG lead, or Ambassador). A blank contact field correlates with longer review cycles.",
    'license-exception': "State explicitly — Yes (with dependency names and licenses) or No.",
    'contact-email': "Provide at least one contact email for the primary submitter.",
    'signatory': "Provide the legal entity name and representative who will sign the CNCF contribution agreement.",
    'trademark-ip': "Confirm agreement with CNCF IP policy and trademark guidelines.",
  }
  return map[fieldId] ?? "This field appears to be blank — review the CNCF application template and provide a complete answer."
}

export function parseApplicationIssue(body: string, corpus?: ApprovedCorpusSummary): ParsedApplicationField[] {
  const sections = extractSections(body)
  const fieldMap = new Map<string, { content: string; heading: string }>()

  // Collect all sections, merging cloud-native subfields
  for (const [heading, content] of sections) {
    const fieldId = fieldIdFromHeading(heading)
    if (!fieldId) continue

    const existing = fieldMap.get(fieldId)
    if (existing) {
      // Merge cloud-native subfields
      if (!isEffectivelyEmpty(content)) {
        fieldMap.set(fieldId, { content: existing.content + '\n\n' + content, heading: existing.heading })
      }
    } else {
      fieldMap.set(fieldId, { content, heading })
    }
  }

  const results: ParsedApplicationField[] = []
  const targetFieldIds = [
    'why-cncf',
    'benefit-to-landscape',
    'cloud-native-fit',
    'business-separation',
    'similar-projects',
    'tag-engagement',
    'cncf-contacts',
    'license-exception',
    'contact-email',
    'signatory',
    'trademark-ip',
  ]

  for (const fieldId of targetFieldIds) {
    const entry = fieldMap.get(fieldId)
    const content = entry?.content?.trim() ?? null
    const effectiveContent = content && !isEffectivelyEmpty(content) ? content : null

    const { assessment, recommendation } = assessAndRecommend(fieldId, effectiveContent ?? '', corpus)

    results.push({ fieldId, content: effectiveContent, assessment, recommendation })
  }

  return results
}
