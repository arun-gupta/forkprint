# Implementation Plan: Deployment

**Branch**: `007-deployment` | **Date**: 2026-04-01 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/007-deployment/spec.md`

## Summary

Make RepoPulse ready for Phase 1 Vercel deployment without changing the product surface beyond deployment-specific behavior. The feature will verify zero-config Vercel deployability, document the deployment setup, preserve the existing stateless architecture, and confirm that server-side `GITHUB_TOKEN` takes precedence while the PAT field stays hidden in shared deployments.

## Technical Context

**Language/Version**: TypeScript 5, React 19, Next.js 16.2 (App Router)  
**Primary Dependencies**: Next.js 16.2, Tailwind CSS 4, Vitest 4, React Testing Library 16, Playwright 1.58  
**Storage**: Stateless; no database or persistent server storage  
**Testing**: Vitest + React Testing Library (unit/integration), Playwright (E2E), deployment/manual verification  
**Target Platform**: Vercel-hosted Next.js web app, modern desktop/mobile browsers  
**Project Type**: Web application with server-side API routes and client-side analysis UI  
**Performance Goals**: Preserve the existing Phase 1 user flows with no extra runtime hops or deployment-only regressions  
**Constraints**: Vercel zero-config deployment; server-side `GITHUB_TOKEN` precedence; no client secret exposure; no database; no custom auth system; no architecture that blocks Phase 2 or 3  
**Scale/Scope**: Deployment setup docs, environment-variable behavior verification, shared-deployment UX checks, and supporting tests/manual checklist

## Constitution Check

| Rule | Status | Notes |
|------|--------|-------|
| I / Phase 1 stack | PASS | Stays within Next.js / Vercel / Tailwind Phase 1 stack |
| III / X — Token handling and security | PASS | `GITHUB_TOKEN` remains environment-driven and server-side only |
| IV — Analyzer module boundary | PASS | No analyzer duplication or framework-coupling changes |
| X — Security & hygiene | PASS | No secrets committed; deployment docs distinguish `.env.local` from Vercel env vars |
| XI — TDD mandatory | PASS | Existing behavior is covered by tests; deployment-specific checks get added before implementation completion |
| XII / XIII — Manual checklist required | PASS | `checklists/manual-testing.md` is created during planning and must be completed before PR |

**Gate result**: PASS — no constitution violations identified.

## Project Structure

### Documentation (this feature)

```text
specs/007-deployment/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── deployment-env.md
│   └── deployment-ui.md
├── checklists/
│   ├── requirements.md
│   └── manual-testing.md
└── tasks.md
```

### Source Code

```text
app/
└── page.tsx                                  ← verify server-side token detection remains deployment-safe

components/
└── repo-input/
    ├── RepoInputClient.tsx                  ← verify shared-deployment token-path behavior
    └── RepoInputClient.test.tsx             ← extend tests for deployment token precedence if needed

docs/
├── PRODUCT.md                               ← UNCHANGED for behavior contract unless deployment wording drifts
└── DEVELOPMENT.md                           ← may be updated only for feature-status tracking

e2e/
├── auth.spec.ts                             ← reuse for server-token deployment behavior
└── results-shell.spec.ts                    ← regression coverage for deployed shell behavior if needed

repo root/
├── README.md                                ← document local vs Vercel deployment setup
├── .env.example                             ← document server-side deployment token expectation
└── vercel.json                              ← only if a real zero-config blocker appears
```

## Implementation Sequence

### Phase 0 — Research

1. Confirm the current app already satisfies Vercel’s default Next.js deployment path or identify the minimum missing deployment setup
2. Confirm how `GITHUB_TOKEN` is detected on the server and how the UI hides the PAT field in shared deployments
3. Confirm what deployment/setup guidance must be documented in README and `.env.example`

### Phase 1 — Design

4. Define the deployment environment model for local `.env.local` versus Vercel environment variables
5. Define the UI contract for shared deployments with server-side token precedence
6. Create the manual testing checklist for local verification plus Vercel/shared-deployment verification
7. Confirm source-code touchpoints for deployment-safe token handling and user-facing docs

### Phase 2 — Implementation Preview

8. Align `.env.example`, README, and any deployment docs with the intended Vercel setup
9. Add or tighten automated tests around server-token precedence and hidden PAT behavior where necessary
10. Verify the app still deploys/builds through the default Next.js/Vercel path without introducing custom infrastructure
11. Finish manual verification for local and shared deployment scenarios

## Complexity Tracking

No constitution violations. No complexity justification required.
