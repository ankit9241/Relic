import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ChevronRight, FileArchive } from "lucide-react";
import { useEffect, useState } from "react";
import { EmptyState, Eyebrow } from "@/components/archive/primitives";
import { actionVariants } from "@/components/ui/action";
import { archiveApiClient } from "@/api/client";
import type { Excavation } from "@/data/types";

export const Route = createFileRoute("/app/excavations")({
  head: () => ({
    meta: [
      { title: "Excavations — RELIC" },
      { name: "description", content: "Your catalogue of repository excavations." },
      { property: "og:title", content: "Excavations — RELIC" },
      { property: "og:description", content: "Your catalogue of repository excavations." },
    ],
  }),
  component: ExcavationsPage,
});

function ExcavationsPage() {
  const [excavations, setExcavations] = useState<Excavation[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    archiveApiClient.listExcavations().then((list) => {
      if (mounted) {
        setExcavations(list);
        setLoaded(true);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="mx-auto max-w-6xl">
      <Eyebrow>Catalogue</Eyebrow>
      <div className="mb-12 mt-5 flex flex-wrap items-end justify-between gap-6">
        <h1 className="font-display text-5xl font-medium md:text-6xl">Excavations.</h1>
        <Link to="/app/excavate" className={actionVariants({ size: "sm" })}>
          New excavation <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {loaded && excavations.length > 0 ? (
        <div className="border-t border-foreground">
          <div className="hidden grid-cols-12 gap-6 border-b border-border py-2 font-mono text-[11px] text-muted-foreground md:grid">
            <span className="col-span-2">SPECIMEN</span>
            <span className="col-span-4">REPOSITORY</span>
            <span className="col-span-2">COMMITS</span>
            <span className="col-span-2">EVIDENCE</span>
            <span className="col-span-2 text-right">ACTIONS</span>
          </div>
          <ul className="divide-y divide-border">
            {excavations.map((exc) => (
              <li
                key={exc.id}
                className="grid gap-3 py-4 transition-colors hover:bg-surface md:grid-cols-12 md:items-center md:gap-6"
              >
                <span className="font-mono text-[12px] text-cobalt md:col-span-2">
                  {exc.specimen || exc.id}
                </span>
                <div className="md:col-span-4">
                  <p className="font-medium">{exc.name}</p>
                  <p className="font-mono text-[11px] text-muted-foreground">
                    {new Date(exc.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <span className="font-mono text-[13px] text-muted-foreground md:col-span-2">
                  {exc.commitCount ?? 0}
                </span>
                <span className="font-mono text-[13px] text-muted-foreground md:col-span-2">
                  {exc.evidenceCount ?? 0} records
                </span>
                <div className="flex items-center justify-end gap-3 md:col-span-2">
                  <Link
                    to="/app/evidence"
                    search={{ excavationId: exc.id }}
                    className="font-mono text-[12px] text-cobalt underline decoration-cobalt/40 underline-offset-4 hover:decoration-cobalt"
                  >
                    Evidence
                  </Link>
                  <Link
                    to="/app/roadmap"
                    search={{ excavationId: exc.id }}
                    className="font-mono text-[12px] text-muted-foreground hover:text-foreground"
                  >
                    Plan
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <EmptyState
          title="The catalogue is empty."
          body="Excavations appear here once the analysis engine is connected and a repository archive has been processed."
        >
          <Link to="/app/excavate" className={actionVariants({ variant: "ink", size: "sm" })}>
            Prepare an archive
          </Link>
          <Link to="/app/evidence" className={actionVariants({ variant: "link", size: "none" })}>
            Explore the sample archive — ghost-notes
          </Link>
        </EmptyState>
      )}
    </div>
  );
}
