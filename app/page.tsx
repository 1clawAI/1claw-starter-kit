import Image from "next/image";
import { Chat } from "@/components/chat";
import { ThemeToggle } from "@/components/theme-toggle";
import { oneclawConfig } from "@/lib/oneclaw";

export default function Home() {
  const { configured, provider, model, projectName } = oneclawConfig;

  return (
    <div className="mx-auto flex h-dvh w-full max-w-3xl flex-col px-4">
      <header className="flex items-center justify-between gap-3 py-4">
        <div className="flex items-center gap-2.5">
          <Image src="/brand/1claw-mark-light.svg" alt="" width={28} height={28} className="dark:hidden" priority />
          <Image src="/brand/1claw-mark-dark.svg" alt="" width={28} height={28} className="hidden dark:block" priority />
          <span className="font-wordmark text-xl leading-none">1Claw</span>
          <span className="hidden font-mono text-xs text-muted-foreground sm:inline">
            [ {projectName ?? "STARTER KIT"} ]
          </span>
        </div>
        <div className="flex items-center gap-2">
          {configured && (
            <span className="flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 font-mono text-[11px] text-muted-foreground">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              {provider} · {model}
            </span>
          )}
          <ThemeToggle />
        </div>
      </header>

      {configured ? (
        <Chat />
      ) : (
        <div className="m-auto max-w-md rounded-2xl border border-border bg-card p-6 text-center">
          <p className="font-mono text-xs text-signature">[ NOT CONFIGURED ]</p>
          <h1 className="mt-2 text-xl font-semibold">Bootstrap your agent first</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Create your vault, agent and policy, and save the encrypted agent key:
          </p>
          <pre className="mt-4 rounded-lg bg-accent px-4 py-3 font-mono text-sm">npm run setup</pre>
          <p className="mt-3 text-xs text-muted-foreground">Then restart with <code className="font-mono">npm run dev</code>.</p>
        </div>
      )}
    </div>
  );
}
