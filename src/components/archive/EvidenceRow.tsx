import { ChevronRight } from "lucide-react";
import type { EvidenceRecord } from "@/data/types";
import { cn } from "@/lib/utils";
import { FilePath, ProvenanceTag } from "./primitives";

export function EvidenceRow({
  record,
  active,
  onSelect,
  dense,
}: {
  record: EvidenceRecord;
  active: boolean;
  onSelect: () => void;
  dense?: boolean;
}) {
  return (
    <li>
      <button
        onClick={onSelect}
        aria-pressed={active}
        className={cn(
          "group grid w-full grid-cols-[64px_1fr_auto] items-start gap-4 border-b border-border py-4 pl-3 pr-2 text-left transition-colors",
          active ? "bg-cobalt-pale" : "hover:bg-surface",
        )}
      >
        <span
          className={cn(
            "font-mono text-[12px] pt-0.5",
            active ? "text-cobalt" : "text-muted-foreground",
          )}
        >
          {record.id}
        </span>
        <span className="min-w-0">
          <FilePath path={record.path} line={record.line} className="block truncate" />
          {!dense && (
            <span className="mt-1 block text-[14px] leading-snug text-muted-foreground">
              {record.summary}
            </span>
          )}
          <span className="mt-2 flex flex-wrap items-center gap-4">
            <span className="eyebrow text-muted-foreground">{record.category}</span>
            <ProvenanceTag value={record.provenance} />
          </span>
        </span>
        <ChevronRight
          strokeWidth={1.5}
          className={cn(
            "mt-0.5 h-4 w-4 transition-transform",
            active
              ? "translate-x-0.5 text-cobalt"
              : "text-faded group-hover:translate-x-0.5 group-hover:text-foreground",
          )}
        />
      </button>
    </li>
  );
}
