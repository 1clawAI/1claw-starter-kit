import {
  APICallError,
  convertToModelMessages,
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai";
import { shroudModel } from "@/lib/oneclaw";
import { AGENT_INSTRUCTIONS } from "@/lib/agent";

export const maxDuration = 60;

// Basic abuse limits. This endpoint spends YOUR LLM budget, so if you deploy
// publicly, consider adding auth (see README → Security).
const MAX_MESSAGES = 50;
const MAX_BODY_BYTES = 64_000;
const isDev = process.env.NODE_ENV !== "production";

export async function POST(req: Request) {
  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) {
    return Response.json({ error: "Conversation too long — start a new chat." }, { status: 413 });
  }

  let messages: UIMessage[];
  try {
    ({ messages } = JSON.parse(raw));
    if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_MESSAGES) throw 0;
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  let model;
  try {
    model = shroudModel();
  } catch (e) {
    console.error(e);
    return Response.json(
      { error: isDev ? (e as Error).message : "Agent is not configured." },
      { status: 500 },
    );
  }

  const result = streamText({
    model,
    instructions: AGENT_INSTRUCTIONS,
    messages: await convertToModelMessages(messages),
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      onError: (error) => {
        console.error(error);
        // Detailed Shroud/provider errors in dev only; generic message in production.
        if (!isDev) return "The agent hit an error. Please try again.";
        if (APICallError.isInstance(error)) {
          return `1Claw Shroud returned ${error.statusCode}: ${error.responseBody ?? error.message}`;
        }
        return error instanceof Error ? error.message : String(error);
      },
    }),
  });
}
