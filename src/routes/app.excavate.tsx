import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, FileArchive, RefreshCw, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Dossier } from "@/components/archive/Dossier";
import { Eyebrow } from "@/components/archive/primitives";
import { EngineUnavailableNotice, ErrorState } from "@/components/archive/StatusStates";
import { Action, actionVariants } from "@/components/ui/action";
import { archiveApiClient, ArchiveApiError } from "@/api/client";
import { formatBytes, validateArchive } from "@/data/archive-adapter";
import type { EngineConfig, IngestionJob, RepositoryDossier } from "@/data/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/excavate")({
  head: () => ({
    meta: [
      { title: "New excavation — RELIC" },
      { name: "description", content: "Choose a repository archive to begin its excavation." },
      { property: "og:title", content: "New excavation — RELIC" },
      {
        property: "og:description",
        content: "Choose a repository archive to begin its excavation.",
      },
    ],
  }),
  component: Excavate,
});

const STAGE_LABELS: Record<string, string> = {
  queued: "Queued for excavation…",
  preparing: "Preparing secure workspace…",
  extracting: "Safely inspecting & extracting archive…",
  analyzing: "Analyzing AST, remnants, dependencies & Git history…",
  completed: "Excavation complete",
  failed: "Excavation failed",
};

function Excavate() {
  const [file, setFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const [engineConfig, setEngineConfig] = useState<EngineConfig | null>(null);
  const [activeJob, setActiveJob] = useState<IngestionJob | null>(null);
  const [completedDossier, setCompletedDossier] = useState<RepositoryDossier | null>(null);
  const [operationError, setOperationError] = useState<{ message: string; code?: string } | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check engine health on mount
  useEffect(() => {
    let mounted = true;
    archiveApiClient
      .getEngineStatus()
      .then((cfg) => {
        if (mounted) setEngineConfig(cfg);
      })
      .catch(() => {
        if (mounted) setEngineConfig(null);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Poll active ingestion job if processing
  useEffect(() => {
    if (!activeJob || activeJob.status === "completed" || activeJob.status === "failed") {
      return;
    }

    const intervalId = setInterval(async () => {
      try {
        const updated = await archiveApiClient.getIngestionStatus(activeJob.jobId);
        if (!updated) return;

        setActiveJob(updated);

        if (updated.status === "completed" && updated.resultId) {
          clearInterval(intervalId);
          // Fetch the completed excavation dossier
          const dossier = await archiveApiClient.getExcavation(updated.resultId);
          if (dossier) {
            setCompletedDossier(dossier);
          }
        } else if (updated.status === "failed") {
          clearInterval(intervalId);
          setOperationError({
            message: updated.error || "Analysis failed during extraction or processing.",
            code: "ANALYSIS_FAILED",
          });
        }
      } catch (pollErr) {
        console.error("Status polling error:", pollErr);
      }
    }, 800);

    return () => clearInterval(intervalId);
  }, [activeJob]);

  const accept = (f: File | undefined) => {
    if (!f) return;
    const err = validateArchive(f);
    setValidationError(err);
    setOperationError(null);
    setFile(err ? null : f);
  };

  const handleBeginExcavation = async () => {
    if (!file) return;

    setIsSubmitting(true);
    setOperationError(null);

    try {
      const job = await archiveApiClient.submitArchive(file);
      setActiveJob(job);
    } catch (err) {
      if (err instanceof ArchiveApiError) {
        setOperationError({ message: err.message, code: err.code });
      } else {
        setOperationError({
          message: err instanceof Error ? err.message : "Failed to submit archive.",
          code: "SUBMIT_FAILED",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setValidationError(null);
    setOperationError(null);
    setActiveJob(null);
    setCompletedDossier(null);
    if (input.current) input.current.value = "";
  };

  const isEngineOnline = engineConfig?.status === "ready" || engineConfig?.status === "connected";

  // If excavation is complete, render the completed result dossier with navigation actions
  if (completedDossier && activeJob?.resultId) {
    return (
      <div className="mx-auto max-w-6xl animate-fade-up">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
          <div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-cobalt" />
              <Eyebrow>Excavation Result · {activeJob.resultId}</Eyebrow>
            </div>
            <h1 className="mt-2 font-display text-4xl font-medium md:text-5xl">
              {completedDossier.name}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/app/evidence"
              search={{ id: completedDossier.evidence[0]?.id, excavationId: activeJob.resultId }}
              className={actionVariants({ variant: "primary", size: "sm" })}
            >
              Explore Evidence ({completedDossier.evidence.length}){" "}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              to="/app/roadmap"
              search={{ excavationId: activeJob.resultId }}
              className={actionVariants({ variant: "outline", size: "sm" })}
            >
              Resurrection Plan
            </Link>
            <button
              onClick={handleReset}
              className={actionVariants({ variant: "ghost", size: "sm" })}
            >
              Start another excavation
            </button>
          </div>
        </div>

        <Dossier dossier={completedDossier} />
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-12">
      <div className="lg:col-span-5">
        <Eyebrow>Operation / new excavation</Eyebrow>
        <h1 className="mt-6 font-display text-5xl font-medium leading-[0.98] md:text-6xl">
          Bring something
          <br />
          back.
        </h1>
        <p className="mt-6 max-w-sm text-lg leading-relaxed text-muted-foreground">
          Choose a repository to begin its excavation.
        </p>
        <ol className="mt-10 space-y-3 border-t border-border pt-6 font-mono text-[12px] text-muted-foreground">
          <li>
            <span className="text-foreground">01</span> — Select a .zip of the repository, including
            .git
          </li>
          <li>
            <span className="text-foreground">02</span> — Files are read and indexed, never executed
          </li>
          <li>
            <span className="text-foreground">03</span> — Deterministic analysis runs on your local
            machine
          </li>
        </ol>

        <div className="mt-8">
          <p className="font-mono text-[11px] text-muted-foreground">Engine connection:</p>
          {isEngineOnline ? (
            <p className="mt-1 flex items-center gap-2 font-mono text-[12px] text-foreground">
              <span className="h-2 w-2 rounded-full bg-cobalt" />
              Local engine connected ({engineConfig.endpoint})
            </p>
          ) : (
            <p className="mt-1 flex items-center gap-2 font-mono text-[12px] text-warn">
              <span className="h-2 w-2 rounded-full bg-warn" />
              Local engine offline (run: npm run server)
            </p>
          )}
        </div>
      </div>

      <div className="lg:col-span-7">
        {!activeJob ? (
          <>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDrag(true);
              }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDrag(false);
                accept(e.dataTransfer.files[0]);
              }}
              className={cn(
                "relative border bg-surface transition-colors",
                drag
                  ? "border-cobalt bg-cobalt-pale"
                  : validationError
                    ? "border-destructive"
                    : "border-foreground",
              )}
            >
              {/* corner registration marks */}
              {[
                "-left-px -top-px border-l-2 border-t-2",
                "-right-px -top-px border-r-2 border-t-2",
                "-left-px -bottom-px border-l-2 border-b-2",
                "-right-px -bottom-px border-r-2 border-b-2",
              ].map((c) => (
                <span key={c} className={cn("absolute h-3 w-3 border-cobalt", c)} />
              ))}
              <div className="flex items-center justify-between border-b border-border px-5 py-3 font-mono text-[11px] text-muted-foreground">
                <span>INTAKE / ARCHIVE</span>
                <span>.zip · max {formatBytes(200 * 1024 * 1024)}</span>
              </div>

              {file ? (
                <div className="flex items-center gap-4 px-5 py-8">
                  <FileArchive className="h-6 w-6 text-cobalt" strokeWidth={1.25} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-[14px]">{file.name}</p>
                    <p className="font-mono text-[12px] text-muted-foreground">
                      {formatBytes(file.size)} · client checks passed
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setFile(null);
                      if (input.current) input.current.value = "";
                    }}
                    aria-label="Remove file"
                    className="p-1.5 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" strokeWidth={1.5} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => input.current?.click()}
                  className="flex w-full items-center gap-5 px-5 py-12 text-left"
                >
                  <FileArchive className="h-6 w-6 text-muted-foreground" strokeWidth={1.25} />
                  <span>
                    <span className="block text-[15px]">
                      Drop a repository archive here, or{" "}
                      <span className="text-cobalt underline underline-offset-4">
                        choose a file
                      </span>
                    </span>
                    <span className="mt-1 block font-mono text-[12px] text-muted-foreground">
                      ZIP only. Files are extracted strictly into a temporary local sandbox.
                    </span>
                  </span>
                </button>
              )}
              <input
                ref={input}
                type="file"
                accept=".zip,application/zip"
                className="sr-only"
                onChange={(e) => {
                  accept(e.target.files?.[0]);
                  e.currentTarget.value = "";
                }}
                aria-label="Choose ZIP archive"
              />
            </div>
            {validationError && (
              <p role="alert" className="mt-3 font-mono text-[12px] text-destructive">
                {validationError}
              </p>
            )}

            {operationError && (
              <div className="mt-6">
                <ErrorState
                  title="Excavation Error"
                  message={operationError.message}
                  onRetry={() => setOperationError(null)}
                />
              </div>
            )}

            <div className="mt-8 flex flex-wrap items-center gap-5 border-t border-border pt-6">
              <Action disabled={!file || isSubmitting} onClick={handleBeginExcavation}>
                {isSubmitting ? "Uploading archive…" : "Begin excavation"}
              </Action>
              {file && (
                <span className="flex items-center gap-2 font-mono text-[12px] text-muted-foreground">
                  <span className="relative h-px w-16 overflow-hidden bg-border">
                    <span className="absolute inset-y-0 w-1/4 bg-cobalt animate-scan" />
                  </span>
                  Prepared — ready to excavate
                </span>
              )}
            </div>

            {!isEngineOnline && (
              <div className="mt-6">
                <EngineUnavailableNotice />
              </div>
            )}
          </>
        ) : (
          /* Processing State with real progress and stage indicator */
          <div className="border border-border bg-surface p-8 shadow-[4px_4px_0_0_var(--color-ink)]">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-3">
                <FileArchive className="h-5 w-5 text-cobalt" />
                <span className="font-mono text-[13px] font-medium">{activeJob.archiveName}</span>
              </div>
              <span className="font-mono text-[12px] text-cobalt">
                {activeJob.progressPercent}%
              </span>
            </div>

            <div className="mt-8">
              <div className="relative h-2 w-full overflow-hidden rounded-xs bg-border">
                <div
                  className="h-full bg-cobalt transition-all duration-500 ease-out"
                  style={{ width: `${Math.max(activeJob.progressPercent, 5)}%` }}
                />
              </div>

              <div className="mt-4 flex items-center justify-between">
                <p className="font-mono text-[13px] text-foreground">
                  {STAGE_LABELS[activeJob.status] || "Processing repository…"}
                </p>
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cobalt opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-cobalt" />
                </span>
              </div>

              <p className="mt-2 text-xs text-muted-foreground">
                Phase 2 deterministic pipeline: ZIP validation, safety scan, remnant detection, and
                Git history extraction. No code is executed.
              </p>

              {activeJob.status === "failed" && (
                <div className="mt-6 border-t border-border pt-4">
                  <p className="font-mono text-sm text-destructive">
                    {activeJob.error || "Analysis failed."}
                  </p>
                  <button
                    onClick={handleReset}
                    className="mt-4 inline-flex items-center gap-2 rounded-sm border border-border bg-paper px-3 py-1.5 font-mono text-[12px] text-foreground hover:bg-surface"
                  >
                    <RefreshCw className="h-3.5 w-3.5" /> Try again
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
