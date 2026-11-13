<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## 1Claw Starter Kit notes

- The app must only ever hold `ONECLAW_AGENT_KEY` (format `agent_id:ocv_...`), encrypted in `.env` via dotenvx. Never add provider LLM keys or the human `1ck_` key to env files.
- LLM calls go through 1Claw Shroud (`lib/oneclaw.ts`); setup logic and API endpoints are in `scripts/setup.mjs`.
- AI SDK 7: check `node_modules/ai/docs/` before changing chat/streaming code.
