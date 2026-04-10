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

## Technology Stack & Development Workflow
See `docs/DEVELOPMENT.md` for the full technology stack, testing commands, and development workflow.

## PR Merge Rule
Never merge a PR without the user explicitly confirming that every item in the PR test plan is checked. Do not infer confirmation from phrases like "manual check confirmed" if any checkbox remains unchecked — ask explicitly before merging.

## On Ambiguity
If a spec is missing, incomplete, or conflicts with the constitution — 
stop and ask. Do not infer. Do not proceed.

## Signoff Metadata
When filling manual checklist signoff or similar metadata, use the authenticated GitHub username when it can be verified locally. Do not infer identity from the filesystem path alone. If no verified username is available, leave the field blank or ask the user.

## Active Technologies
- TypeScript 5.x (Next.js 16+) + Next.js (App Router), Tailwind CSS, Vitest, React Testing Library (032-doc-scoring)
- N/A (stateless) (032-doc-scoring)

## Recent Changes
- 032-doc-scoring: Added TypeScript 5.x (Next.js 16+) + Next.js (App Router), Tailwind CSS, Vitest, React Testing Library
