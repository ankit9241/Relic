import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ChevronRight, FileArchive } from "lucide-react";
import { useEffect, useState } from "react";
import { ArchiveIndex } from "@/components/archive/ArchiveIndex";
import { EmptyState, Eyebrow } from "@/components/archive/primitives";
import { actionVariants } from "@/components/ui/action";
import { archiveApiClient } from "@/api/client";
import { SAMPLE_ARCHIVE } from "@/data/sample-archive";
import type { Excavation, RepositoryDossier } from "@/data/types";

export const Route = createFileRoute("/app/")({
  head: () => ({
    meta: [
      { title: "Overview — RELIC" },
      { name: "description", content: "Your excavations of abandoned repositories, in progress." },
      { property: "og:title", content: "Overview — RELIC" },
      {
        property: "og:description",
        content: "Your excavations of abandoned repositories, in progress.",
      },
    ],
  }),
  component: Overview,
});

function Overview() {
  const [excavations, setExcavations] = useState<Excavation[]>([]);
  const [activeDossier, setActiveDossier] = useState<RepositoryDossier>(SAMPLE_ARCHIVE);
  const [isSamplePreview, setIsSamplePreview] = useState(true);

  useEffect(() => {
    let mounted = true;
    archiveApiClient.listExcavations().then(async (list) => {
      if (!mounted) return;
      setExcavations(list);
      if (list.length > 0 && list[0]) {
        const latestDossier = await archiveApiClient.getExcavation(list[0].id);
        if (latestDossier && mounted) {
          setActiveDossier(latestDossier);
          setIsSamplePreview(false);
        }
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <Eyebrow>Overview</Eyebrow>
          <h1 className="mt-6 font-display text-5xl font-medium leading-[0.98] md:text-7xl">
            Your archive,
            <br />
            in progress.
          </h1>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-muted-foreground">
            Every excavation begins with a repository and a question.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <Link to="/app/excavate" className={actionVariants({ size: "lg" })}>
              Start a new excavation <ArrowRight strokeWidth={1.5} />
            </Link>
            {excavations.length > 0 && (
              <Link
                to="/app/excavations"
                className={actionVariants({ variant: "outline", size: "lg" })}
              >
                View catalogue ({excavations.length})
              </Link>
            )}
          </div>
        </div>
        <div className="hidden lg:col-span-5 lg:block">
          <div className="mb-2 flex items-center justify-between border-b border-border pb-2 font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
            <span>Specimen preview</span>
            <span className={isSamplePreview ? "text-cobalt" : "text-foreground font-semibold"}>
              {isSamplePreview ? "Demo data" : activeDossier.specimen}
            </span>
          </div>
          <div className="opacity-80">
            <ArchiveIndex dossier={activeDossier} />
          </div>
        </div>
      </div>

      <section className="mt-20">
        <div className="mb-4 flex items-center justify-between">
          <p className="eyebrow text-muted-foreground">Recent excavations</p>
          {excavations.length > 0 && (
            <Link
              to="/app/excavations"
              className="font-mono text-[12px] text-cobalt hover:underline"
            >
              All excavations →
            </Link>
          )}
        </div>

        {excavations.length > 0 ? (
          <div className="border-t border-foreground">
            <ul className="divide-y divide-border">
              {excavations.slice(0, 5).map((exc) => (
                <li
                  key={exc.id}
                  className="group flex flex-wrap items-center justify-between gap-4 py-4 transition-colors hover:bg-surface"
                >
                  <div className="flex items-center gap-4">
                    <FileArchive className="h-5 w-5 text-cobalt" strokeWidth={1.5} />
                    <div>
                      <p className="font-mono text-[14px] font-medium text-foreground">
                        {exc.name}
                      </p>
                      <p className="font-mono text-[11px] text-muted-foreground">
                        {exc.specimen || exc.id} · {exc.commitCount ?? 0} commits ·{" "}
                        {exc.evidenceCount ?? 0} evidence artifacts
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Link
                      to="/app/evidence"
                      search={{ excavationId: exc.id }}
                      className="font-mono text-[12px] text-cobalt underline decoration-cobalt/40 underline-offset-4 hover:decoration-cobalt"
                    >
                      Inspect evidence
                    </Link>
                    <Link
                      to="/app/roadmap"
                      search={{ excavationId: exc.id }}
                      className="font-mono text-[12px] text-muted-foreground hover:text-foreground"
                    >
                      Roadmap
                    </Link>
                    <ChevronRight className="h-4 w-4 text-faded group-hover:text-foreground" />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <EmptyState
            title="Nothing excavated yet."
            body="Your catalogue is empty. Once you upload and analyze a repository, completed excavations will appear here with their evidence and resurrection plans."
          >
            <Link to="/app/excavate" className={actionVariants({ variant: "ink", size: "sm" })}>
              Choose a repository
            </Link>
            <Link to="/app/evidence" className={actionVariants({ variant: "link", size: "none" })}>
              Browse the sample archive — {SAMPLE_ARCHIVE.name}
            </Link>
          </EmptyState>
        )}
      </section>
    </div>
  );
}
