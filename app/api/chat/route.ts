import { streamText, createDataStreamResponse } from 'ai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createOpenAI } from '@ai-sdk/openai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createGroq } from '@ai-sdk/groq'
import type { ProviderId } from '@/components/chat/providers'
import { PROVIDERS, FREE_TIER_PROVIDER, FREE_TIER_MODEL } from '@/components/chat/providers'

export const runtime = 'nodejs'

// Free tier: 5 requests per GitHub login per server lifetime.
// Resets on deployment — intentional for a lightweight demo gate.
const FREE_LIMIT = 5
const freeUsage = new Map<string, number>()

const VALID_CONTEXT_TYPES = ['repos', 'org'] as const
const VALID_ROLES = ['user', 'assistant'] as const
const MAX_HISTORY_TURNS = 10

async function getGitHubUsername(token: string): Promise<string | null> {
  try {
    const res = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: { Authorization: `bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: '{ viewer { login } }' }),
    })
    if (!res.ok) return null
    const data = (await res.json()) as { data?: { viewer?: { login?: string } } }
    return data.data?.viewer?.login ?? null
  } catch {
    return null
  }
}

function resolveModel(provider: ProviderId, modelId: string, apiKey: string) {
  switch (provider) {
    case 'openrouter':
      return createOpenAI({ baseURL: 'https://openrouter.ai/api/v1', apiKey })(modelId)
    case 'anthropic':
      return createAnthropic({ apiKey })(modelId)
    case 'openai':
      return createOpenAI({ apiKey })(modelId)
    case 'google':
      return createGoogleGenerativeAI({ apiKey })(modelId)
    case 'groq':
      return createGroq({ apiKey })(modelId)
  }
}

// Priority order: whichever server key is configured first wins.
const SERVER_KEY_CANDIDATES: { env: string; provider: ProviderId; modelId: string }[] = [
  { env: 'ANTHROPIC_API_KEY', provider: 'anthropic', modelId: PROVIDERS.anthropic.models[FREE_TIER_MODEL].id },
  { env: 'OPENAI_API_KEY',    provider: 'openai',    modelId: PROVIDERS.openai.models[FREE_TIER_MODEL].id },
  { env: 'GOOGLE_API_KEY',    provider: 'google',    modelId: PROVIDERS.google.models[FREE_TIER_MODEL].id },
  { env: 'GROQ_API_KEY',      provider: 'groq',      modelId: PROVIDERS.groq.models[FREE_TIER_MODEL].id },
]

function resolveServerKey(): { provider: ProviderId; modelId: string; key: string } | null {
  for (const candidate of SERVER_KEY_CANDIDATES) {
    const key = process.env[candidate.env]
    if (key) return { provider: candidate.provider, modelId: candidate.modelId, key }
  }
  return null
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
  provider?: ProviderId
  model?: string
  apiKey?: string
}

function buildSystemPrompt(contextType: 'repos' | 'org', context: string): string {
  const scope =
    contextType === 'repos'
      ? 'one or more GitHub repositories'
      : 'a GitHub organization and all its analyzed repositories'

  return [
    'You are RepoPulse Assistant, an expert on open-source project health metrics.',
    `You have been given analysis data for ${scope}.`,
    'Answer questions strictly from the provided data. Do not invent metrics, scores, or repository details.',
    'If the data does not contain enough information to answer a question, say so clearly.',
    'Be concise and specific. Format responses in Markdown where helpful.',
    '',
    '## Analysis Data',
    context,
  ].join('\n')
}

export async function GET() {
  const serverConfig = resolveServerKey()
  if (!serverConfig) return Response.json({ configured: false })
  return Response.json({ configured: true, provider: serverConfig.provider, modelId: serverConfig.modelId })
}

export async function POST(request: Request) {
  let body: ChatRequest
  try {
    body = (await request.json()) as ChatRequest
  } catch {
    return Response.json({ error: { code: 'INVALID_INPUT', message: 'Invalid request body.' } }, { status: 400 })
  }

  const { messages, context, contextType, githubToken, provider: reqProvider, model: reqModel, apiKey } = body

  if (!githubToken) {
    return Response.json({ error: { code: 'UNAUTHENTICATED', message: 'Authentication required.' } }, { status: 401 })
  }

  if (!context || !contextType || !(VALID_CONTEXT_TYPES as readonly string[]).includes(contextType)) {
    return Response.json({ error: { code: 'INVALID_INPUT', message: 'context and contextType are required.' } }, { status: 400 })
  }

  if (!Array.isArray(messages) || messages.length === 0 ||
      messages.some((m) => !(VALID_ROLES as readonly string[]).includes(m.role))) {
    return Response.json({ error: { code: 'INVALID_INPUT', message: 'messages must be a non-empty array of {role, content}.' } }, { status: 400 })
  }

  const username = await getGitHubUsername(githubToken)
  if (!username) {
    return Response.json({ error: { code: 'UNAUTHENTICATED', message: 'Invalid GitHub token.' } }, { status: 401 })
  }

  const hasOwnKey = !!apiKey?.trim()

  // Resolve provider + model + key
  let provider: ProviderId
  let modelId: string
  let resolvedKey: string

  if (hasOwnKey) {
    provider = reqProvider && reqProvider in PROVIDERS ? reqProvider : FREE_TIER_PROVIDER
    modelId = reqModel ?? PROVIDERS[provider].models[FREE_TIER_MODEL].id
    resolvedKey = apiKey!.trim()
  } else {
    const serverConfig = resolveServerKey()
    if (!serverConfig) {
      return Response.json(
        { error: { code: 'NOT_CONFIGURED', message: "AI chat isn't available — please provide an API key." } },
        { status: 503 },
      )
    }
    const usedCount = freeUsage.get(username) ?? 0
    if (usedCount >= FREE_LIMIT) {
      return Response.json(
        {
          error: {
            code: 'FREE_LIMIT_REACHED',
            message: `You've used all ${FREE_LIMIT} free chats. Add an API key to continue.`,
            remaining: 0,
            limit: FREE_LIMIT,
          },
        },
        { status: 402 },
      )
    }
    freeUsage.set(username, usedCount + 1)
    provider = serverConfig.provider
    modelId = serverConfig.modelId
    resolvedKey = serverConfig.key
  }

  const model = resolveModel(provider, modelId, resolvedKey)
  const trimmedMessages = messages.slice(-(MAX_HISTORY_TURNS * 2))
  const systemPrompt = buildSystemPrompt(contextType, context)
  const remaining = hasOwnKey ? undefined : FREE_LIMIT - (freeUsage.get(username) ?? 0)

  return createDataStreamResponse({
    execute: async (writer) => {
      if (remaining !== undefined) {
        writer.writeData({ remaining, limit: FREE_LIMIT })
      }

      const result = streamText({
        model,
        system: systemPrompt,
        messages: trimmedMessages,
        maxTokens: 1024,
      })

      result.mergeIntoDataStream(writer)
    },
    onError: (error) => {
      console.error('[chat] streamText error:', error)
      const msg = (error as { message?: string }).message ?? ''
      if (msg.includes('401') || msg.toLowerCase().includes('invalid api key') || msg.toLowerCase().includes('unauthorized')) {
        return 'Invalid API key — check it and try again.'
      }
      if (msg.includes('429')) return 'Too many requests — please wait a moment and try again.'
      if (msg.includes('too large') || msg.includes('context_length')) {
        return 'This analysis is too large to chat about. Try narrowing the filter to fewer repos.'
      }
      return 'Something went wrong — please try again in a moment.'
    },
  })
}
