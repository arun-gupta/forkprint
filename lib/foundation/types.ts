import type { FoundationTarget } from '@/lib/cncf-sandbox/types'

export type FoundationInputKind = 'repos' | 'org' | 'projects-board' | 'invalid'

export interface FoundationConfig {
  target: FoundationTarget
  label: string
  active: boolean
}

export const FOUNDATION_REGISTRY: FoundationConfig[] = [
  { target: 'cncf-sandbox',    label: 'CNCF Sandbox',     active: true  },
  { target: 'cncf-incubating', label: 'CNCF Incubating',  active: false },
  { target: 'cncf-graduation', label: 'CNCF Graduation',   active: false },
  { target: 'apache-incubator',label: 'Apache Incubator',  active: false },
]
