/**
 * Dev-only server-side PAT fallback (Issue #207, Constitution §III.4 v1.2).
 *
 * When NODE_ENV=development and DEV_GITHUB_PAT is set, server-side code paths
 * use the PAT instead of the OAuth session token supplied by the client. This
 * unblocks multi-worktree local testing where OAuth callback URLs collide.
 *
 * MUST NOT be imported from client components.
 */

export function isDevPatActive(): boolean {
  if (process.env.NODE_ENV !== 'development') return false
  const pat = process.env.DEV_GITHUB_PAT
  return typeof pat === 'string' && pat.length > 0
}

export function resolveServerToken(clientToken: string | null | undefined): string | null {
  if (isDevPatActive()) return process.env.DEV_GITHUB_PAT as string
  return clientToken ?? null
}

export function assertDevPatNotInProduction(): void {
  if (process.env.NODE_ENV === 'production' && process.env.DEV_GITHUB_PAT) {
    throw new Error(
      'DEV_GITHUB_PAT is set while NODE_ENV=production. ' +
        'DEV_GITHUB_PAT is a local-development-only fallback (see constitution §III.4 v1.2). ' +
        'Remove it from the production environment.',
    )
  }
}
