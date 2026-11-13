#!/usr/bin/env node
/**
 * 1Claw Starter Kit — bootstrap
 *
 *   npm run setup
 *
 * What this does (with YOUR human 1Claw API key, which is never saved):
 *   1. Exchanges your human API key for a short-lived JWT
 *   2. Creates a vault
 *   3. (BYOK) Stores your LLM provider key in the vault at providers/<provider>/api-key
 *      (1Claw billing) Enables 1Claw LLM token billing via Stripe checkout
 *   4. Creates a Shroud-enabled agent restricted to that vault
 *   5. Creates a least-privilege policy: agent may READ providers/<provider>/* only
 *   6. Verifies the agent can authenticate and reach the LLM through Shroud
 *   7. Writes ONLY the scoped agent key into .env, encrypted with dotenvx
 */
import { password, select, input, confirm } from "@inquirer/prompts";
import { spawn } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import dotenvx from "@dotenvx/dotenvx";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const API = process.env.ONECLAW_API_URL || "https://api.1claw.co";
const SHROUD = process.env.ONECLAW_SHROUD_URL || "https://shroud.1claw.co";

// Providers supported by both Shroud BYOK and 1Claw LLM token billing.
const PROVIDERS = {
  openai: {
    label: "OpenAI",
    keyHint: "sk-...",
    models: ["gpt-5-mini", "gpt-5", "gpt-4.1-mini", "gpt-4o-mini"],
  },
  anthropic: {
    label: "Anthropic",
    keyHint: "sk-ant-...",
    models: ["claude-sonnet-4-6", "claude-haiku-4-5-20251001", "claude-opus-4-8"],
  },
  google: {
    label: "Google Gemini",
    keyHint: "AIza...",
    models: ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.5-flash-lite"],
  },
};

// ── tiny terminal helpers ───────────────────────────────────────────────────
const c = {
  red: (s) => `\x1b[38;2;223;23;26m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
};
const step = (n, msg) => console.log(`\n${c.red(`[ ${String(n).padStart(2, "0")} ]`)} ${c.bold(msg)}`);
const ok = (msg) => console.log(`     ${c.green("✓")} ${msg}`);
const info = (msg) => console.log(`     ${c.dim(msg)}`);
const warn = (msg) => console.log(`     ${c.yellow("!")} ${msg}`);

class ApiError extends Error {
  constructor(status, body, where) {
    const detail =
      (body && (body.detail || body.error?.message || body.error || body.message || body.title)) ||
      JSON.stringify(body);
    super(`${where} failed (HTTP ${status}): ${typeof detail === "string" ? detail : JSON.stringify(detail)}`);
    this.status = status;
  }
}

async function api(method, path, { token, body, where } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }
  if (!res.ok) throw new ApiError(res.status, json, where || `${method} ${path}`);
  return json;
}

function openBrowser(url) {
  const cmd = process.platform === "darwin" ? "open" : process.platform === "win32" ? "cmd" : "xdg-open";
  const args = process.platform === "win32" ? ["/c", "start", "", url] : [url];
  try {
    spawn(cmd, args, { stdio: "ignore", detached: true }).unref();
  } catch {
    /* user can click the printed link */
  }
}

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "hackathon";

// ── main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`
${c.red("  ▄█▀ ▀█▄")}   ${c.bold("1Claw Starter Kit")}
${c.red("  ▀█▄ ▄█▀")}   ${c.dim("Secure AI agent bootstrap · vault + agent + policy + Shroud")}
`);

  const envPath = resolve(ROOT, ".env");
  if (existsSync(envPath)) {
    const again = await confirm({
      message: "A .env already exists. Create a NEW agent and replace it?",
      default: false,
    });
    if (!again) return console.log(c.dim("\nNothing changed. Run `npm run dev` to start the app."));
  }

  // ── Inputs ────────────────────────────────────────────────────────────────
  console.log(c.dim("Get a human API key at https://1claw.co → Settings → API Keys (starts with 1ck_).\n"));
  const humanKey = (
    await password({
      message: "Your 1Claw human API key",
      mask: "•",
      validate: (v) => (v.trim().length > 10 ? true : "That doesn't look like an API key"),
    })
  ).trim();

  const projectName = await input({ message: "Project name", default: "hackathon-agent" });

  const provider = await select({
    message: "LLM provider",
    choices: Object.entries(PROVIDERS).map(([value, p]) => ({ name: p.label, value })),
  });

  let model = await select({
    message: "Model",
    choices: [
      ...PROVIDERS[provider].models.map((m, i) => ({ name: i === 0 ? `${m} (recommended)` : m, value: m })),
      { name: "Other — type a model id", value: "__custom" },
    ],
  });
  if (model === "__custom") model = (await input({ message: "Model id" })).trim();

  const billing = await select({
    message: "How should LLM usage be paid for?",
    choices: [
      {
        name: `Bring my own ${PROVIDERS[provider].label} API key (stored encrypted in your 1Claw vault)`,
        value: "byok",
      },
      {
        name: "1Claw LLM token billing (no provider key needed — add a credit card)",
        value: "oneclaw",
      },
    ],
  });

  let llmKey = null;
  if (billing === "byok") {
    llmKey = (
      await password({
        message: `${PROVIDERS[provider].label} API key (${PROVIDERS[provider].keyHint})`,
        mask: "•",
        validate: (v) => (v.trim().length > 10 ? true : "Required for bring-your-own-key mode"),
      })
    ).trim();
  }

  const created = {};
  try {
    // ── 1. Authenticate human ───────────────────────────────────────────────
    step(1, "Authenticating with 1Claw");
    const auth = await api("POST", "/v1/auth/api-key-token", {
      body: { api_key: humanKey },
      where: "API key exchange",
    });
    const jwt = auth.access_token;
    ok("Human API key exchanged for a short-lived JWT (your key is not saved anywhere)");

    // ── 2. LLM billing (optional) ───────────────────────────────────────────
    if (billing === "oneclaw") {
      step(2, "Enabling 1Claw LLM token billing");
      let status = await api("GET", "/v1/billing/llm-token-billing", { token: jwt, where: "Billing status" });
      if (status.enabled && status.inference_allowed) {
        ok("LLM token billing is already active on your org");
      } else {
        const { checkout_url } = await api("POST", "/v1/billing/llm-token-billing/subscribe", {
          token: jwt,
          where: "Billing checkout",
        });
        if (!checkout_url) throw new Error("1Claw did not return a checkout URL for LLM billing.");
        info("Opening Stripe checkout in your browser to add a payment method:");
        console.log(`     ${c.red(checkout_url)}`);
        openBrowser(checkout_url);
        for (;;) {
          await input({ message: "Press Enter once checkout is complete…" });
          status = await api("GET", "/v1/billing/llm-token-billing", { token: jwt, where: "Billing status" });
          if (status.enabled && status.inference_allowed) break;
          warn(`Billing not active yet${status.warning ? ` (${status.warning})` : ""}. It can take a few seconds.`);
          const retry = await confirm({ message: "Check again?", default: true });
          if (!retry) throw new Error("LLM token billing is not active. Re-run setup once checkout completes.");
        }
        ok("LLM token billing active — usage is metered and invoiced by 1Claw");
      }
    }

    // ── 3. Vault ───────────────────────────────────────────────────────────
    step(3, "Creating vault");
    const vault = await api("POST", "/v1/vaults", {
      token: jwt,
      body: { name: `${slug(projectName)}-vault`, description: `Secrets for ${projectName} (1Claw Starter Kit)` },
      where: "Create vault",
    });
    created.vault = vault.id;
    ok(`Vault ${c.bold(vault.name)} ${c.dim(vault.id)}`);

    // ── 4. Provider key into the vault (BYOK) ──────────────────────────────
    const secretPath = `providers/${provider}/api-key`;
    if (llmKey) {
      step(4, "Storing your LLM key in the vault");
      await api("PUT", `/v1/vaults/${vault.id}/secrets/${secretPath}`, {
        token: jwt,
        body: { type: "api_key", value: llmKey, metadata: { tags: [provider, "starter-kit"] } },
        where: "Store LLM key",
      });
      ok(`Stored at ${c.bold(secretPath)} — HSM-encrypted, never written to disk`);
    }

    // ── 5. Agent ───────────────────────────────────────────────────────────
    step(5, "Creating agent");
    const agentRes = await api("POST", "/v1/agents", {
      token: jwt,
      body: {
        name: projectName,
        description: "Chat agent created by the 1Claw Starter Kit",
        auth_method: "api_key",
        intents_api_enabled: false,
        shroud_enabled: true,
        skip_default_policy: true, // we create a tighter policy below
        vault_ids: [vault.id], // agent can only ever see this vault
        default_llm_provider: provider,
        default_llm_model: model,
      },
      where: "Create agent",
    });
    const agent = agentRes.agent;
    const agentApiKey = agentRes.api_key;
    created.agent = agent.id;
    if (!agentApiKey) throw new Error("1Claw did not return an agent API key.");
    ok(`Agent ${c.bold(agent.name)} ${c.dim(agent.id)} (Shroud enabled)`);

    // ── 6. Policy ──────────────────────────────────────────────────────────
    step(6, "Creating least-privilege policy");
    const policy = {
      secret_path_pattern: `providers/${provider}/*`,
      principal_type: "agent",
      principal_id: agent.id,
      permissions: ["read"],
    };
    try {
      await api("POST", `/v1/vaults/${vault.id}/policies`, { token: jwt, body: policy, where: "Create policy" });
    } catch (e) {
      // Some API versions require the v2 policy fields explicitly.
      if (e.status !== 400 && e.status !== 422) throw e;
      await api("POST", `/v1/vaults/${vault.id}/policies`, {
        token: jwt,
        body: { ...policy, effect: "allow", priority: 0, policy_schema_version: 2 },
        where: "Create policy",
      });
    }
    ok(`Agent may ${c.bold("read")} ${c.bold(`providers/${provider}/*`)} in this vault — nothing else`);

    // ── 7. Verify ──────────────────────────────────────────────────────────
    step(7, "Verifying the agent");
    const agentKey = `${agent.id}:${agentApiKey}`;
    await api("POST", "/v1/auth/agent-token", {
      body: { agent_id: agent.id, api_key: agentApiKey },
      where: "Agent auth",
    });
    ok("Agent key authenticates");
    try {
      const res = await fetch(`${SHROUD}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shroud-Agent-Key": agentKey,
          "X-Shroud-Provider": provider,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: "Reply with exactly: 1Claw agent online" }],
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new ApiError(res.status, body, "Shroud test call");
      const reply = body.choices?.[0]?.message?.content?.trim();
      ok(`Shroud → ${PROVIDERS[provider].label} ${model}: ${c.dim(JSON.stringify(reply ?? "(empty)"))}`);
    } catch (e) {
      warn(`LLM test call failed: ${e.message}`);
      warn("The agent was still created — check your plan/billing or provider key, then try `npm run dev`.");
    }

    // ── 8. Write encrypted .env + public config ────────────────────────────
    step(8, "Writing encrypted .env");
    writeFileSync(envPath, ""); // start fresh so no old values linger
    await dotenvx.set("ONECLAW_AGENT_KEY", agentKey, { path: envPath, quiet: true });
    ok(`.env contains ONLY ${c.bold("ONECLAW_AGENT_KEY")} (encrypted with dotenvx)`);
    ok(`.env.keys holds the private decryption key — ${c.bold("never commit it")}`);

    writeFileSync(
      resolve(ROOT, "1claw.config.json"),
      JSON.stringify(
        {
          configured: true,
          projectName,
          provider,
          model,
          billing,
          vaultId: vault.id,
          agentId: agent.id,
          createdAt: new Date().toISOString(),
        },
        null,
        2,
      ) + "\n",
    );
    ok("1claw.config.json written (non-secret: provider, model, ids)");

    console.log(`
${c.green("Done!")} Start the app:

    ${c.bold("npm run dev")}     ${c.dim("→ http://localhost:3000")}

${c.dim("Manage your vault, agent and policy at https://1claw.co")}
`);
  } catch (e) {
    console.error(`\n${c.red("✗")} ${e.message}`);
    if (e.status === 401) console.error(c.dim("  Check that your 1Claw API key is correct and active."));
    if (e.status === 402 || e.status === 403)
      console.error(c.dim("  Your 1Claw plan may not include this feature — check https://1claw.co/pricing."));
    if (created.vault || created.agent) {
      console.error(c.dim(`  Partially created: ${JSON.stringify(created)} — you can delete these in the 1Claw dashboard.`));
    }
    process.exitCode = 1;
  }
}

main().catch((e) => {
  if (e?.name === "ExitPromptError") return console.log(c.dim("\nSetup cancelled."));
  console.error(e);
  process.exitCode = 1;
});
