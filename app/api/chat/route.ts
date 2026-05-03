import Anthropic from '@anthropic-ai/sdk'

export const runtime = 'nodejs'

const SUPPORTED_MODELS = ['claude-haiku-4-5', 'claude-sonnet-4-6'] as const
type SupportedModel = (typeof SUPPORTED_MODELS)[number]

const VALID_CONTEXT_TYPES = ['repos', 'org'] as const
const VALID_ROLES = ['user', 'assistant'] as const

const MAX_HISTORY_TURNS = 10

async function validateGitHubToken(token: string): Promise<boolean> {
  try {
    const res = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        Authorization: `bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: '{ viewer { login } }' }),
    })
    return res.ok
  } catch {
    return false
  }
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface ChatRequest {
  messages: ChatMessage[]
  context: string
  contextType: 'repos' | 'org'
  githubToken?: string
  anthropicKey?: string
  model?: string
}

function buildSystemPrompt(contextType: 'repos' | 'org', context: string): string {
  const scope =
    contextType === 'repos'
      ? 'one or more GitHub repositories'
      : 'a GitHub organization and all its analyzed repositories'

  return [
    `You are RepoPulse Assistant, an expert on open-source project health metrics.`,
    `You have been given analysis data for ${scope}.`,
    `Answer questions strictly from the provided data. Do not invent metrics, scores, or repository details.`,
    `If the data does not contain enough information to answer a question, say so clearly.`,
    `Be concise and specific. Format responses in Markdown where helpful.`,
    ``,
    `## Analysis Data`,
    context,
  ].join('\n')
}

export async function POST(request: Request) {
  let body: ChatRequest
  try {
    body = (await request.json()) as ChatRequest
  } catch {
    return Response.json(
      { error: { code: 'INVALID_INPUT', message: 'Invalid request body.' } },
      { status: 400 },
    )
  }

  const { messages, context, contextType, githubToken, anthropicKey, model: requestedModel } = body

  // Resolve API key: user-provided key takes precedence over server env var
  const apiKey = anthropicKey?.trim() || process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return Response.json(
      { error: { code: 'NOT_CONFIGURED', message: "AI chat isn't available — please provide an Anthropic API key." } },
      { status: 503 },
    )
  }

  if (!githubToken) {
    return Response.json(
      { error: { code: 'UNAUTHENTICATED', message: 'Authentication required.' } },
      { status: 401 },
    )
  }

  if (!context || !contextType) {
    return Response.json(
      { error: { code: 'INVALID_INPUT', message: 'context and contextType are required.' } },
      { status: 400 },
    )
  }

  if (!(VALID_CONTEXT_TYPES as readonly string[]).includes(contextType)) {
    return Response.json(
      { error: { code: 'INVALID_INPUT', message: `contextType must be one of: ${VALID_CONTEXT_TYPES.join(', ')}.` } },
      { status: 400 },
    )
  }

  if (!Array.isArray(messages) || messages.length === 0) {
    return Response.json(
      { error: { code: 'INVALID_INPUT', message: 'At least one message is required.' } },
      { status: 400 },
    )
  }

  if (messages.some((m) => !(VALID_ROLES as readonly string[]).includes(m.role))) {
    return Response.json(
      { error: { code: 'INVALID_INPUT', message: `Message roles must be one of: ${VALID_ROLES.join(', ')}.` } },
      { status: 400 },
    )
  }

  const isValidToken = await validateGitHubToken(githubToken)
  if (!isValidToken) {
    return Response.json(
      { error: { code: 'UNAUTHENTICATED', message: 'Invalid GitHub token.' } },
      { status: 401 },
    )
  }

  const model: SupportedModel =
    requestedModel && (SUPPORTED_MODELS as readonly string[]).includes(requestedModel)
      ? (requestedModel as SupportedModel)
      : 'claude-haiku-4-5'

  // Keep last MAX_HISTORY_TURNS conversation turns (each turn = 1 user + 1 assistant message)
  const trimmedMessages = messages.slice(-(MAX_HISTORY_TURNS * 2))

  const systemPrompt = buildSystemPrompt(contextType, context)

  const client = new Anthropic({ apiKey })

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()

      function emit(chunk: string) {
        controller.enqueue(encoder.encode(chunk))
      }

      try {
        const response = await client.messages.stream({
          model,
          max_tokens: 1024,
          system: [
            {
              type: 'text',
              text: systemPrompt,
              cache_control: { type: 'ephemeral' },
            },
          ],
          messages: trimmedMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        })

        let inputTokens = 0
        let cacheReadTokens = 0
        let outputTokens = 0

        for await (const event of response) {
          if (event.type === 'message_start') {
            inputTokens = event.message.usage.input_tokens
            cacheReadTokens = (event.message.usage as { cache_read_input_tokens?: number }).cache_read_input_tokens ?? 0
          } else if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            emit(`data: ${JSON.stringify({ type: 'delta', text: event.delta.text })}\n\n`)
          } else if (event.type === 'message_delta') {
            outputTokens = event.usage.output_tokens
          }
        }

        emit(`data: ${JSON.stringify({ type: 'usage', inputTokens, outputTokens, cacheReadTokens })}\n\n`)
        emit(`data: ${JSON.stringify({ type: 'done' })}\n\n`)
      } catch (error: unknown) {
        const status = (error as { status?: number }).status
        if (status === 401) {
          emit(
            `data: ${JSON.stringify({ type: 'error', code: 'INVALID_KEY', message: 'Invalid API key — check it and try again.' })}\n\n`,
          )
        } else if (status === 429) {
          emit(
            `data: ${JSON.stringify({ type: 'error', code: 'RATE_LIMITED', message: 'Too many requests — please wait a moment and try again.' })}\n\n`,
          )
        } else if (status === 400 && (error as { message?: string }).message?.includes('too large')) {
          emit(
            `data: ${JSON.stringify({ type: 'error', code: 'CONTEXT_TOO_LARGE', message: 'This analysis is too large to chat about. Try reducing the repo count using the slider.' })}\n\n`,
          )
        } else {
          emit(
            `data: ${JSON.stringify({ type: 'error', code: 'API_ERROR', message: 'Something went wrong — please try again in a moment.' })}\n\n`,
          )
        }
      } finally {
        controller.close()
      }
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
