import type { CNCFTag, TAGRecommendation } from './types'

type TagRule = {
  tag: CNCFTag
  keywords: string[]
}

// Priority-ordered per FR-014 — first match wins
const TAG_RULES: TagRule[] = [
  {
    tag: 'tag-security',
    keywords: [
      'policy', 'authorization', 'rbac', 'abac', 'oidc', 'oauth', 'sbom',
      'provenance', 'attestation', 'supply-chain', 'signing', 'cve',
      'compliance', 'audit', 'zero-trust',
    ],
  },
  {
    tag: 'tag-operational-resilience',
    keywords: [
      'observability', 'monitoring', 'prometheus', 'opentelemetry', 'tracing',
      'logging', 'alerting', 'backup', 'restore', 'disaster-recovery', 'cost',
      'finops', 'reliability', 'sre', 'troubleshooting',
    ],
  },
  {
    tag: 'tag-workloads-foundation',
    keywords: [
      'scheduler', 'batch', 'runtime', 'oci', 'cri', 'unikernel', 'autoscale',
      'scale-to-zero', 'gang-scheduling', 'gpu', 'dra', 'resource-allocation',
      'workload', 'hpc',
    ],
  },
  {
    tag: 'tag-infrastructure',
    keywords: [
      'cni', 'csi', 'network', 'storage', 'service-mesh', 'dns',
      'load-balancer', 'iac', 'terraform', 'edge', 'host-network', 'node',
      'cluster-infrastructure', 'ingress',
    ],
  },
  {
    tag: 'tag-developer-experience',
    keywords: [
      'developer-platform', 'idp', 'backstage', 'microservices', 'streaming',
      'kafka', 'messaging', 'database', 'api-gateway', 'developer-portal',
      'gitops', 'scaffolding',
    ],
  },
]

export function recommendTAG(topics: string[], readmeFirstParagraph: string): TAGRecommendation {
  const haystack = [
    ...topics.map((t) => t.toLowerCase()),
    readmeFirstParagraph.toLowerCase(),
  ].join(' ')

  for (const rule of TAG_RULES) {
    const matched = rule.keywords.filter((kw) => haystack.includes(kw))
    if (matched.length > 0) {
      return {
        primaryTag: rule.tag,
        matchedSignals: matched,
        fallbackNote: null,
      }
    }
  }

  return {
    primaryTag: null,
    matchedSignals: [],
    fallbackNote:
      'Review the TAG charters at contribute.cncf.io/community/tags/ to select the most relevant TAG for your project domain.',
  }
}
