## Claude's Role
Read `.specify/memory/constitution.md` first. It is the authoritative source of truth for this project. Everything in it is non-negotiable.

## Feature Selection Order
When starting new feature work, follow this order exactly:

1. Read `docs/DEVELOPMENT.md` first to identify the next feature to implement from the current implementation order.
2. Read `docs/PRODUCT.md` next to find the canonical product definition, acceptance criteria, and out-of-scope boundaries for that feature.
3. Then run the SpecKit lifecycle in order:
   - `/speckit.specify`
   - `/speckit.plan`
   - `/speckit.tasks`
   - `/speckit.implement`

## SpecKit Commands
Command definitions are available in `.claude/commands/`.

- `/speckit.specify` — generate spec
- `/speckit.plan` — generate plan
- `/speckit.tasks` — generate task list
- `/speckit.implement` — execute plan

These command definitions live in `.claude/commands/`.

## On Ambiguity
If a spec is missing, incomplete, or conflicts with the constitution — 
stop and ask. Do not infer. Do not proceed.

## Signoff Metadata
When filling manual checklist signoff or similar metadata, use the authenticated GitHub username when it can be verified locally. Do not infer identity from the filesystem path alone. If no verified username is available, leave the field blank or ask the user.

## Active Technologies
- TypeScript 5, React 19, Next.js 16.2 (App Router) + Next.js 16.2, Tailwind CSS 4, Vitest 4, React Testing Library 16, Playwright 1.58 (013-activity-scoring)
- Stateless; no database or persistent server storage (013-activity-scoring)
- TypeScript 5 + Next.js 16.2 (App Router), React 19 (029-github-oauth)
- In-memory React state only — no localStorage, no cookies, no server-side session (029-github-oauth)
- TypeScript 5 + React 19, Next.js 16.2 (App Router), Tailwind CSS 4 (030-export)
- None — all export is ephemeral browser-side (Blob download / clipboard API) (030-export)

## Recent Changes
- 013-activity-scoring: Added TypeScript 5, React 19, Next.js 16.2 (App Router) + Next.js 16.2, Tailwind CSS 4, Vitest 4, React Testing Library 16, Playwright 1.58
