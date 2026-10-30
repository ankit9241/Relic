import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { EvidenceInspector } from "@/components/archive/EvidenceInspector";
import { EvidenceRow } from "@/components/archive/EvidenceRow";
import { Eyebrow, SampleNotice } from "@/components/archive/primitives";
import { actionVariants } from "@/components/ui/action";
import { archiveApiClient } from "@/api/client";
import { SAMPLE_ARCHIVE } from "@/data/sample-archive";
import type { EvidenceCategory, RepositoryDossier } from "@/data/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/evidence")({
  validateSearch: (
    s: Record<string, unknown>,
  ): { id?: string | undefined; excavationId?: string | undefined } => ({
    id: typeof s["id"] === "string" ? s["id"] : undefined,
    excavationId: typeof s["excavationId"] === "string" ? s["excavationId"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Evidence — RELIC" },
      {
        name: "description",
        content: "Inspect indexed repository evidence: files, commits, and remnants.",
      },
      { property: "og:title", content: "Evidence — RELIC" },
      { property: "og:description", content: "Inspect indexed repository evidence." },
    ],
  }),
  component: Evidence,
});

const CATS: ("all" | EvidenceCategory)[] = ["all", "history", "remnant", "dependency", "test"];

function Evidence() {
  const { id, excavationId } = Route.useSearch();
  const nav = useNavigate({ from: "/app/evidence" });
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<(typeof CATS)[number]>("all");

  const [dossier, setDossier] = useState<RepositoryDossier>(SAMPLE_ARCHIVE);

  useEffect(() => {
    let mounted = true;
    if (excavationId && excavationId !== "sample") {
      archiveApiClient.getExcavation(excavationId).then((res) => {
        if (mounted && res) setDossier(res);
      });
    } else {
      setDossier(SAMPLE_ARCHIVE);
    }
    return () => {
      mounted = false;
    };
  }, [excavationId]);

  const list = useMemo(
    () =>
      dossier.evidence.filter(
        (e) =>
          (cat === "all" || e.category === cat) &&
          `${e.id} ${e.path} ${e.title} ${e.summary}`.toLowerCase().includes(q.toLowerCase()),
      ),
    [dossier, q, cat],
  );

  const record = dossier.evidence.find((e) => e.id === id) ?? null;

  const select = (next?: string) =>
    nav({
      search: (prev) => ({
        ...prev,
        id: next,
      }),
      replace: true,
    });

  return (
    <div className="mx-auto max-w-6xl">
      <Eyebrow>Evidence explorer</Eyebrow>
      <div className="mt-5 flex flex-wrap items-end justify-between gap-6">
        <div className="space-y-2">
          <h1 className="font-display text-5xl font-medium leading-none md:text-6xl">Evidence.</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/app/interrogate"
            search={{ excavationId }}
            className={actionVariants({ variant: "outline", size: "sm" })}
            title="Ask AI questions grounded in this evidence"
          >
            <Sparkles className="mr-1.5 h-3.5 w-3.5 text-cobalt" /> Interrogate with AI
          </Link>
          {dossier.isSample ? (
            <SampleNotice />
          ) : (
            <p className="eyebrow inline-flex items-center gap-2 border-l-2 border-cobalt pl-2 font-semibold text-foreground">
              {dossier.specimen} · {dossier.name} · Verified Repository Evidence
            </p>
          )}
        </div>
      </div>
      <p className="mt-4 max-w-lg text-muted-foreground">
        Indexed artifacts from <span className="font-mono text-foreground">{dossier.name}</span>.
        Observed facts are read directly from files and repository history.
      </p>

      <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-foreground pb-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filter by id, path, text…"
          aria-label="Filter evidence"
          className="h-9 min-w-56 flex-1 border-b border-transparent bg-transparent font-mono text-[13px] outline-none placeholder:text-muted-foreground focus:border-cobalt"
        />
        <div role="tablist" aria-label="Category" className="flex flex-wrap gap-4">
          {CATS.map((c) => (
            <button
              key={c}
              role="tab"
              aria-selected={cat === c}
              onClick={() => setCat(c)}
              className={cn(
                "eyebrow border-b pb-1 transition-colors",
                cat === c
                  ? "border-cobalt text-cobalt"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {record && !list.some((e) => e.id === record.id) && (
        <div className="mt-4 flex items-center justify-between border-l-2 border-cobalt bg-surface px-4 py-2 font-mono text-[12px]">
          <span>
            Selected artifact <strong className="text-cobalt">{record.id}</strong> (
            {record.category}) is hidden by active filter.
          </span>
          <button
            type="button"
            onClick={() => {
              setCat("all");
              setQ("");
            }}
            className="text-cobalt underline underline-offset-4 hover:text-foreground"
          >
            Show in list
          </button>
        </div>
      )}

      <div className="grid lg:grid-cols-12">
        <ul className="lg:col-span-7">
          {list.length ? (
            list.map((e) => (
              <EvidenceRow
                key={e.id}
                record={e}
                active={id === e.id}
                onSelect={() => select(id === e.id ? undefined : e.id)}
              />
            ))
          ) : (
            <li className="py-12 text-muted-foreground">
              No evidence matches this filter.{" "}
              <button
                className="text-cobalt underline underline-offset-4"
                onClick={() => {
                  setQ("");
                  setCat("all");
                }}
              >
                Clear filters
              </button>
            </li>
          )}
        </ul>
        <div className="lg:col-span-5 lg:pl-6 lg:pt-4">
          <div className="lg:sticky lg:top-20">
            <EvidenceInspector record={record} requestedId={id} onClose={() => select()} />
          </div>
        </div>
      </div>
    </div>
  );
}
