import { getEntries, installLogger, subscribe } from '@/lib/debug/logger'

export const runtime = 'nodejs'

export async function GET() {
  if (process.env.NODE_ENV !== 'development') {
    return Response.json({ error: 'Not available in production.' }, { status: 404 })
  }

  installLogger()

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      // Send existing entries as a batch
      for (const entry of getEntries()) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(entry)}\n\n`))
      }

      // Stream new entries
      const unsubscribe = subscribe((entry) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(entry)}\n\n`))
        } catch {
          unsubscribe()
        }
      })

      // Clean up if client disconnects — the controller will error on enqueue
      // and the catch block above handles unsubscribe
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
