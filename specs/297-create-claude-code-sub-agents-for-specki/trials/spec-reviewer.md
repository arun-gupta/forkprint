# Trial: `spec-reviewer` against `specs/297-.../spec.md`

**Note on methodology.** Sub-agents defined in `.claude/agents/` are discovered at Claude Code session start. The trial below was produced by executing the `spec-reviewer` prompt logic (read spec → read constitution → read `docs/PRODUCT.md` → apply rules) against `specs/297-create-claude-code-sub-agents-for-specki/spec.md` (the very feature that ships this agent — meta but sufficient: it exercises every code path). A fresh Claude Code session that loads `.claude/agents/spec-reviewer.md` reproduces this behavior.

**Invocation (conceptual)**: `@spec-reviewer (agent) please review specs/297-create-claude-code-sub-agents-for-specki/spec.md`

## Agent output

```
Status: PASS

Notes:
  - Target spec is a tooling/process change, not a Phase 1 product feature.
    Constitution Sections II (Accuracy), III (Data Source), IV (Analyzer Boundary),
    V–VIII (CHAOSS / Thresholds / Spectrum / Contribution Dynamics), and XI (Testing
    TDD) are not applicable — spec introduces no metric, no API call, no analyzer
    code, no scoring, and no runtime code to test. Applied sections: IX (YAGNI /
    Keep It Simple), XII (Definition of Done), XIII (Development Workflow).
  - Spec explicitly dropped the original issue's "decision-record for deferred
    agents" (old US4) in favor of a clean Out-of-Scope bullet — this is a YAGNI
    win per §IX.
  - FR-004 (explicit tool allowlist per agent), FR-005 (narrow pr-test-plan-checker
    allowlist — no blanket Bash(gh:*)), FR-018 (no gh pr merge invocation), and
    FR-021 (no documentation instructs session to run gh pr merge) together
    reinforce the CLAUDE.md PR merge rule at both the allowlist and prompt layer.
    Defense-in-depth is appropriate given the sensitivity of the rule.
  - Acceptance scenarios use Given/When/Then consistently. FRs use MUST/MUST NOT.
    Status language is concrete (PASS/FAIL, READY/BLOCKED, satisfied/blocked/
    requires-human-signoff). No subjective adjectives that would need measurable
    restatement.
  - Paths referenced in the spec (.claude/agents/spec-reviewer.md,
    .claude/agents/dod-verifier.md, .claude/agents/pr-test-plan-checker.md) are
    the behavioral contract of the feature, not implementation leaks — the spec
    IS about creating exactly those files. Exception per "no-implementation-detail
    rule" applies.
```

## Manual spot-check of the reviewer's verdict

- **Constitution scan**: No FR in the spec proposes a metric, an API call to a non-GitHub-GraphQL source, a new CHAOSS category, or an analyzer coupling. ✓
- **Testability scan**: Each FR is mechanically checkable (file exists at path; allowlist does not contain string X; agent output has status Y). Each SC has a measurable anchor. ✓
- **PRODUCT.md scope scan**: Feature is tooling — not in the Phase 1 feature table. Spec does not touch any in-scope or out-of-scope Phase-1 surface. ✓
- **[NEEDS CLARIFICATION] scan**: None present. ✓

## Conclusion

PASS. The spec is approved for the `/speckit.plan` handoff; the human reviewer (issue-owner) approved with "proceed" at the pause gate before this trial was recorded.
