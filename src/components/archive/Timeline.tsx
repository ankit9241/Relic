import type { CommitRecord } from "@/data/types";
import { cn } from "@/lib/utils";
import { FilePath } from "./primitives";

const KIND_LABEL: Record<CommitRecord["kind"], string> = {
  origin: "Origin",
  feature: "Feature",
  fix: "Fix",
  abandon: "Abandoned work",
  last: "Last recorded",
};

export function TimelineEntry({ c }: { c: CommitRecord }) {
  const marked = c.kind === "abandon" || c.kind === "last";
  return (
    <li className="group relative grid grid-cols-[96px_1fr] gap-x-6 pb-8 md:grid-cols-[120px_1fr]">
      <time className="pt-0.5 font-mono text-[12px] text-muted-foreground">{c.date}</time>
      <div className="relative border-l border-border pl-6">
        <span
          className={cn(
            "absolute -left-[5px] top-1.5 h-[9px] w-[9px]",
            c.kind === "abandon"
              ? "border border-foreground bg-paper"
              : c.kind === "last"
                ? "bg-cobalt"
                : "bg-foreground",
          )}
        />
        <p className={cn("eyebrow", marked ? "text-cobalt" : "text-muted-foreground")}>
          {KIND_LABEL[c.kind]} · {c.hash}
        </p>
        <p className="mt-1.5 text-[17px] leading-snug">{c.message}</p>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
          {c.files.map((f) => (
            <FilePath key={f} path={f} />
          ))}
          <span className="font-mono text-[12px] text-muted-foreground">@{c.author}</span>
        </div>
      </div>
    </li>
  );
}

export function Timeline({ commits }: { commits: CommitRecord[] }) {
  return (
    <ol>
      {commits.map((c) => (
        <TimelineEntry key={c.hash} c={c} />
      ))}
    </ol>
  );
}
