import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { Provenance } from "@/data/types";

export function ArchiveMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("h-5 w-5", className)} aria-hidden>
      <rect
        x="2.5"
        y="2.5"
        width="19"
        height="19"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
      />
      <line x1="2.5" y1="9" x2="21.5" y2="9" stroke="currentColor" strokeWidth="1.25" />
      <line x1="9" y1="9" x2="9" y2="21.5" stroke="currentColor" strokeWidth="1.25" />
      <circle cx="15.5" cy="15.5" r="2" className="fill-cobalt" />
    </svg>
  );
}

export function Wordmark({ to = "/" as const }: { to?: "/" | "/app" }) {
  return (
    <Link to={to} className="flex items-center gap-2.5 text-foreground">
      <ArchiveMark />
      <span className="font-display text-[15px] font-semibold tracking-tight">RELIC</span>
    </Link>
  );
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("eyebrow text-muted-foreground", className)}>{children}</p>;
}

export function FilePath({
  path,
  line,
  className,
}: {
  path: string;
  line?: number | undefined;
  className?: string | undefined;
}) {
  const parts = path.split("/");
  const file = parts.pop();
  return (
    <span className={cn("font-mono text-[12.5px]", className)}>
      <span className="text-muted-foreground">{parts.length ? parts.join("/") + "/" : ""}</span>
      <span>{file}</span>
      {line ? <span className="text-muted-foreground">:{line}</span> : null}
    </span>
  );
}

export function ProvenanceTag({ value }: { value: Provenance }) {
  const observed = value === "observed";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-mono text-[11px]",
        observed ? "text-foreground" : "text-warn",
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5",
          observed ? "bg-foreground" : "border border-warn rounded-full",
        )}
      />
      {observed ? "Observed fact" : "Hypothesis"}
    </span>
  );
}

export function SampleNotice({ className }: { className?: string }) {
  return (
    <p
      className={cn(
        "eyebrow inline-flex items-center gap-2 border-l-2 border-cobalt pl-2 text-cobalt",
        className,
      )}
    >
      Sample data · fictional repository · not scanned
    </p>
  );
}

export function SectionHeading({
  index,
  title,
  lede,
  tone = "paper",
}: {
  index: string;
  title: ReactNode;
  lede?: ReactNode;
  tone?: "paper" | "ink";
}) {
  return (
    <div className="grid gap-6 md:grid-cols-12">
      <p
        className={cn(
          "eyebrow md:col-span-2 pt-3",
          tone === "ink" ? "text-on-ink-muted" : "text-muted-foreground",
        )}
      >
        {index}
      </p>
      <h2 className="font-display md:col-span-6 text-4xl font-medium leading-[1.02] md:text-6xl">
        {title}
      </h2>
      {lede ? (
        <p
          className={cn(
            "md:col-span-4 self-end text-base leading-relaxed",
            tone === "ink" ? "text-on-ink-muted" : "text-muted-foreground",
          )}
        >
          {lede}
        </p>
      ) : null}
    </div>
  );
}

export function EmptyState({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children?: ReactNode;
}) {
  return (
    <div className="grid gap-6 border-y border-border py-12 md:grid-cols-12">
      <div className="md:col-span-2">
        <svg viewBox="0 0 48 48" className="h-12 w-12 text-faded" aria-hidden>
          <rect x="4" y="10" width="40" height="30" fill="none" stroke="currentColor" />
          <line x1="4" y1="18" x2="44" y2="18" stroke="currentColor" />
          <circle cx="24" cy="29" r="3" fill="none" stroke="currentColor" strokeDasharray="2 2" />
        </svg>
      </div>
      <div className="md:col-span-7">
        <h3 className="font-display text-2xl font-medium">{title}</h3>
        <p className="mt-2 max-w-lg leading-relaxed text-muted-foreground">{body}</p>
        {children ? <div className="mt-6 flex flex-wrap items-center gap-5">{children}</div> : null}
      </div>
    </div>
  );
}
