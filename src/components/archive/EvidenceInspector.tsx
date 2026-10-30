import { X } from "lucide-react";
import type { EvidenceRecord } from "@/data/types";
import { FilePath, ProvenanceTag } from "./primitives";

export function EvidenceInspector({
  record,
  onClose,
  requestedId,
}: {
  record: EvidenceRecord | null;
  onClose?: () => void;
  requestedId?: string | undefined;
}) {
  if (!record) {
    return (
      <div className="flex h-full min-h-64 flex-col justify-center border-l border-border px-6 py-10">
        <p className="eyebrow text-muted-foreground">Inspector</p>
        <p className="mt-3 max-w-xs text-muted-foreground">
          {requestedId
            ? `Evidence artifact "${requestedId}" was not found in this indexed dossier.`
            : "Select an evidence record to examine the artifact."}
        </p>
      </div>
    );
  }
  return (
    <article
      key={record.id}
      className="animate-fade-up border-l-2 border-cobalt bg-surface px-6 py-6"
      aria-live="polite"
    >
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[12px] text-cobalt">{record.id}</p>
          <h3 className="mt-2 font-display text-2xl font-medium leading-tight">{record.title}</h3>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Close inspector"
            className="p-1 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        )}
      </header>
      <dl className="mt-5 grid grid-cols-[88px_1fr] gap-y-2 text-sm">
        <dt className="text-muted-foreground">Source</dt>
        <dd>
          <FilePath path={record.path} line={record.line} />
        </dd>
        <dt className="text-muted-foreground">Category</dt>
        <dd className="capitalize">{record.category}</dd>
        <dt className="text-muted-foreground">Status</dt>
        <dd>
          <ProvenanceTag value={record.provenance} />
        </dd>
      </dl>
      <pre className="mt-5 overflow-x-auto bg-ink p-4 font-mono text-[12px] leading-relaxed text-on-ink">
        <code>{record.excerpt}</code>
      </pre>
      <p className="eyebrow mt-6 text-muted-foreground">Why it matters</p>
      <p className="mt-2 leading-relaxed">{record.significance}</p>
    </article>
  );
}
