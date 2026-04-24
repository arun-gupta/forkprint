import type { FoundationTarget } from '@/lib/cncf-sandbox/types'

export type FoundationInputKind = 'repos' | 'org' | 'projects-board' | 'invalid'

export interface FoundationConfig {
  target: FoundationTarget
  label: string
  active: boolean
  tooltip: string
}

export const FOUNDATION_REGISTRY: FoundationConfig[] = [
  {
    target: 'cncf-sandbox',
    label: 'CNCF Sandbox',
    active: true,
    tooltip: 'Score repos against CNCF Sandbox due-diligence criteria. Enter one or more repos, or an org slug to rank all repos by readiness.',
  },
  {
    target: 'cncf-incubating',
    label: 'CNCF Incubating',
    active: false,
    tooltip: 'Check readiness for CNCF Incubating promotion. Coming soon.',
  },
  {
    target: 'cncf-graduation',
    label: 'CNCF Graduation',
    active: false,
    tooltip: 'Check readiness for CNCF Graduation. Coming soon.',
  },
  {
    target: 'apache-incubator',
    label: 'Apache Incubator',
    active: false,
    tooltip: 'Check readiness for Apache Software Foundation incubation. Coming soon.',
  },
]
