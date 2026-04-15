# Contract — `.claude/settings.json` (committed to repo root)

## Purpose

Define the project-scoped Claude Code permission policy that applies to every session (interactive or headless) launched inside this repository or any git worktree of it. Issue #238 option 3.

## Location

`/.claude/settings.json` — at the repo root, committed to git.

## Shape

```json
{
  "permissions": {
    "allow": [
      "Bash(.specify/scripts/bash/*)",
      "Bash(git:*)",
      "Bash(gh:*)",
      "Bash(npm:*)",
      "Bash(node:*)",
      "Bash(ls:*)",
      "Bash(cat:*)",
      "Bash(mkdir:*)",
      "Bash(grep:*)",
      "Bash(find:*)",
      "Bash(awk:*)",
      "Bash(sed:*)",
      "Bash(echo:*)",
      "Bash(printf:*)",
      "Bash(lsof:*)",
      "Bash(bash .specify/scripts/bash/*)",
      "Read",
      "Edit",
      "Write",
      "Grep",
      "Glob",
      "WebFetch(domain:github.com)",
      "WebFetch(domain:api.github.com)"
    ]
  }
}
```

## Contract rules

1. **No secrets** (constitution §X §1): the file MUST NOT contain tokens, PATs, OAuth credentials, or any environment-variable values.
2. **No blanket wildcards**: `Bash(*)`, `Bash(**)`, `"*"`, and `"bypassPermissions: true"` are prohibited. Every Bash entry is command-scoped.
3. **No MCP tools** until a specific feature requires them.
4. **No destructive shell commands** (`rm`, `mv` for paths outside worktree, `sudo`, `curl`, `wget`, `ssh`, `scp`, `kill` beyond the script-level `kill $(cat .dev.pid)`).
5. **Extensions**: adding a new entry requires a PR; PR description must reference the specific SpecKit helper, `git` subcommand, `npm` script, or `gh` subcommand that needs it.

## Example non-compliant entries (reviewer blockers)

- `"Bash(*)"` — wildcard, violates rule 2.
- `"Bash(rm *)"` — destructive, violates rule 4.
- `{"permissions": {"bypassAll": true}}` — violates rule 2.
- `{"env": {"GITHUB_TOKEN": "ghp_..."}}` — secret, violates rule 1.

## Runtime behavior

- Claude Code auto-discovers this file when launched with `cwd` inside the repo or a worktree of it.
- Interactive (`claude`) and headless (`claude -p`) sessions both honor it.
- If the installed CLI version does not support `permissions.allow` (extremely unlikely in 2026), the spawn behaves as before (blocking prompts) — which is the current failure mode, so no regression.
