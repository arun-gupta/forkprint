# Feature Specification: Deployment

**Feature Branch**: `007-deployment`  
**Created**: 2026-04-01  
**Status**: Draft  
**Input**: User description: "P1-F03 Deployment"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Deploy RepoPulse to Vercel with minimal setup (Priority: P1)

A maintainer can deploy RepoPulse to Vercel with zero custom server infrastructure so the current web app can be shared outside local development.

**Why this priority**: The feature only delivers value if the current app can be deployed reliably in the Phase 1 hosting model defined in the product and constitution.

**Independent Test**: Can be fully tested by configuring a Vercel project from the current repo, confirming the app builds and starts without custom runtime code, and confirming the deployed app serves the existing analysis flow.

**Acceptance Scenarios**:

1. **Given** the current RepoPulse repo is connected to a new Vercel project, **When** the default build and runtime settings are used, **Then** the app deploys without requiring custom server infrastructure or platform-specific code changes.
2. **Given** a successful Vercel deployment exists, **When** a user opens the deployed site, **Then** the existing Phase 1 UI loads and the analysis flow remains available.

---

### User Story 2 - Use a server-side GitHub token for shared deployments (Priority: P1)

A maintainer can configure `GITHUB_TOKEN` in Vercel so shared deployments can analyze repos without requiring every viewer to paste a PAT.

**Why this priority**: This is the core deployment-specific behavior defined for `P1-F03`, and it is required for a practical shared Phase 1 deployment.

**Independent Test**: Can be fully tested by deploying with `GITHUB_TOKEN` set in Vercel, loading the site, and confirming the PAT field is hidden while analysis still succeeds through the server-side token path.

**Acceptance Scenarios**:

1. **Given** `GITHUB_TOKEN` is configured as a Vercel environment variable, **When** the deployed app renders, **Then** the server-side token takes precedence over any client-side token path.
2. **Given** `GITHUB_TOKEN` is configured as a Vercel environment variable, **When** a user opens the deployed app, **Then** the PAT input field is hidden in the UI.
3. **Given** `GITHUB_TOKEN` is configured as a Vercel environment variable, **When** a user submits one or more valid repos, **Then** analysis succeeds without exposing the token to the client bundle, URL, or UI state.

---

### User Story 3 - Keep the deployment stateless and safe (Priority: P2)

A maintainer can rely on the deployed app remaining stateless and not introducing hidden infrastructure or secret-handling regressions.

**Why this priority**: This protects the project’s Phase 1 architecture and keeps deployment work from introducing database, auth-system, or secret-exposure drift.

**Independent Test**: Can be fully tested by reviewing the deployment setup and confirming no database, session store, or custom auth system is required, and by verifying token handling remains server-side only.

**Acceptance Scenarios**:

1. **Given** the app is prepared for Vercel deployment, **When** the deployment configuration is reviewed, **Then** no database or custom auth system is required for Phase 1 operation.
2. **Given** the deployment configuration is reviewed, **When** environment-variable usage is inspected, **Then** secrets are read from environment variables and are not committed, hardcoded, or exposed to the client bundle.
3. **Given** deployment documentation is followed, **When** a maintainer configures the app for Vercel, **Then** the setup steps clearly distinguish optional local `.env.local` use from shared Vercel environment variables.

### Edge Cases

- What happens when the app is deployed to Vercel without `GITHUB_TOKEN` configured?
- What happens when `GITHUB_TOKEN` is configured in Vercel but is invalid or missing required GitHub access?
- What happens when local development uses `.env.local` while the deployed environment uses Vercel environment variables?
- What happens when a deployed build succeeds but runtime analysis fails because the token is not available on the server?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST remain deployable to Vercel using the standard Next.js deployment path without requiring custom server infrastructure.
- **FR-002**: The system MUST support `GITHUB_TOKEN` as a Vercel environment variable for shared/team deployments.
- **FR-003**: The system MUST use server-side `GITHUB_TOKEN` in preference to any client-supplied token when it is configured in the deployment environment.
- **FR-004**: The system MUST hide the PAT input field in the UI when server-side `GITHUB_TOKEN` is available.
- **FR-005**: The system MUST keep Phase 1 deployment stateless: no database, no custom auth system, and no persistent server storage are introduced by this feature.
- **FR-006**: The system MUST NOT expose `GITHUB_TOKEN` to the client bundle, browser URL, or rendered UI state.
- **FR-007**: The system MUST document the deployment setup required for local development and shared Vercel deployment.
- **FR-008**: The system MUST preserve the existing Phase 1 analysis flow after deployment configuration is applied.

### Key Entities

- **Deployment Environment**: The runtime configuration for RepoPulse in local development or Vercel, including environment variables such as `GITHUB_TOKEN`.
- **Shared Deployment Token Path**: The server-side execution path that uses deployment environment variables instead of a client-supplied PAT.
- **Deployment Setup Guide**: The user-facing documentation that explains how to configure and verify a Vercel deployment safely.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A maintainer can follow the documented setup and produce a working Vercel deployment without adding custom server infrastructure.
- **SC-002**: In a deployment with `GITHUB_TOKEN` configured, the PAT field is hidden and repo analysis still succeeds through the server-side token path.
- **SC-003**: The deployment configuration introduces no database, no custom auth system, and no client exposure of `GITHUB_TOKEN`.
- **SC-004**: The local-development and shared-deployment setup steps are documented clearly enough that a maintainer can configure both environments without guessing where the token belongs.

## Assumptions

- The existing `P1-F02` authentication behavior and `P1-F04` data-fetching flow remain the token-handling foundation for deployment.
- Phase 1 deployment is still limited to Vercel; self-hosted Docker and other hosting targets remain out of scope.
- This feature may require documentation, environment-variable handling checks, and deployment verification, but it does not introduce a new product-facing analysis feature.
- Production verification may depend on a real Vercel deployment environment rather than sandbox-only local checks.
