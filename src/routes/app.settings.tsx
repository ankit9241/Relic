import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eyebrow } from "@/components/archive/primitives";
import { archiveApiClient } from "@/api/client";
import type { EngineConfig } from "@/data/types";

export const Route = createFileRoute("/app/settings")({
  head: () => ({
    meta: [
      { title: "Settings — RELIC" },
      { name: "description", content: "Workspace and analysis engine settings." },
      { property: "og:title", content: "Settings — RELIC" },
      { property: "og:description", content: "Workspace and analysis engine settings." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const [config, setConfig] = useState<EngineConfig | null>(null);

  useEffect(() => {
    let mounted = true;
    archiveApiClient.getEngineStatus().then((cfg) => {
      if (mounted) setConfig(cfg);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const isOnline = config?.status === "ready" || config?.status === "connected";

  const settingsItems = [
    [
      "Analysis engine",
      isOnline ? "Connected (ready)" : "Not connected",
      isOnline
        ? `Service reachable at ${config?.endpoint || "http://127.0.0.1:3001"}.`
        : "Local backend is offline. Run 'npm run server' in a terminal.",
    ],
    [
      "Storage",
      isOnline && config?.storagePersisted ? "SQLite enabled" : "Local session",
      "Excavation dossiers, manifest metrics, and evidence records are persisted.",
    ],
    [
      "Deterministic analyzer",
      "Active",
      "Inspects AST, remnants, dependencies, and safe Git history without code execution.",
    ],
    [
      "Local AI synthesis",
      config?.capabilities.localAiSynthesis
        ? `Active (${config.ai?.model || "gemma3:4b"})`
        : config?.ai?.available
          ? `Model missing (${config.ai.model || "gemma3:4b"})`
          : "Offline (Ollama)",
      `Grounded interrogation via Ollama (${config?.ai?.model || "gemma3:4b"}) at ${config?.ai?.baseUrl || "http://localhost:11434"}.`,
    ],
    [
      "Execution sandbox",
      "Disabled",
      "Uploaded repository scripts, package hooks, and binaries are never executed.",
    ],
    ["Max archive size", "200 MB", "Configured intake boundary for compressed ZIP repositories."],
    [
      "Specimen archive",
      "ghost-notes (Specimen 001)",
      "Fictional demonstration dossier used for UI baseline and preview verification.",
    ],
  ];

  return (
    <div className="mx-auto max-w-4xl">
      <Eyebrow>Settings</Eyebrow>
      <h1 className="mt-5 font-display text-5xl font-medium md:text-6xl">Settings.</h1>
      <dl className="mt-12 border-t border-foreground">
        {settingsItems.map(([k, v, d]) => (
          <div key={k} className="grid gap-2 border-b border-border py-5 md:grid-cols-12">
            <dt className="font-medium md:col-span-4">{k}</dt>
            <dd className="font-mono text-[13px] md:col-span-3">
              {k === "Analysis engine" && (
                <span className={isOnline ? "text-cobalt" : "text-warn"}>
                  {isOnline ? "● " : "○ "}
                </span>
              )}
              {v}
            </dd>
            <dd className="text-[14px] text-muted-foreground md:col-span-5">{d}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
