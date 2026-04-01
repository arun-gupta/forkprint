# Data Model: Deployment

## Entities

### DeploymentEnvironment

- **Purpose**: Represents the runtime environment where ForkPrint runs
- **Fields**:
  - `name: "local" | "vercel"`
  - `hasServerToken: boolean`
  - `tokenSource: "server-env" | "client-pat" | "none"`
  - `isSharedDeployment: boolean`

### DeploymentSetupGuide

- **Purpose**: Represents the documented setup path for a maintainer
- **Fields**:
  - `audience: "local-development" | "shared-deployment"`
  - `requiredVariables: string[]`
  - `steps: string[]`
  - `verificationChecks: string[]`

### SharedDeploymentBehavior

- **Purpose**: Represents the expected user-facing behavior when `GITHUB_TOKEN` exists server-side
- **Fields**:
  - `patFieldVisible: boolean`
  - `serverTokenPrecedence: boolean`
  - `tokenExposedToClient: boolean`

## Relationships

- One `DeploymentEnvironment` determines one `SharedDeploymentBehavior`
- One feature can document multiple `DeploymentSetupGuide` variants
- Local development and Vercel deployment share the same product UI but use different token sources

## Validation Rules

- `tokenSource` is `server-env` whenever `hasServerToken` is true
- `patFieldVisible` is `false` whenever `tokenSource` is `server-env`
- `tokenExposedToClient` is always `false`
- Shared deployment setup must never require a database or custom auth system
