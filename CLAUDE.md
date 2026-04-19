# LaunchSmart AI Guidelines

You are an AI coding assistant working on **LaunchSmart**, an Autonomous Agentic pre-launch QA platform. When generating code or modifying this repository, you must strictly adhere to the following architectural guidelines:

## 1. Tech Stack & Environment
- **Framework:** Next.js (App Router only. NEVER use the `pages/` directory).
- **Styling:** Tailwind CSS (v4) and `shadcn/ui`. For new UI components, prioritize using Radix primitives via `shadcn` rather than building from scratch.
- **Backend Database:** Supabase (`@supabase/supabase-js`). All data reads/writes must be done securely. For Next.js API routes, use standard Supabase server clients.
- **Language:** TypeScript only. Ensure strict typing for all API responses.

## 2. Artificial Intelligence & MCP Architecture
LaunchSmart is an autonomous agent natively integrating the **Model Context Protocol (MCP)**.
- **DO NOT** write procedural, hard-coded `fetch()` chains to pull data into AI prompts.
- **DO USE MCP Tools:** If an AI Agent needs external data (e.g., GitHub, Jira, Slack, Notion), you MUST define a new tool inside the `lib/mcp.ts` Model Context Protocol server.
- The Vercel AI SDK execution happens in `app/api/pr-check/route.ts` using `generateText`. Tools are exposed to Gemini 2.5 Flash via an `InMemoryTransport` pipe.
- Always utilize `maxSteps` looping when constructing new Agentic endpoints to allow the LLM to traverse dynamic tools.

## 3. Integration Auth Patterns (BYOK)
- Users bring their own API keys (BYOK). 
- Always import and utilize `resolveGitHubToken(userId)` and `resolveJiraCredentials(userId)` from `lib/user-keys.ts` before falling back to `process.env`.
- Do not instantiate global SDK clients using `process.env` directly in serverless execution, as this violates multi-tenant BYOK isolation.

## 4. Components & State
- **Global State:** Leverage `Zustand` (`lib/report-store.ts`) for persisting cross-component state.
- **Client Components:** Ensure `"use client"` is explicitly utilized at the top of interactive components. Default to Server Components otherwise.
