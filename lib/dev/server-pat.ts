/**
 * Dev-only server-side GitHub PAT fallback (#207).
 *
 * When running `next dev` with `DEV_GITHUB_PAT` set in `.env.local`, the app
 * bypasses the GitHub OAuth round-trip and treats the developer as signed in
 * using the PAT directly. This exists to unblock multi-worktree local testing
 * where only one worktree can bind to port 3000 (the registered OAuth App
 * callback port).
 *
 * Safety:
 *  - Gated by `NODE_ENV === 'development'`. Next.js only sets this under
 *    `next dev`; `next build && next start` and Vercel deployments force
 *    `production`, so the PAT is ignored in every non-dev context.
 *  - If `DEV_GITHUB_PAT` is somehow present with `NODE_ENV === 'production'`
 *    (misconfiguration), `assertDevPatNotInProduction` throws at import time
 *    so the app refuses to boot rather than silently leaking credentials.
 *  - This module is server-only (`'server-only'`). Importing it from a
 *    client bundle will fail the Next.js build.
 *
 * Constitution §III.4 prohibits user-facing PAT input. This is a dev-only
 * server-side mechanism invisible to end users, documented as a scoped
 * exception in issue #207.
 */
import 'server-only'

assertDevPatNotInProduction()

/**
 * Returns the dev PAT when running in `next dev` with `DEV_GITHUB_PAT` set,
 * else null. Callers should treat null as "use the regular OAuth path".
 */
export function getDevPat(): string | null {
  if (process.env.NODE_ENV !== 'development') return null
  const pat = process.env.DEV_GITHUB_PAT
  if (!pat || pat.length === 0) return null
  return pat
}

/**
 * Throws if `DEV_GITHUB_PAT` is set while `NODE_ENV === 'production'`.
 * Called at module-import time so a misconfigured deploy fails loudly
 * at server start, not when the first auth request comes in.
 */
export function assertDevPatNotInProduction(): void {
  if (process.env.NODE_ENV === 'production' && process.env.DEV_GITHUB_PAT) {
    throw new Error(
      'DEV_GITHUB_PAT is set with NODE_ENV=production. ' +
        'This variable is for local development only and must never ship to production. ' +
        'Remove it from the deployed environment and rebuild.',
    )
  }
}
