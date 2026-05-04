# AI Chat

RepoPulse includes a conversational AI panel that lets users ask natural-language questions about any analysis result — a single repo, a multi-repo comparison, an org inventory, or a full org health run.

## How it works

The chat panel appears as a slide-up tray at the bottom of every analysis view. It is scoped to the currently displayed data: the model only sees the serialized analysis context (metrics, scores, recommendations) for whatever is on screen, never raw GitHub tokens or unrelated data.

Each message exchange follows this flow:

1. The frontend serializes the visible analysis into a JSON context block.
2. It sends that context + the conversation history to `POST /api/chat`.
3. The API route authenticates the user, enforces quotas, resolves a provider + model, and streams a response via the Vercel AI SDK.
4. The streamed response is displayed incrementally in the chat bubble.

The user can stop a response mid-stream using the square stop button that appears while the model is typing.

## Providers

The chat supports five providers. The user selects a provider and model in the chat settings panel; the choice is persisted in `localStorage`.

| Provider | Models available |
|----------|-----------------|
| Anthropic | claude-haiku-3-5 (fast), claude-sonnet-4-5 (quality) |
| OpenAI | gpt-4o-mini (fast), gpt-4o (quality) |
| Google | gemini-2.0-flash (fast), gemini-2.5-pro (quality) |
| Groq | llama-3.1-8b-instant (fast), llama-3.3-70b-versatile (quality) |
| OpenRouter | meta-llama/llama-3.1-8b-instruct (fast), anthropic/claude-3.5-sonnet (quality) |

## Free tier

If the server has at least one AI provider key configured (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GOOGLE_API_KEY`, or `GROQ_API_KEY`), signed-in users get **5 free chats per GitHub login per calendar day (UTC midnight reset)**. The first key found in that priority order is used for free-tier requests.

- The remaining count is shown as colored dots in the chat panel.
- Once exhausted, the panel prompts the user to enter their own API key.
- Failed requests (provider errors, network timeouts) do not consume quota — the counter is decremented on error.

If no server key is configured, the free tier is unavailable and users must always supply their own key.

## Bring your own key

Any user can enter their own API key in the chat settings panel. With an own key:

- Provider and model selection are fully unlocked.
- Daily quota does not apply.
- The key is sent to `POST /api/chat` in the request body and forwarded to the selected provider. It is never logged, stored, or persisted server-side.

## Context scoping

The context sent to the model is trimmed to the most relevant fields:

- **Repos mode**: per-repo metrics snapshot (stars, commits, PRs, issues, contributors, security/doc/license results).
- **Org mode (inventory phase)**: repo list with stars, language, topics, push date, license.
- **Org mode (analysis done)**: org-level panel rollups (security, bus-factor, documentation coverage, etc.) plus a per-repo status table.

Context is serialized as a JSON block inside the system prompt. The model is instructed to answer strictly from the provided data and not to invent metrics.

## Conversation history

Up to 10 turns (20 messages) of history are sent with each request. Older messages are trimmed from the front. A visual divider is inserted in the UI whenever the underlying analysis context changes (e.g., user filters to different repos) so it's clear which data a prior answer was based on.

## Starter chips

The panel surfaces suggested questions as clickable chips:

- **Repos**: "What are the biggest health risks?", "Which repo is most active?", "How does security compare across these repos?", etc.
- **Org (inventory)**: "Which repos have the most stars?", "How many repos use each language?", etc.
- **Org (analysis)**: "Which repos need the most attention?", "What are the top recommendations?", etc.

Chips disappear once the first message is sent.

## Server setup

See [`docs/DEPLOYMENT.md`](DEPLOYMENT.md#ai-chat-optional) for the environment variables required to enable the free tier.
