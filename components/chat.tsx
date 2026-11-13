"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useRef, useState } from "react";

const SUGGESTIONS = [
  "What is 1Claw and why does my agent need a vault?",
  "Give me 3 hackathon project ideas for a secure AI agent",
  "Explain how my API key is protected in this app",
];

export function Chat() {
  const { messages, sendMessage, status, stop, error } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status]);

  function send(text: string) {
    if (!text.trim() || busy) return;
    sendMessage({ text });
    setInput("");
  }

  return (
    <>
      <main className="flex-1 overflow-y-auto py-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="font-mono text-xs text-signature">[ AGENT ONLINE ]</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">What are we building?</h1>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              Every request is routed through 1Claw Shroud with a scoped agent key. Your LLM key never touches this app.
            </p>
            <div className="mt-6 flex w-full max-w-md flex-col gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-xl border border-border bg-card px-4 py-3 text-left text-sm transition hover:border-signature/60 hover:bg-accent"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {messages.map((m) => (
              <div key={m.id} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={
                    m.role === "user"
                      ? "bg-signature max-w-[85%] rounded-2xl rounded-br-md px-4 py-2.5 text-sm text-white"
                      : "max-w-[85%] rounded-2xl rounded-bl-md border border-border bg-card px-4 py-2.5 text-sm"
                  }
                >
                  {m.parts.map((part, i) =>
                    part.type === "text" ? (
                      <p key={i} className="whitespace-pre-wrap leading-relaxed">
                        {part.text}
                      </p>
                    ) : null,
                  )}
                </div>
              </div>
            ))}
            {status === "submitted" && (
              <div className="flex gap-1 px-2 py-3" aria-label="Agent is thinking">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="size-1.5 animate-bounce rounded-full bg-signature"
                    style={{ animationDelay: `${i * 120}ms` }}
                  />
                ))}
              </div>
            )}
            {error && (
              <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 font-mono text-xs text-destructive">
                {error.message}
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </main>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="mb-4 flex items-end gap-2 rounded-2xl border border-border bg-card p-2 focus-within:border-signature/60"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          rows={1}
          placeholder="Message your agent…"
          className="max-h-40 flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-muted-foreground"
        />
        {busy ? (
          <button
            type="button"
            onClick={stop}
            className="rounded-xl border border-border px-4 py-2 text-sm font-medium transition hover:bg-accent"
          >
            Stop
          </button>
        ) : (
          <button
            type="submit"
            disabled={!input.trim()}
            className="bg-signature rounded-xl px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-40"
          >
            Send
          </button>
        )}
      </form>
    </>
  );
}
