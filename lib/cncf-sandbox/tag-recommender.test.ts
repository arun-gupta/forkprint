import { describe, it, expect } from 'vitest'
import { recommendTAG } from './tag-recommender'

// ---------------------------------------------------------------------------
// T035 — TAG Recommender
// ---------------------------------------------------------------------------

describe('T035 — recommendTAG', () => {
  it('T035-1: policy + rbac topics → tag-security, matchedSignals includes "policy"', () => {
    const result = recommendTAG(['policy', 'rbac'], '')
    expect(result.primaryTag).toBe('tag-security')
    expect(result.matchedSignals).toContain('policy')
    expect(result.fallbackNote).toBeNull()
  })

  it('T035-2: observability + monitoring → tag-operational-resilience', () => {
    const result = recommendTAG(['observability', 'monitoring'], '')
    expect(result.primaryTag).toBe('tag-operational-resilience')
    expect(result.fallbackNote).toBeNull()
  })

  it('T035-3: scheduler + gpu → tag-workloads-foundation', () => {
    const result = recommendTAG(['scheduler', 'gpu'], '')
    expect(result.primaryTag).toBe('tag-workloads-foundation')
    expect(result.fallbackNote).toBeNull()
  })

  it('T035-4: cni + ingress → tag-infrastructure', () => {
    const result = recommendTAG(['cni', 'ingress'], '')
    expect(result.primaryTag).toBe('tag-infrastructure')
    expect(result.fallbackNote).toBeNull()
  })

  it('T035-5: gitops + backstage → tag-developer-experience', () => {
    const result = recommendTAG(['gitops', 'backstage'], '')
    expect(result.primaryTag).toBe('tag-developer-experience')
    expect(result.fallbackNote).toBeNull()
  })

  it('T035-6: unknown topic → primaryTag null, fallbackNote non-null', () => {
    const result = recommendTAG(['unknown-thing'], 'nothing relevant')
    expect(result.primaryTag).toBeNull()
    expect(result.fallbackNote).toBeTruthy()
  })

  it('T035-7: policy + cni topics → tag-security wins (security before infrastructure)', () => {
    const result = recommendTAG(['policy', 'cni'], '')
    expect(result.primaryTag).toBe('tag-security')
  })

  it('T035-8: empty topics + readme about observability/tracing → tag-operational-resilience', () => {
    const result = recommendTAG([], 'This tool enables observability and tracing')
    expect(result.primaryTag).toBe('tag-operational-resilience')
    expect(result.fallbackNote).toBeNull()
  })
})
