# Contract: Deployment Environment

## Local Development

- Uses `.env.local` for optional local `GITHUB_TOKEN`
- PAT field may remain visible when no server token is present
- Local verification must still support the existing client-PAT path

## Shared Vercel Deployment

- Uses Vercel project environment variables for `GITHUB_TOKEN`
- `GITHUB_TOKEN` is read server-side through `process.env`
- The PAT field is hidden when server-side `GITHUB_TOKEN` is available
- The token is not exposed in the client bundle, URL, or rendered UI output

## Precedence Rules

- Server-side `GITHUB_TOKEN` takes precedence over client-supplied PAT
- If no server-side token exists, the existing client PAT flow remains valid
- Deployment docs must make this precedence explicit
