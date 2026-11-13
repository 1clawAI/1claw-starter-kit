# 1Claw Starter Kit

A minimal Next.js chat agent secured by [1Claw](https://1claw.co), built for hackathons.
One command creates your **vault**, **agent** and **policy** and wires them into the app.

```
git clone <this repo> && cd 1claw-starter-kit
npm install
npm run setup     # interactive bootstrap
npm run dev       # → http://localhost:3000
```

Requires Node 22+.

## What `npm run setup` asks for

| Prompt | Notes |
| --- | --- |
| **1Claw human API key** | `1ck_…` from 1claw.co → Settings → API Keys. Used once, **never saved**. |
| **Project name** | Names your vault and agent. |
| **LLM provider** | OpenAI · Anthropic · Google Gemini |
| **Model** | Pick from the list or type any model id. |
| **Billing** | **Bring your own key**: your provider key is stored in your 1Claw vault, never on disk. **1Claw LLM token billing**: no provider key needed. Setup opens Stripe checkout so you can add a credit card, and usage is invoiced by 1Claw. |

## What it creates

```
 human API key ──► JWT (short-lived, in memory only)
                    │
                    ├─► Vault        <project>-vault
                    ├─► Secret       providers/<provider>/api-key   (BYOK only)
                    ├─► Agent        Shroud-enabled, locked to this vault only
                    └─► Policy       agent may READ providers/<provider>/*  — nothing else
                    
 .env  ──►  ONECLAW_AGENT_KEY="encrypted:…"   ← the ONLY secret the app holds
```

At runtime the app sends chat requests to **1Claw Shroud** (`shroud.1claw.co`), an LLM proxy running in a TEE.
Shroud authenticates the scoped agent key and fetches the provider key from your vault (or bills tokens to your org).
It also redacts secrets and PII before anything reaches the model. Your Next.js server never sees the real LLM key.

## Encrypted `.env`

`.env` is encrypted with [dotenvx](https://dotenvx.com). The private decryption key lives in `.env.keys`.

- `npm run dev` / `npm run start` decrypt the key in memory via `dotenvx run`.
- `.env` and `.env.keys` are both gitignored. **Never commit `.env.keys`.**
- To read the key, run `npx dotenvx get ONECLAW_AGENT_KEY`.
- To rotate the key, re-run `npm run setup`, or use `POST /v1/agents/{id}/rotate-key` in the 1Claw dashboard.

## Deploy to Vercel

Vercel encrypts environment variables at rest, so pipe the decrypted key straight in. It never touches your shell history:

```
npx dotenvx get ONECLAW_AGENT_KEY | npx vercel env add ONECLAW_AGENT_KEY production
npx vercel deploy --prod
```

`1claw.config.json` holds only non-secret settings (provider, model, ids), so commit it.

## Where to hack

| File | What it does |
| --- | --- |
| `lib/agent.ts` | Agent instructions. Add AI SDK tools here. |
| `app/api/chat/route.ts` | Streams chat through Shroud with the AI SDK. |
| `lib/oneclaw.ts` | Shroud model provider (reads the agent key). |
| `components/chat.tsx` | Chat UI. |
| `scripts/setup.mjs` | The bootstrap. Read it to learn the 1Claw API. |

Want the agent to use more secrets, like a database URL? Store them in the vault and add a policy for that path in the 1Claw dashboard.
Then read them server-side with `@1claw/sdk` using the same agent key.

## Security

- The app holds **only** the scoped agent key. By policy it can read just `providers/<provider>/*` in one vault, and nothing else in your 1Claw org.
- The human `1ck_` key and your LLM key are never written to disk.
- `/api/chat` has no login. Once deployed, anyone with the URL can chat and spend your LLM budget.
  The route caps message count and size, but before you share a public URL you should add auth
  (for example Clerk or Vercel Deployment Protection) or set Shroud limits (`daily_budget_usd`, `max_requests_per_day`) on the agent in the 1Claw dashboard.
- Detailed upstream errors are shown only in development. Production returns generic messages.

## Troubleshooting

- **401 from Shroud**: the agent key is wrong or was rotated. Re-run `npm run setup`.
- **401 "no provider key"**: BYOK secret missing. Check `providers/<provider>/api-key` in your vault.
- **402 / 403**: your 1Claw plan or LLM billing doesn't cover this. Check [1claw.co/pricing](https://1claw.co/pricing).
- **"still encrypted"**: you started Next directly. Use `npm run dev`.

Brand assets from [1claw.co/brand-kit](https://1claw.co/brand-kit).
