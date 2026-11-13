import "server-only";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import config from "@/1claw.config.json";

/**
 * 1Claw Shroud: an LLM proxy running in a TEE. Your app only ever holds the
 * scoped agent key. Shroud authenticates the agent, then either pulls the
 * provider key from your 1Claw vault (BYOK) or bills tokens to your org
 * (1Claw LLM token billing). It also redacts secrets/PII before the prompt
 * leaves the enclave.
 */
const SHROUD_URL = process.env.ONECLAW_SHROUD_URL ?? "https://shroud.1claw.co";

export const oneclawConfig = config as {
  configured: boolean;
  provider: string;
  model: string;
  projectName?: string;
  billing?: "byok" | "oneclaw";
  vaultId?: string;
  agentId?: string;
};

function agentKey(): string {
  const key = process.env.ONECLAW_AGENT_KEY;
  if (!key) {
    throw new Error("ONECLAW_AGENT_KEY is missing. Run `npm run setup`, then `npm run dev`.");
  }
  if (key.startsWith("encrypted:")) {
    throw new Error("ONECLAW_AGENT_KEY is still encrypted. Start the app with `npm run dev` (it decrypts via dotenvx).");
  }
  return key;
}

/** Returns an AI SDK model that routes through 1Claw Shroud. */
export function shroudModel(model: string = oneclawConfig.model) {
  const shroud = createOpenAICompatible({
    name: "1claw-shroud",
    baseURL: `${SHROUD_URL}/v1`,
    headers: {
      "X-Shroud-Agent-Key": agentKey(),
      "X-Shroud-Provider": oneclawConfig.provider,
    },
  });
  return shroud.chatModel(model);
}
