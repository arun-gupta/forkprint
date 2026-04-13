export type ParseResult =
  | { valid: true; repos: string[] }
  | { valid: false; error: string }

const GITHUB_URL_RE = /^https:\/\/github\.com\/([a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+?)(?:\.git)?\/?$/
const SLUG_RE = /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/

function extractSlug(token: string): string {
  const match = token.match(GITHUB_URL_RE)
  return match ? match[1] : token
}

export function parseRepos(input: string): ParseResult {
  if (!input.trim()) {
    return { valid: false, error: 'Please enter at least one repository.' }
  }

  const tokens = input
    .split(/[\s,]+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .map(extractSlug)

  const invalid = tokens.find((t) => !SLUG_RE.test(t))
  if (invalid) {
    return { valid: false, error: `"${invalid}" is not a valid owner/repo slug.` }
  }

  const repos = [...new Set(tokens)]
  return { valid: true, repos }
}
