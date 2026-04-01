# Research: Deployment

## Decision 1: Keep Vercel as the only Phase 1 deployment target

- **Decision**: Scope `P1-F03` to Vercel deployment only.
- **Rationale**: Both `docs/PRODUCT.md` and the constitution define Vercel as the Phase 1 hosting model, and broadening to self-hosted or Docker deployment would expand scope beyond the accepted contract.
- **Alternatives considered**:
  - Add Docker/self-hosted setup now: rejected because it is explicitly out of scope for `P1-F03`
  - Abstract deployment across multiple providers: rejected because Phase 1 requires a zero-config Vercel path

## Decision 2: Treat server-side `GITHUB_TOKEN` as the shared-deployment source of truth

- **Decision**: Preserve the existing behavior where `process.env.GITHUB_TOKEN` controls the shared-deployment token path and hides the PAT input field.
- **Rationale**: This is already the user-facing contract for `P1-F02` and `P1-F03`, and it matches the constitution’s precedence rules.
- **Alternatives considered**:
  - Always show the PAT field even when a server token exists: rejected because it conflicts with the product definition
  - Prefer client PAT over server token: rejected because it conflicts with the constitution and deployment acceptance criteria

## Decision 3: Keep deployment work documentation-heavy and architecture-light

- **Decision**: Prefer README / `.env.example` / verification updates over adding new runtime deployment code unless a real Vercel blocker is found.
- **Rationale**: The app already follows standard Next.js patterns, so deployment readiness is mostly about verification and safe environment configuration rather than new infrastructure code.
- **Alternatives considered**:
  - Add `vercel.json` preemptively: rejected unless a real zero-config gap appears
  - Introduce a custom server/deployment wrapper: rejected because it violates the Phase 1 simplicity target

## Decision 4: Separate local-development setup from shared deployment setup explicitly

- **Decision**: Document `.env.local` for local use and Vercel environment variables for shared deployments as distinct setup paths.
- **Rationale**: This reduces confusion about where `GITHUB_TOKEN` should live and supports the manual verification expectations already used in earlier features.
- **Alternatives considered**:
  - Collapse all setup into one generic token note: rejected because it hides an important environment distinction

## Decision 5: Accept sandbox build limits as environment-specific unless a product regression is found

- **Decision**: Continue treating the current `next/font/google` Geist fetch failure during `npm run build` as an environment-specific limitation unless deployment verification finds a real Vercel production blocker.
- **Rationale**: The build issue already existed before `P1-F03`, and the product direction so far has been to note it explicitly rather than conflate it with unrelated feature regressions.
- **Alternatives considered**:
  - Block deployment work on solving fonts first: rejected because it would couple `P1-F03` to a separate known issue
