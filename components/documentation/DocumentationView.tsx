'use client'

import { useState } from 'react'
import { ScoreBadge } from '@/components/metric-cards/ScoreBadge'
import { DocumentationScoreHelp } from '@/components/documentation/DocumentationScoreHelp'
import { TagPill, ActiveFilterBar } from '@/components/tags/TagPill'
import type { AnalysisResult, InclusiveNamingResult, LicensingResult } from '@/lib/analyzer/analysis-result'
import { getDocumentationScore } from '@/lib/documentation/score-config'
import { GOVERNANCE_DOC_FILES, LICENSING_IS_GOVERNANCE } from '@/lib/tags/governance'
import { COMMUNITY_DOC_FILES } from '@/lib/tags/community'
import { getDocFileTags, getReadmeSectionTags, LICENSING_IS_COMPLIANCE } from '@/lib/tags/tag-mappings'

interface DocumentationViewProps {
  results: AnalysisResult[]
  activeTag?: string | null
  onTagChange?: (tag: string | null) => void
}

const FILE_LABELS: Record<string, string> = {
  readme: 'README',
  license: 'LICENSE',
  contributing: 'CONTRIBUTING',
  code_of_conduct: 'CODE_OF_CONDUCT',
  security: 'SECURITY',
  changelog: 'CHANGELOG',
  issue_templates: 'Issue templates',
  pull_request_template: 'PR template',
  governance: 'GOVERNANCE',
}

const SECTION_LABELS: Record<string, string> = {
  description: 'Description / Overview',
  installation: 'Installation / Setup',
  usage: 'Usage / Examples',
  contributing: 'Contributing',
  license: 'License',
}

function getDocFileAllTags(name: string): string[] {
  const tags: string[] = []
  if (GOVERNANCE_DOC_FILES.has(name)) tags.push('governance')
  if (COMMUNITY_DOC_FILES.has(name)) tags.push('community')
  tags.push(...getDocFileTags(name))
  return tags
}

function LicensingPane({ licensingResult, activeTag, onTagClick }: { licensingResult: LicensingResult | 'unavailable'; activeTag: string | null; onTagClick: (tag: string) => void }) {
  if (licensingResult === 'unavailable') {
    return (
      <section aria-label="Licensing" className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500">Licensing & Compliance</h3>
        <p className="mt-3 text-sm text-slate-400">Licensing data unavailable.</p>
      </section>
    )
  }

  const { license, additionalLicenses, contributorAgreement } = licensingResult
  const hasLicense = license.spdxId !== null
  const isDualLicensed = additionalLicenses.length > 0

  return (
    <section aria-label="Licensing" className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500">Licensing & Compliance</h3>
        <span className="hidden sm:inline-flex sm:gap-1">
          {LICENSING_IS_GOVERNANCE ? <TagPill tag="governance" active={activeTag === 'governance'} onClick={onTagClick} /> : null}
          {LICENSING_IS_COMPLIANCE ? <TagPill tag="compliance" active={activeTag === 'compliance'} onClick={onTagClick} /> : null}
        </span>
      </div>
      <ul className="mt-3 space-y-2">
        {/* License detection */}
        <li className="flex items-start gap-2">
          <span className={`mt-0.5 text-sm ${hasLicense ? 'text-emerald-600' : 'text-red-400'}`}>
            {hasLicense ? '✓' : '✗'}
          </span>
          <div className="min-w-0">
            {hasLicense ? (
              <>
                <p className="text-sm font-medium text-slate-900">
                  {license.name} <span className="font-normal text-slate-400">({license.spdxId})</span>
                </p>
                {isDualLicensed ? (
                  <p className="mt-0.5 text-xs text-slate-500">Dual-licensed</p>
                ) : null}
              </>
            ) : (
              <p className="text-sm font-medium text-slate-400">No license detected</p>
            )}
          </div>
        </li>

        {/* Additional licenses */}
        {additionalLicenses.map((addLicense) => (
          <li key={addLicense.spdxId} className="flex items-start gap-2">
            <span className="mt-0.5 text-sm text-emerald-600">✓</span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-900">
                {addLicense.name ?? addLicense.spdxId} <span className="font-normal text-slate-400">({addLicense.spdxId})</span>
              </p>
              {addLicense.permissivenessTier ? (
                <p className="mt-0.5 text-xs text-slate-500">{addLicense.permissivenessTier}</p>
              ) : null}
            </div>
          </li>
        ))}

        {/* OSI Approval */}
        {hasLicense ? (
          <li className="flex items-start gap-2">
            <span className={`mt-0.5 text-sm ${license.osiApproved ? 'text-emerald-600' : 'text-amber-500'}`}>
              {license.osiApproved ? '✓' : '!'}
            </span>
            <p className={`text-sm font-medium ${license.osiApproved ? 'text-slate-900' : 'text-slate-400'}`}>
              {license.osiApproved ? 'OSI Approved' : 'Not OSI approved'}
            </p>
          </li>
        ) : null}

        {/* Permissiveness tier */}
        {license.permissivenessTier ? (
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-sm text-slate-400">·</span>
            <p className="text-sm font-medium text-slate-900">{license.permissivenessTier}</p>
          </li>
        ) : null}

        {/* DCO/CLA enforcement */}
        <li className="flex items-start gap-2">
          <span className={`mt-0.5 text-sm ${contributorAgreement.enforced ? 'text-emerald-600' : 'text-slate-400'}`}>
            {contributorAgreement.enforced ? '✓' : contributorAgreement.signedOffByRatio === null && !contributorAgreement.dcoOrClaBot ? '·' : '✗'}
          </span>
          <p className={`text-sm font-medium ${contributorAgreement.enforced ? 'text-slate-900' : 'text-slate-400'}`}>
            {contributorAgreement.enforced
              ? 'DCO/CLA enforcement detected'
              : contributorAgreement.signedOffByRatio === null && !contributorAgreement.dcoOrClaBot
                ? 'DCO/CLA enforcement not applicable'
                : 'DCO/CLA enforcement not detected'}
          </p>
        </li>
      </ul>
    </section>
  )
}

const SEVERITY_COLORS: Record<string, string> = {
  'Replace immediately': 'text-red-600',
  'Recommended to replace': 'text-amber-600',
  'Consider replacing': 'text-slate-500',
}

function InclusiveNamingPane({ inclusiveNamingResult }: { inclusiveNamingResult: InclusiveNamingResult | 'unavailable' }) {
  if (inclusiveNamingResult === 'unavailable') {
    return (
      <section aria-label="Inclusive Naming" className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500">Inclusive Naming</h3>
        <p className="mt-3 text-sm text-slate-400">Inclusive naming data unavailable.</p>
      </section>
    )
  }

  const { branchCheck, metadataChecks } = inclusiveNamingResult
  const allChecks = [branchCheck, ...metadataChecks]
  const failingChecks = allChecks.filter((c) => !c.passed)

  return (
    <section aria-label="Inclusive Naming" className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500">Inclusive Naming</h3>
      <ul className="mt-3 space-y-2">
        {/* Branch name check */}
        <li className="flex items-start gap-2">
          <span className={`mt-0.5 text-sm ${branchCheck.passed ? 'text-emerald-600' : 'text-red-400'}`}>
            {branchCheck.passed ? '✓' : '✗'}
          </span>
          <div className="min-w-0">
            <p className={`text-sm font-medium ${branchCheck.passed ? 'text-slate-900' : 'text-slate-400'}`}>
              Default branch: {inclusiveNamingResult.defaultBranchName ?? 'unknown'}
            </p>
            {!branchCheck.passed && branchCheck.severity ? (
              <p className={`mt-0.5 text-xs ${SEVERITY_COLORS[branchCheck.severity] ?? 'text-slate-500'}`}>
                {branchCheck.severity} — consider renaming to &lsquo;{branchCheck.replacements[0] ?? 'main'}&rsquo;
              </p>
            ) : null}
          </div>
        </li>

        {/* Metadata checks — show failing terms */}
        {metadataChecks.filter((c) => !c.passed).map((check) => (
          <li key={`${check.checkType}:${check.term}`} className="flex items-start gap-2">
            <span className="mt-0.5 text-sm text-red-400">✗</span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-400">
                &lsquo;{check.term}&rsquo; in {check.checkType}
              </p>
              {check.severity ? (
                <p className={`mt-0.5 text-xs ${SEVERITY_COLORS[check.severity] ?? 'text-slate-500'}`}>
                  {check.severity}
                  {check.replacements.length > 0 ? ` — use: ${check.replacements.slice(0, 3).join(', ')}` : ''}
                </p>
              ) : null}
            </div>
          </li>
        ))}

        {/* All clear message */}
        {failingChecks.length === 0 ? (
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-sm text-emerald-600">✓</span>
            <p className="text-sm font-medium text-slate-900">No non-inclusive terms detected</p>
          </li>
        ) : null}
      </ul>
      {failingChecks.length > 0 ? (
        <p className="mt-3 text-xs text-slate-400">
          Reference: <a href="https://inclusivenaming.org/" target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-600">inclusivenaming.org</a>
        </p>
      ) : null}
    </section>
  )
}

export function DocumentationView({ results, activeTag: externalTag, onTagChange }: DocumentationViewProps) {
  const [localTag, setLocalTag] = useState<string | null>(null)
  const activeTag = externalTag !== undefined ? externalTag : localTag
  const handleTagClick = (tag: string) => {
    const next = activeTag === tag ? null : tag
    if (onTagChange) onTagChange(next)
    else setLocalTag(next)
  }

  return (
    <section aria-label="Documentation view" className="space-y-6">
      {results.map((result) => {
        if (result.documentationResult === 'unavailable') {
          return (
            <div key={result.repo} className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="text-lg font-semibold text-slate-900">{result.repo}</h2>
              <p className="mt-2 text-sm text-slate-500">Documentation data unavailable.</p>
            </div>
          )
        }

        const score = getDocumentationScore(result.documentationResult, result.licensingResult, result.stars, result.inclusiveNamingResult)
        const { fileChecks, readmeSections } = result.documentationResult
        const filesFound = fileChecks.filter((f) => f.found).length
        const sectionsDetected = readmeSections.filter((s) => s.detected).length

        return (
          <div key={result.repo} className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{result.repo}</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {filesFound} of {fileChecks.length} files present · {sectionsDetected} of {readmeSections.length} README sections detected
                </p>
              </div>
              <div className="w-full md:max-w-xs">
                <ScoreBadge category="Documentation" value={score.value} tone={score.tone} />
              </div>
            </div>

            <DocumentationScoreHelp score={score} />

            {activeTag ? (
              <div className="mt-4">
                <ActiveFilterBar tag={activeTag} onClear={() => handleTagClick(activeTag)} />
              </div>
            ) : null}

            <div className="mt-6 grid gap-6 overflow-hidden md:grid-cols-2">
              {/* File presence */}
              {!activeTag || fileChecks.some((c) => getDocFileAllTags(c.name).includes(activeTag)) ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500">Documentation files</h3>
                  <ul className="mt-3 space-y-2">
                    {fileChecks
                      .filter((check) => !activeTag || getDocFileAllTags(check.name).includes(activeTag))
                      .map((check) => {
                        const tags = getDocFileAllTags(check.name)
                        return (
                          <li key={check.name} className="flex items-start gap-2">
                            <span className={`mt-0.5 text-sm ${check.found ? 'text-emerald-600' : 'text-red-400'}`}>
                              {check.found ? '✓' : '✗'}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className={`break-all text-sm font-medium ${check.found ? 'text-slate-900' : 'text-slate-400'}`}>
                                {FILE_LABELS[check.name] ?? check.name}
                                {check.found && check.path ? <span className="ml-1 font-normal text-slate-400">({check.path})</span> : null}
                                {tags.map((tag) => <span key={tag} className="hidden sm:inline"> <TagPill tag={tag} active={activeTag === tag} onClick={handleTagClick} /></span>)}
                              </p>
                              {!check.found ? (
                                <p className="mt-0.5 text-xs text-amber-700">
                                  {score.recommendations.find((r) => r.category === 'file' && r.item === check.name)?.text}
                                </p>
                              ) : null}
                            </div>
                          </li>
                        )
                      })}
                  </ul>
                </div>
              ) : null}

              {/* README sections — show when no filter or when contrib-ex is active */}
              {!activeTag || readmeSections.some((s) => getReadmeSectionTags(s.name).includes(activeTag)) ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500">README sections</h3>
                  <ul className="mt-3 space-y-2">
                    {readmeSections
                      .filter((section) => !activeTag || getReadmeSectionTags(section.name).includes(activeTag))
                      .map((section) => {
                        const tags = getReadmeSectionTags(section.name)
                        return (
                          <li key={section.name} className="flex items-start gap-2">
                            <span className={`mt-0.5 text-sm ${section.detected ? 'text-emerald-600' : 'text-red-400'}`}>
                              {section.detected ? '✓' : '✗'}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className={`text-sm font-medium ${section.detected ? 'text-slate-900' : 'text-slate-400'}`}>
                                {SECTION_LABELS[section.name] ?? section.name}
                                {tags.map((tag) => <span key={tag} className="hidden sm:inline"> <TagPill tag={tag} active={activeTag === tag} onClick={handleTagClick} /></span>)}
                              </p>
                              {!section.detected ? (
                                <p className="mt-0.5 text-xs text-amber-700">
                                  {score.recommendations.find((r) => r.category === 'readme_section' && r.item === section.name)?.text}
                                </p>
                              ) : null}
                            </div>
                          </li>
                        )
                      })}
                  </ul>
                </div>
              ) : null}

              {/* Licensing & Compliance — governance + compliance */}
              {!activeTag || activeTag === 'governance' || activeTag === 'compliance' ? (
                <LicensingPane licensingResult={result.licensingResult} activeTag={activeTag} onTagClick={handleTagClick} />
              ) : null}

              {/* Inclusive Naming — hide when any tag is filtering */}
              {!activeTag ? <InclusiveNamingPane inclusiveNamingResult={result.inclusiveNamingResult} /> : null}
            </div>
          </div>
        )
      })}
    </section>
  )
}
