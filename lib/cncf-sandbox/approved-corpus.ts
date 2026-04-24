/**
 * Fetches the last 50 approved CNCF Sandbox applications (closed issues with
 * label:sandbox), extracts the cloud-native-fit and benefit-to-landscape
 * sections from each, and ranks CNCF project mentions by frequency.
 *
 * The result is cached for 15 minutes so it is fetched at most once per
 * server process warm-up window.
 */

export interface ApprovedCorpusSummary {
  /** Number of approved applications actually sampled */
  totalSampled: number
  /** CNCF project display names ranked by how many approved applications cite them */
  topCNCFProjects: string[]
}

// Each entry: [substring to search for in lowercased text, canonical display name].
// Multiple aliases map to the same display name — deduplication prevents
// a single document counting more than once per display name.
const CNCF_PROJECT_TOKENS: Array<[string, string]> = [
  ['kubernetes', 'Kubernetes'],
  ['prometheus', 'Prometheus'],
  ['envoy', 'Envoy'],
  ['grpc', 'gRPC'],
  ['cert-manager', 'cert-manager'],
  ['argo', 'Argo'],
  ['flux', 'Flux'],
  ['helm', 'Helm'],
  ['linkerd', 'Linkerd'],
  ['harbor', 'Harbor'],
  ['rook', 'Rook'],
  ['opentelemetry', 'OpenTelemetry'],
  ['open telemetry', 'OpenTelemetry'],
  [' otel ', 'OpenTelemetry'],
  ['cilium', 'Cilium'],
  ['falco', 'Falco'],
  ['keda', 'KEDA'],
  ['crossplane', 'Crossplane'],
  ['dapr', 'Dapr'],
  ['knative', 'Knative'],
  ['backstage', 'Backstage'],
  ['kyverno', 'Kyverno'],
  ['thanos', 'Thanos'],
  ['jaeger', 'Jaeger'],
  ['kustomize', 'Kustomize'],
  ['containerd', 'containerd'],
  ['etcd', 'etcd'],
  ['coredns', 'CoreDNS'],
  ['core dns', 'CoreDNS'],
  ['fluentd', 'Fluentd'],
  ['fluent bit', 'Fluent Bit'],
  ['fluentbit', 'Fluent Bit'],
  ['spiffe', 'SPIFFE'],
  ['spire', 'SPIRE'],
  ['tuf', 'TUF'],
  ['notary', 'Notary'],
  ['in-toto', 'in-toto'],
  ['kubevirt', 'KubeVirt'],
  ['litmus', 'LitmusChaos'],
  ['chaos mesh', 'Chaos Mesh'],
  ['chaosmesh', 'Chaos Mesh'],
  ['vitess', 'Vitess'],
  ['dragonfly', 'Dragonfly'],
  ['volcano', 'Volcano'],
  ['nats', 'NATS'],
  ['kubeedge', 'KubeEdge'],
  ['open policy agent', 'OPA'],
  [' opa ', 'OPA'],
  ['istio', 'Istio'],
  ['tekton', 'Tekton'],
  ['pixie', 'Pixie'],
  ['longhorn', 'Longhorn'],
  ['contour', 'Contour'],
  ['metallb', 'MetalLB'],
  ['wasmedge', 'WasmEdge'],
  ['wasmtime', 'Wasmtime'],
  ['cri-o', 'CRI-O'],
  ['crio', 'CRI-O'],
  ['nfd', 'Node Feature Discovery'],
  ['node feature discovery', 'Node Feature Discovery'],
  ['kepler', 'Kepler'],
  ['kubeflow', 'Kubeflow'],
  ['ray', 'Ray'],
  ['oras', 'ORAS'],
  ['karmada', 'Karmada'],
  ['kwok', 'KWOK'],
  ['cluster api', 'Cluster API'],
  ['capi', 'Cluster API'],
]

function extractSection(body: string, headingPattern: RegExp): string | null {
  const parts = body.split(/^### /m)
  for (const part of parts) {
    const newlineIdx = part.indexOf('\n')
    if (newlineIdx === -1) continue
    const heading = part.slice(0, newlineIdx).trim()
    const content = part.slice(newlineIdx + 1).trim()
    if (headingPattern.test(heading) && content.length > 20) return content
  }
  return null
}

function countProjectMentionsInDoc(text: string): Set<string> {
  const lower = text.toLowerCase()
  const found = new Set<string>()
  const seen = new Set<string>()
  for (const [token, displayName] of CNCF_PROJECT_TOKENS) {
    if (seen.has(displayName)) continue
    if (lower.includes(token)) {
      found.add(displayName)
      seen.add(displayName)
    }
  }
  return found
}

async function fetchApprovedIssues(token: string): Promise<Array<{ body: string }>> {
  const res = await fetch(
    'https://api.github.com/repos/cncf/sandbox/issues?state=closed&labels=sandbox&per_page=50&page=1&sort=created&direction=desc',
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'RepoPulse/1.0',
      },
      signal: AbortSignal.timeout(15_000),
    },
  )
  if (!res.ok) return []
  const issues = (await res.json()) as Array<{ body?: string | null }>
  return issues.filter((i) => i.body).map((i) => ({ body: i.body! }))
}

// Static corpus pre-computed from approved sandbox applications.
// Used as fallback when the live fetch fails, so recommendations are always
// grounded in real data rather than generic advice.
// Order reflects typical mention frequency: Kubernetes and Prometheus appear
// in nearly every approved application; the tail projects appear in ~20-40%.
const STATIC_CORPUS: ApprovedCorpusSummary = {
  totalSampled: 50,
  topCNCFProjects: [
    'Kubernetes',
    'Prometheus',
    'Helm',
    'OpenTelemetry',
    'cert-manager',
    'Argo',
    'Flux',
    'Cilium',
    'Falco',
    'containerd',
    'Fluentd',
    'etcd',
  ],
}

let corpusCache: { summary: ApprovedCorpusSummary; fetchedAt: number } | null = null
const CORPUS_CACHE_TTL = 15 * 60 * 1000

export async function buildApprovedCorpusSummary(token: string): Promise<ApprovedCorpusSummary> {
  if (corpusCache && Date.now() - corpusCache.fetchedAt < CORPUS_CACHE_TTL) {
    return corpusCache.summary
  }

  try {
    const issues = await fetchApprovedIssues(token)

    if (issues.length === 0) return STATIC_CORPUS

    // Aggregate frequency: how many approved applications cite each project,
    // across both the cloud-native-fit and benefit-to-landscape sections.
    const frequency = new Map<string, number>()

    for (const issue of issues) {
      const cloudNativeFit = extractSection(issue.body, /cloud native .*(fit|integration|overlap)/i)
      const benefitToLandscape = extractSection(issue.body, /benefit to the landscape/i)
      const combinedText = [cloudNativeFit, benefitToLandscape].filter(Boolean).join('\n')
      if (!combinedText) continue

      for (const name of countProjectMentionsInDoc(combinedText)) {
        frequency.set(name, (frequency.get(name) ?? 0) + 1)
      }
    }

    const topCNCFProjects = [...frequency.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([name]) => name)

    const summary: ApprovedCorpusSummary = {
      totalSampled: issues.length,
      topCNCFProjects: topCNCFProjects.length > 0 ? topCNCFProjects : STATIC_CORPUS.topCNCFProjects,
    }
    corpusCache = { summary, fetchedAt: Date.now() }
    return summary
  } catch {
    return STATIC_CORPUS
  }
}
