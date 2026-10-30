import { Link } from "@tanstack/react-router";
import { AlertCircle, ArrowRight, RefreshCw, Terminal } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function LoadingState({
  label = "Reading repository archive…",
  detail = "Extracting commits and source remnants",
  className,
}: {
  label?: string;
  detail?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center border border-border bg-surface px-6 py-12 text-center",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <div className="relative mb-4 h-1 w-24 overflow-hidden bg-border">
        <div className="absolute inset-y-0 w-1/3 bg-cobalt animate-scan" />
      </div>
      <p className="font-mono text-[13px] font-medium text-foreground">{label}</p>
      {detail ? <p className="mt-1 font-mono text-[11px] text-muted-foreground">{detail}</p> : null}
    </div>
  );
}

export function EngineUnavailableNotice({
  className,
  inline = false,
}: {
  className?: string;
  inline?: boolean;
}) {
  if (inline) {
    return (
      <div
        className={cn(
          "flex items-center justify-between border-l-2 border-warn bg-surface px-4 py-2.5 font-mono text-[12px]",
          className,
        )}
      >
        <span className="flex items-center gap-2 text-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-warn" />
          Engine not connected
        </span>
        <Link
          to="/app/settings"
          className="text-cobalt underline underline-offset-4 hover:text-foreground"
        >
          View settings →
        </Link>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "border border-border bg-surface p-6 shadow-[2px_2px_0_0_var(--color-ink)]",
        className,
      )}
    >
      <div className="flex items-start gap-4">
        <Terminal className="mt-0.5 h-5 w-5 shrink-0 text-warn" strokeWidth={1.5} />
        <div className="min-w-0 flex-1">
          <p className="eyebrow text-warn">Analysis engine offline</p>
          <h4 className="mt-1 font-display text-lg font-medium">
            Local excavation pipeline unavailable
          </h4>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            RELIC is currently in prototype mode. Repository ingestion requires a connected local
            analysis service. You can still inspect prepared archives and explore the sample
            dossier.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <Link
              to="/app/settings"
              className="inline-flex items-center gap-1.5 font-mono text-[12px] text-cobalt underline underline-offset-4 hover:text-foreground"
            >
              Configure engine status <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              to="/app/evidence"
              className="font-mono text-[12px] text-muted-foreground underline underline-offset-4 hover:text-foreground"
            >
              Explore sample archive
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ErrorState({
  title = "Excavation artifact unavailable",
  message = "An error occurred while loading this archive record.",
  onRetry,
  children,
  className,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("border border-destructive/60 bg-surface p-6", className)} role="alert">
      <div className="flex items-start gap-4">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" strokeWidth={1.5} />
        <div className="min-w-0 flex-1">
          <p className="eyebrow text-destructive">Artifact Error</p>
          <h4 className="mt-1 font-display text-lg font-medium text-foreground">{title}</h4>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{message}</p>
          {children ? <div className="mt-4">{children}</div> : null}
          {onRetry ? (
            <button
              onClick={onRetry}
              className="mt-4 inline-flex items-center gap-2 rounded-sm border border-border bg-paper px-3 py-1.5 font-mono text-[12px] text-foreground transition-colors hover:bg-surface"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Retry
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
