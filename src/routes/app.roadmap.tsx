import { createFileRoute, Link } from "@tanstack/react-router";
import { Download, FileText, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { Eyebrow, FilePath, SampleNotice } from "@/components/archive/primitives";
import { actionVariants } from "@/components/ui/action";
import { archiveApiClient } from "@/api/client";
import { SAMPLE_ARCHIVE } from "@/data/sample-archive";
import type {
  Effort,
  RepositoryDossier,
  RoadmapItem,
  RoadmapPhase,
  RoadmapStatus,
} from "@/data/types";
import { downloadMarkdownReport, generateForensicMarkdownReport } from "@/lib/report-generator";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/roadmap")({
  validateSearch: (s: Record<string, unknown>): { excavationId?: string | undefined } => ({
    excavationId: typeof s["excavationId"] === "string" ? s["excavationId"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Resurrection plan — RELIC" },
      {
        name: "description",
        content: "A prioritized, evidence-backed plan for reviving a repository.",
      },
      { property: "og:title", content: "Resurrection plan — RELIC" },
      {
        property: "og:description",
        content: "A prioritized, evidence-backed plan for reviving a repository.",
      },
    ],
  }),
  component: Roadmap,
});

const EFFORT: Record<Effort, number> = { small: 1, medium: 2, large: 3 };
const STATUS: Record<RoadmapStatus, string> = {
  proposed: "Proposed",
  "needs-review": "Needs review",
  blocked: "Blocked",
};

const PHASES: { id: RoadmapPhase; label: string; description: string }[] = [
  {
    id: "stabilize",
    label: "Phase 1: Stabilize",
    description: "Runtime pinning, manifest lockfile reconciliation, and dependency verification.",
  },
  {
    id: "repair",
    label: "Phase 2: Repair",
    description:
      "Re-enabling disabled test suites and addressing critical code remnants (TODO/FIXME).",
  },
  {
    id: "modernize",
    label: "Phase 3: Modernize",
    description: "Toolchain updates, compiler flags, and deprecation removals.",
  },
  {
    id: "revive",
    label: "Phase 4: Revive",
    description: "Resuming stalled feature implementations from last recorded commit intentions.",
  },
];

function defaultPhaseForPriority(priority: number): RoadmapPhase {
  if (priority === 1) return "stabilize";
  if (priority === 2) return "repair";
  if (priority === 3) return "modernize";
  return "revive";
}

function Roadmap() {
  const { excavationId } = Route.useSearch();
  const [dossier, setDossier] = useState<RepositoryDossier>(SAMPLE_ARCHIVE);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

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

  const handleExportReport = () => {
    const markdown = generateForensicMarkdownReport(dossier);
    downloadMarkdownReport(dossier.name, markdown);
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 2500);
  };

  const getItemsForPhase = (phase: RoadmapPhase): RoadmapItem[] => {
    return dossier.roadmap.filter(
      (r) => r.phase === phase || (!r.phase && defaultPhaseForPriority(r.priority) === phase),
    );
  };

  return (
    <div className="mx-auto max-w-6xl space-y-12">
      {/* Header & Controls */}
      <div>
        <Eyebrow>Resurrection blueprint · {dossier.name}</Eyebrow>
        <div className="mt-5 flex flex-wrap items-end justify-between gap-6">
          <div>
            <h1 className="font-display text-5xl font-medium leading-[0.98] md:text-6xl">
              What to do,
              <br />
              in what order.
            </h1>
            <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
              Recommendations are fact-supported proposals derived from cited evidence. Actions are
              sequenced into four progressive phases: Stabilize, Repair, Modernize, and Revive.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleExportReport}
              className={actionVariants({ variant: "outline", size: "sm" })}
              title="Download full forensic Markdown investigation report"
            >
              <Download className="mr-1.5 h-3.5 w-3.5 text-cobalt" />
              {downloadSuccess ? "Report Downloaded!" : "Export Report (.md)"}
            </button>

            <Link
              to="/app/interrogate"
              search={{ excavationId }}
              className={actionVariants({ variant: "outline", size: "sm" })}
              title="Ask AI questions grounded in this roadmap"
            >
              <Sparkles className="mr-1.5 h-3.5 w-3.5 text-cobalt" /> Interrogate with AI
            </Link>

            {dossier.isSample ? (
              <SampleNotice />
            ) : (
              <p className="eyebrow inline-flex items-center gap-2 border-l-2 border-cobalt pl-2 font-semibold text-foreground">
                {dossier.specimen} · Deterministic Roadmap
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Roadmap phases */}
      {dossier.roadmap.length === 0 ? (
        <div className="border-l-2 border-border bg-surface p-8">
          <p className="eyebrow text-muted-foreground">No Roadmap Available</p>
          <p className="mt-2 text-sm text-muted-foreground">
            No resurrection steps have been formulated for this dossier yet.
          </p>
          <Link
            to="/app/excavate"
            className={actionVariants({ variant: "outline", size: "sm", className: "mt-4" })}
          >
            Start an excavation
          </Link>
        </div>
      ) : (
        <div className="space-y-12">
          {PHASES.map((phase) => {
            const items = getItemsForPhase(phase.id);
            if (items.length === 0) return null;

            return (
              <section key={phase.id} className="border-t border-foreground pt-6">
                <div className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
                  <div>
                    <h2 className="font-display text-2xl font-medium tracking-tight">
                      {phase.label}
                    </h2>
                    <p className="text-[13px] text-muted-foreground">{phase.description}</p>
                  </div>
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {items.length} {items.length === 1 ? "action item" : "action items"}
                  </span>
                </div>

                <div className="hidden grid-cols-12 gap-6 border-b border-border pb-2 font-mono text-[11px] text-muted-foreground md:grid">
                  <span className="col-span-1">PRI.</span>
                  <span className="col-span-6">SUGGESTED ACTION & OBSERVED PROBLEM</span>
                  <span className="col-span-2">EVIDENCE / PATHS</span>
                  <span className="col-span-1">EFFORT</span>
                  <span className="col-span-2">STATUS</span>
                </div>

                <ol>
                  {items.map((r) => (
                    <li
                      key={r.title}
                      className="grid gap-3 border-b border-border py-6 transition-colors hover:bg-surface md:grid-cols-12 md:gap-6"
                    >
                      {/* Priority Number */}
                      <span
                        className={cn(
                          "font-display text-3xl font-medium md:col-span-1",
                          r.priority === 1 ? "text-cobalt" : "text-muted-foreground",
                        )}
                      >
                        {String(r.priority).padStart(2, "0")}
                      </span>

                      {/* Title & Observed Problem vs Action */}
                      <div className="space-y-2 md:col-span-6">
                        <h3 className="text-base font-medium text-foreground">{r.title}</h3>

                        {/* Distinct observed finding banner */}
                        {r.observedProblem && (
                          <div className="border-l-2 border-warn bg-paper/80 px-3 py-1.5 font-mono text-[11.5px] leading-relaxed text-muted-foreground">
                            <span className="font-semibold text-warn">Observed fact: </span>
                            {r.observedProblem}
                          </div>
                        )}

                        <p className="text-[13.5px] leading-relaxed text-muted-foreground">
                          {r.explanation}
                        </p>
                      </div>

                      {/* Evidence & File Path citations */}
                      <div className="space-y-2 md:col-span-2">
                        {r.evidence.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {r.evidence.map((e) => (
                              <Link
                                key={e}
                                to="/app/evidence"
                                search={{ id: e, excavationId }}
                                className="border border-cobalt/40 bg-cobalt/5 px-2 py-0.5 font-mono text-[11px] text-cobalt transition hover:border-cobalt hover:bg-cobalt/10"
                                title={`Inspect evidence record ${e}`}
                              >
                                {e}
                              </Link>
                            ))}
                          </div>
                        )}

                        {r.paths && r.paths.length > 0 && (
                          <ul className="space-y-1">
                            {r.paths.map((p) => (
                              <li key={p}>
                                <FilePath path={p} className="text-[11px]" />
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      {/* Effort Meter */}
                      <div
                        className="flex items-center gap-1 md:col-span-1"
                        aria-label={`Effort: ${r.effort}`}
                        title={`Estimated Effort: ${r.effort}`}
                      >
                        {[1, 2, 3].map((n) => (
                          <span
                            key={n}
                            className={cn(
                              "h-3 w-1.5",
                              n <= EFFORT[r.effort] ? "bg-foreground" : "bg-border",
                            )}
                          />
                        ))}
                        <span className="ml-2 font-mono text-[11px] text-muted-foreground md:hidden">
                          {r.effort}
                        </span>
                      </div>

                      {/* Status */}
                      <span
                        className={cn(
                          "font-mono text-[12px] md:col-span-2",
                          r.status === "blocked"
                            ? "text-destructive"
                            : r.status === "needs-review"
                              ? "text-warn"
                              : "text-foreground",
                        )}
                      >
                        ● {STATUS[r.status]}
                      </span>
                    </li>
                  ))}
                </ol>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
