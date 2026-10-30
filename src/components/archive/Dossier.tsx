import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Download } from "lucide-react";
import type { RepositoryDossier, TreeNode } from "@/data/types";
import { downloadMarkdownReport, generateForensicMarkdownReport } from "@/lib/report-generator";
import { EvidenceInspector } from "./EvidenceInspector";
import { EvidenceRow } from "./EvidenceRow";
import { Timeline } from "./Timeline";
import { SampleNotice } from "./primitives";

function Tree({
  nodes,
  depth = 0,
  onSelectEvidence,
}: {
  nodes: TreeNode[];
  depth?: number | undefined;
  onSelectEvidence?: ((id: string) => void) | undefined;
}) {
  return (
    <ul className="font-mono text-[12.5px]">
      {nodes.map((n) => (
        <li key={n.name}>
          <div
            className="flex items-center justify-between border-b border-dashed border-border py-1.5"
            style={{ paddingLeft: depth * 16 }}
          >
            <span>
              {depth > 0 && <span className="text-faded">└ </span>}
              {n.name}
              {n.type === "dir" && !n.name.endsWith("/") ? "/" : ""}
            </span>
            {n.note &&
              (n.note.startsWith("E-") && onSelectEvidence ? (
                <button
                  type="button"
                  onClick={() => onSelectEvidence(n.note!)}
                  className="text-cobalt underline decoration-cobalt/40 underline-offset-2 hover:decoration-cobalt"
                  title={`Inspect evidence ${n.note}`}
                >
                  {n.note}
                </button>
              ) : (
                <span className={n.note.startsWith("E-") ? "text-cobalt" : "text-muted-foreground"}>
                  {n.note}
                </span>
              ))}
          </div>
          {n.children && (
            <Tree nodes={n.children} depth={depth + 1} onSelectEvidence={onSelectEvidence} />
          )}
        </li>
      ))}
    </ul>
  );
}

export function Dossier({ dossier }: { dossier: RepositoryDossier }) {
  const [sel, setSel] = useState<string | null>(dossier.evidence[0]?.id ?? null);
  const record = dossier.evidence.find((e) => e.id === sel) ?? null;
  const facts: [string, string][] = [
    ["Language", dossier.language],
    ["Last commit", dossier.lastCommit],
    ["Commits", dossier.commitCount.toLocaleString("en-US")],
    ["Open TODOs", String(dossier.todoCount)],
    ["Contributors", String(dossier.contributors)],
    ["License", dossier.license],
  ];
  return (
    <div>
      <header className="grid gap-8 border-b border-foreground pb-8 md:grid-cols-12">
        <div className="md:col-span-7">
          <SampleNotice />
          <h3 className="mt-5 font-mono text-4xl tracking-tight md:text-5xl">{dossier.name}</h3>
          <p className="mt-4 max-w-xl text-lg leading-relaxed text-muted-foreground">
            {dossier.description}
          </p>
        </div>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 self-end md:col-span-5 md:grid-cols-3">
          {facts.map(([k, v]) => (
            <div key={k} className="border-t border-border pt-2">
              <dt className="text-[12px] text-muted-foreground">{k}</dt>
              <dd className="mt-0.5 font-mono text-[15px]">{v}</dd>
            </div>
          ))}
        </dl>
      </header>

      <div className="grid gap-12 pt-10 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <p className="eyebrow mb-6 text-muted-foreground">
            Chronology · {dossier.commits.length} selected of{" "}
            {dossier.commitCount.toLocaleString("en-US")}
          </p>
          <Timeline commits={dossier.commits} />
          <p className="eyebrow mb-4 mt-4 text-muted-foreground">Structure</p>
          <Tree nodes={dossier.tree} onSelectEvidence={(id) => setSel(id)} />
        </div>
        <div className="lg:col-span-5">
          <p className="eyebrow mb-2 text-muted-foreground">Evidence index</p>
          <ul className="border-t border-foreground">
            {dossier.evidence.slice(0, 3).map((e) => (
              <EvidenceRow
                key={e.id}
                record={e}
                dense
                active={sel === e.id}
                onSelect={() => setSel(sel === e.id ? null : e.id)}
              />
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
            <span className="font-mono text-[11px] text-muted-foreground">
              Showing 3 of {dossier.evidence.length} indexed records
            </span>
            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => {
                  const md = generateForensicMarkdownReport(dossier);
                  downloadMarkdownReport(dossier.name, md);
                }}
                className="inline-flex items-center gap-1 font-mono text-[12px] text-foreground underline decoration-border underline-offset-4 hover:decoration-cobalt hover:text-cobalt"
                title="Download full forensic Markdown report"
              >
                <Download className="h-3 w-3 text-cobalt" />
                Export Report (.md)
              </button>
              <Link
                to="/app/interrogate"
                search={{
                  excavationId: dossier.isSample ? undefined : dossier.name || undefined,
                }}
                className="font-mono text-[12px] text-cobalt underline decoration-cobalt/30 underline-offset-4 hover:decoration-cobalt"
              >
                Interrogate with AI →
              </Link>
              <Link
                to="/app/evidence"
                className="font-mono text-[12px] text-cobalt underline decoration-cobalt/30 underline-offset-4 hover:decoration-cobalt"
              >
                Browse all evidence →
              </Link>
            </div>
          </div>
          <div className="mt-6">
            <EvidenceInspector record={record} onClose={() => setSel(null)} />
          </div>
          <div className="mt-8 bg-ink p-6 text-on-ink">
            <p className="eyebrow text-on-ink-muted">Preliminary recommendation · sample</p>
            <p className="mt-3 font-display text-2xl font-medium leading-tight">
              {dossier.recommendation.verdict}
            </p>
            <p className="mt-3 text-[14px] leading-relaxed text-on-ink-muted">
              {dossier.recommendation.rationale}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
