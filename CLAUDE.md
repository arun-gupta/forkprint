## Claude's Role
Read `.specify/memory/constitution.md` first. It is the authoritative source of truth for this project. Everything in it is non-negotiable.

## SpecKit Commands
Command definitions are available in `.claude/commands/`.

- `/speckit.specify` — generate spec
- `/speckit.plan` — generate plan
- `/speckit.tasks` — generate task list
- `/speckit.implement` — execute plan

Before running any `/speckit.*` command, always read `docs/PRODUCT.md`. The spec must be traceable to the acceptance criteria and out-of-scope boundaries defined there.

## On Ambiguity
If a spec is missing, incomplete, or conflicts with the constitution — 
stop and ask. Do not infer. Do not proceed.
