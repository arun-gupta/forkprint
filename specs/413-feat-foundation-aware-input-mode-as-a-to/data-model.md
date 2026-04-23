# Data Model: Foundation Input Mode (#413)

## Extended `FoundationTarget` type (`lib/cncf-sandbox/types.ts`)

```ts
export type FoundationTarget =
  | 'none'
  | 'cncf-sandbox'
  | 'cncf-incubating'
  | 'cncf-graduation'
  | 'apache-incubator'
```

## Foundation registry (`lib/foundation/types.ts`)

```ts
export type FoundationInputKind = 'repos' | 'org' | 'projects-board' | 'invalid'

export interface FoundationConfig {
  target: FoundationTarget
  label: string
  active: boolean  // false = disabled (coming soon)
}

export const FOUNDATION_REGISTRY: FoundationConfig[] = [
  { target: 'cncf-sandbox',    label: 'CNCF Sandbox',    active: true  },
  { target: 'cncf-incubating', label: 'CNCF Incubating', active: false },
  { target: 'cncf-graduation', label: 'CNCF Graduation',  active: false },
  { target: 'apache-incubator',label: 'Apache Incubator', active: false },
]
```

## Foundation input parse result (`lib/foundation/parse-foundation-input.ts`)

```ts
export type FoundationParseResult =
  | { kind: 'repos';          repos: string[] }
  | { kind: 'org';            org: string }
  | { kind: 'projects-board'; url: string }
  | { kind: 'invalid';        error: string }
```

## Foundation URL state (`lib/export/shareable-url.ts` extension)

```ts
export interface FoundationUrlState {
  foundation: FoundationTarget
  input: string   // raw input value (comma-separated repos or org slug)
}

// Encodes to: /?mode=foundation&foundation=cncf-sandbox&input=owner%2Frepo
export function encodeFoundationUrl(state: FoundationUrlState): string
export function decodeFoundationUrl(search: string): FoundationUrlState | null
```

## Foundation result state (local to `RepoInputClient`)

```ts
type FoundationResult =
  | { kind: 'repos'; results: AnalyzeResponse }
  | { kind: 'org';   inventory: OrgInventoryResponse }
  | null
```

No new persistent storage — all state is ephemeral (in-memory), consistent with the stateless architecture.
