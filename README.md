# 1Claw Starter Kit

Build a secure AI chat agent in about 5 minutes. Powered by [1Claw](https://1claw.co).

## You need

- **Node.js 22 or newer**. Check with `node -v`. Download it from [nodejs.org](https://nodejs.org).
- **A 1Claw API key**. Sign up at [1claw.co](https://1claw.co), then create an API key in the dashboard. It starts with `1ck_`.
- **One of these:**
  - an OpenAI, Anthropic or Google Gemini API key, **or**
  - a credit card for 1Claw billing, so you don't need a provider key.

## Step 1 — Download and install

```bash
git clone https://github.com/1clawAI/1claw-starter-kit.git
cd 1claw-starter-kit
npm install
```

## Step 2 — Set up your agent

```bash
npm run setup
```

Answer the questions. Use the arrow keys and press Enter:

1. Paste your **1Claw API key**
2. Name your project
3. Pick a **provider**: OpenAI, Anthropic or Gemini
4. Pick a **model**. The first one is a good default.
5. Choose how to pay:
   - **My own key**: paste your provider API key
   - **1Claw billing**: a checkout page opens so you can add a card

When you see **Done!**, you're ready.

## Step 3 — Run it

```bash
npm run dev
```

Open **http://localhost:3000** and start chatting. 🎉

---

## Make it yours

| Want to… | Edit this file |
| --- | --- |
| Change the agent's personality | `lib/agent.ts` |
| Give the agent tools | `lib/agent.ts`, then `app/api/chat/route.ts` |
| Change the chat UI | `components/chat.tsx` |

## How your keys stay safe

- Your 1Claw API key is used once during setup and **never saved**.
- Your LLM key goes into an encrypted 1Claw **vault**, not into this app.
- The app keeps only one key, for a limited **agent**. It's stored **encrypted** in `.env`.
- Every chat goes through **1Claw Shroud**, which uses your LLM key without exposing it to the app.

⚠️ **Never commit or share `.env.keys`.** It unlocks your `.env`. Git already ignores it.

## Deploy (optional)

```bash
npx dotenvx get ONECLAW_AGENT_KEY | npx vercel env add ONECLAW_AGENT_KEY production
npx vercel deploy --prod
```

Anyone with your deployed link can chat and use your LLM credits.
Set a daily budget for your agent in the 1Claw dashboard before you share it.

## Something broke?

| You see | Do this |
| --- | --- |
| `Invalid API key` during setup | Copy your 1Claw API key again and re-run `npm run setup` |
| `401` in the chat | Re-run `npm run setup` |
| `402` or `403` | Check your 1Claw plan or billing at [1claw.co/pricing](https://1claw.co/pricing) |
| `still encrypted` | Start the app with `npm run dev`, not `next dev` |
| The page says "Bootstrap your agent first" | Run `npm run setup`, then restart `npm run dev` |

Re-running `npm run setup` is always safe. It creates a fresh agent.
