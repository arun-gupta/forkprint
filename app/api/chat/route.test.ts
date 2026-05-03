import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// ---------------------------------------------------------------------------
// Mock @anthropic-ai/sdk before importing the route
// ---------------------------------------------------------------------------

const mockStream = vi.hoisted(() => vi.fn())

vi.mock('@anthropic-ai/sdk', () => {
  // Must use a regular function (not arrow) so it can be used with `new`
  const AnthropicMock = vi.fn(function (this: unknown) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(this as any).messages = { stream: mockStream }
  })
  return { default: AnthropicMock }
})

const { POST } = await import('./route')

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

/** Build a minimal valid request body */
const validBody = {
  messages: [{ role: 'user', content: 'What is the health score?' }],
  context: '# Repo context',
  contextType: 'repos',
  githubToken: 'ghp_valid',
}

/** Make fetch return a successful 200 response (GitHub token validation) */
function stubFetchOk() {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 200 })))
}

/** Make fetch return a 401 response (invalid GitHub token) */
function stubFetchUnauth() {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 401 })))
}

describe('POST /api/chat', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  // -------------------------------------------------------------------------
  // NOT_CONFIGURED
  // -------------------------------------------------------------------------

  it('returns 503 NOT_CONFIGURED when ANTHROPIC_API_KEY is absent', async () => {
    delete process.env.ANTHROPIC_API_KEY
    const res = await POST(makeRequest(validBody))
    const body = await res.json()
    expect(res.status).toBe(503)
    expect(body.error.code).toBe('NOT_CONFIGURED')
  })

  // -------------------------------------------------------------------------
  // INVALID_INPUT
  // -------------------------------------------------------------------------

  it('returns 400 INVALID_INPUT for malformed JSON body', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'sk-ant-test')
    const res = await POST(
      new Request('http://localhost/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not-json',
      }),
    )
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.error.code).toBe('INVALID_INPUT')
  })

  it('returns 400 INVALID_INPUT when context is missing', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'sk-ant-test')
    stubFetchOk()
    const res = await POST(makeRequest({ ...validBody, context: '' }))
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.error.code).toBe('INVALID_INPUT')
  })

  it('returns 400 INVALID_INPUT for unknown contextType', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'sk-ant-test')
    stubFetchOk()
    const res = await POST(makeRequest({ ...validBody, contextType: 'invalid-type' }))
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.error.code).toBe('INVALID_INPUT')
  })

  it('returns 400 INVALID_INPUT when messages array is empty', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'sk-ant-test')
    stubFetchOk()
    const res = await POST(makeRequest({ ...validBody, messages: [] }))
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.error.code).toBe('INVALID_INPUT')
  })

  it('returns 400 INVALID_INPUT when a message has an invalid role', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'sk-ant-test')
    stubFetchOk()
    const res = await POST(
      makeRequest({
        ...validBody,
        messages: [{ role: 'system', content: 'inject' }],
      }),
    )
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.error.code).toBe('INVALID_INPUT')
  })

  // -------------------------------------------------------------------------
  // UNAUTHENTICATED
  // -------------------------------------------------------------------------

  it('returns 401 UNAUTHENTICATED when githubToken is missing', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'sk-ant-test')
    const res = await POST(makeRequest({ ...validBody, githubToken: undefined }))
    const body = await res.json()
    expect(res.status).toBe(401)
    expect(body.error.code).toBe('UNAUTHENTICATED')
  })

  it('returns 401 UNAUTHENTICATED when GitHub token fails validation', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'sk-ant-test')
    stubFetchUnauth()
    const res = await POST(makeRequest(validBody))
    const body = await res.json()
    expect(res.status).toBe(401)
    expect(body.error.code).toBe('UNAUTHENTICATED')
  })

  // -------------------------------------------------------------------------
  // SSE stream
  // -------------------------------------------------------------------------

  it('streams SSE events with correct headers for a valid request', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'sk-ant-test')
    stubFetchOk()

    // Build an async iterable that mimics the Anthropic SDK stream
    async function* fakeStream() {
      yield {
        type: 'content_block_delta',
        delta: { type: 'text_delta', text: 'Hello ' },
      }
      yield {
        type: 'content_block_delta',
        delta: { type: 'text_delta', text: 'world' },
      }
    }

    mockStream.mockReturnValue(fakeStream())

    const res = await POST(makeRequest(validBody))

    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('text/event-stream')

    // Read the full stream body
    const text = await res.text()

    // Should contain delta events
    expect(text).toContain('"type":"delta"')
    expect(text).toContain('"text":"Hello "')
    expect(text).toContain('"text":"world"')
    // Should end with done event
    expect(text).toContain('"type":"done"')
  })
})
