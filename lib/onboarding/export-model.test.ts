import { describe, expect, it } from 'vitest'
import { buildOnboardingExportModel } from './export-model'
import type { AnalysisResult } from '@/lib/analyzer/analysis-result'

const BASE: Partial<AnalysisResult> = {
  documentationResult: 'unavailable',
  goodFirstIssueCount: 'unavailable',
  devEnvironmentSetup: 'unavailable',
  gitpodPresent: 'unavailable',
  newContributorPRAcceptanceRate: 'unavailable',
}

describe('buildOnboardingExportModel', () => {
  it('maps all-unknown signals to status unknown', () => {
    const model = buildOnboardingExportModel(BASE as AnalysisResult)
    for (const signal of Object.values(model.signals)) {
      expect(signal.status).toBe('unknown')
    }
    expect(model.score.present).toBe(0)
    expect(model.score.total).toBe(9)
    expect(model.score.percentile).toBeNull()
  })

  it('maps present signals correctly', () => {
    const model = buildOnboardingExportModel({
      ...BASE,
      goodFirstIssueCount: 5,
      devEnvironmentSetup: true,
    } as AnalysisResult)
    expect(model.signals.good_first_issues.status).toBe('present')
    expect(model.signals.dev_environment_setup.status).toBe('present')
    expect(model.goodFirstIssueCount).toBe(5)
  })

  it('maps missing signals correctly', () => {
    const model = buildOnboardingExportModel({
      ...BASE,
      goodFirstIssueCount: 0,
    } as AnalysisResult)
    expect(model.signals.good_first_issues.status).toBe('missing')
  })

  it('captures gitpodBonus from gitpodPresent=true', () => {
    const model = buildOnboardingExportModel({
      ...BASE,
      gitpodPresent: true,
    } as AnalysisResult)
    expect(model.gitpodBonus).toBe(true)
  })

  it('gitpodBonus is false when gitpodPresent is not true', () => {
    const model = buildOnboardingExportModel({
      ...BASE,
      gitpodPresent: false,
    } as AnalysisResult)
    expect(model.gitpodBonus).toBe(false)
  })

  it('newContributorPRAcceptanceRate is unavailable when unset', () => {
    const model = buildOnboardingExportModel(BASE as AnalysisResult)
    expect(model.newContributorPRAcceptanceRate).toBe('unavailable')
  })

  it('captures newContributorPRAcceptanceRate when provided', () => {
    const model = buildOnboardingExportModel({
      ...BASE,
      newContributorPRAcceptanceRate: 0.75,
    } as AnalysisResult)
    expect(model.newContributorPRAcceptanceRate).toBe(0.75)
  })

  it('score.total is 9 (all signals)', () => {
    const model = buildOnboardingExportModel(BASE as AnalysisResult)
    expect(model.score.total).toBe(9)
  })
})
