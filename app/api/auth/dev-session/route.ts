import { isDevPatActive } from '@/lib/auth/dev-pat'

export const runtime = 'nodejs'

export async function GET() {
  if (isDevPatActive()) {
    return Response.json({ enabled: true, username: 'dev' })
  }
  return Response.json({ enabled: false })
}
