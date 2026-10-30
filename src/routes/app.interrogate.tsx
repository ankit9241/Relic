import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  CheckCircle2,
  Clock,
  Download,
  HelpCircle,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Eyebrow, FilePath, SampleNotice } from "@/components/archive/primitives";
import { actionVariants } from "@/components/ui/action";
import { archiveApiClient, ArchiveApiError } from "@/api/client";
import { SAMPLE_ARCHIVE } from "@/data/sample-archive";
import type {
  EngineConfig,
  Excavation,
  InterrogationResult,
  RepositoryDossier,
} from "@/data/types";
import { downloadMarkdownReport, generateForensicMarkdownReport } from "@/lib/report-generator";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/interrogate")({
  validateSearch: (
    s: Record<string, unknown>,
  ): { excavationId?: string | undefined; q?: string | undefined } => ({
    excavationId: typeof s["excavationId"] === "string" ? s["excavationId"] : undefined,
    q: typeof s["q"] === "string" ? s["q"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "AI Interrogation — RELIC" },
      {
        name: "description",
        content: "Interrogate indexed repository evidence using local Ollama and Gemma.",
      },
      { property: "og:title", content: "AI Interrogation — RELIC" },
      {
        property: "og:description",
        content: "Forensic AI analysis grounded in repository evidence.",
      },
    ],
  }),
  component: InterrogatePage,
});

const SUGGESTED_QUESTIONS = [
  "Why was this repository abandoned or stalled?",
  "What incomplete features or architectural blockers remain?",
  "Are there critical bugs, memory leaks, or workarounds flagged in remnants?",
  "What dependencies are declared and what needs modernization?",
];

function InterrogatePage() {
  const { excavationId: paramExcavationId, q: paramQ } = Route.useSearch();
  const nav = useNavigate({ from: "/app/interrogate" });

  const [excavations, setExcavations] = useState<Excavation[]>([]);
  const [selectedId, setSelectedId] = useState<string>(paramExcavationId || "sample");
  const [dossier, setDossier] = useState<RepositoryDossier>(SAMPLE_ARCHIVE);
  const [engineConfig, setEngineConfig] = useState<EngineConfig | null>(null);

  const [question, setQuestion] = useState(paramQ || "");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<InterrogationResult | null>(null);
  const [errorState, setErrorState] = useState<{
    code: string;
    message: string;
    isTimeout?: boolean;
    isModelUnavailable?: boolean;
    isOffline?: boolean;
  } | null>(null);

  // Load engine status and available excavations
  useEffect(() => {
    let mounted = true;
    archiveApiClient.getEngineStatus().then((cfg) => {
      if (mounted) setEngineConfig(cfg);
    });

    archiveApiClient.listExcavations().then((list) => {
      if (mounted) setExcavations(list);
    });

    return () => {
      mounted = false;
    };
  }, []);

  // Synchronize dossier with selected excavation ID
  useEffect(() => {
    let mounted = true;
    if (selectedId && selectedId !== "sample" && selectedId !== "ghost-notes") {
      archiveApiClient.getExcavation(selectedId).then((res) => {
        if (mounted && res) {
          setDossier(res);
        } else if (mounted) {
          setDossier(SAMPLE_ARCHIVE);
        }
      });
    } else {
      setDossier(SAMPLE_ARCHIVE);
    }
    return () => {
      mounted = false;
    };
  }, [selectedId]);

  const handleSelectExcavation = (id: string) => {
    setSelectedId(id);
    setResult(null);
    setErrorState(null);
    void nav({
      search: (prev: Record<string, unknown>) => ({
        ...prev,
        excavationId: id === "sample" ? undefined : id,
      }),
    });
  };

  const handleInterrogate = async (customQ?: string) => {
    const qToAsk = (customQ ?? question).trim();
    if (!qToAsk) return;

    if (customQ) {
      setQuestion(customQ);
    }

    setIsLoading(true);
    setErrorState(null);

    try {
      const res = await archiveApiClient.interrogateExcavation(selectedId, qToAsk);
      setResult(res);
    } catch (err) {
      if (err instanceof ArchiveApiError) {
        const isOffline = err.code === "ENGINE_OFFLINE" || err.code === "OLLAMA_UNAVAILABLE";
        const isModelUnavailable = err.code === "MODEL_UNAVAILABLE";
        const isTimeout = err.code === "OLLAMA_TIMEOUT" || err.status === 504;

        setErrorState({
          code: err.code,
          message: err.message,
          isOffline,
          isModelUnavailable,
          isTimeout,
        });
      } else {
        setErrorState({
          code: "REQUEST_FAILED",
          message: err instanceof Error ? err.message : "Failed to interrogate repository.",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const isModelReady = Boolean(
    engineConfig?.capabilities.localAiSynthesis && engineConfig?.ai?.modelAvailable,
  );
  const ollamaModelName = engineConfig?.ai?.model || "gemma3:4b";
  const isSample = dossier.isSample;

  return (
    <div className="mx-auto max-w-5xl space-y-10">
      {/* Page Header */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Eyebrow>Digital Archaeology // Local AI Synthesis</Eyebrow>
          <div className="flex items-center gap-2 font-mono text-[11px]">
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                isModelReady ? "bg-cobalt animate-pulse" : "bg-warn",
              )}
            />
            <span className="text-muted-foreground">
              Ollama: <strong className="text-foreground">{ollamaModelName}</strong> (
              {isModelReady ? "ready" : engineConfig?.ai?.available ? "model missing" : "offline"})
            </span>
          </div>
        </div>

        <h1 className="mt-4 font-display text-4xl font-medium tracking-tight md:text-5xl">
          Repository Interrogation.
        </h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
          Forensic investigation powered by local AI. RELIC consults only verified evidence records,
          commit history, and code remnants—refusing to speculate when repository evidence is
          insufficient.
        </p>

        {isSample && <SampleNotice className="mt-4" />}
      </div>

      {/* Target Specimen Selector */}
      <section className="border-t border-border pt-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="eyebrow text-muted-foreground">Target Repository</h2>
            <div className="mt-1 flex items-baseline gap-3">
              <span className="font-display text-2xl font-medium">{dossier.name}</span>
              <span className="font-mono text-[12px] text-muted-foreground">
                ({dossier.specimen} · {dossier.evidence.length} evidence records ·{" "}
                {dossier.language})
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="excavation-select" className="sr-only">
              Choose Excavation
            </label>
            <select
              id="excavation-select"
              value={selectedId}
              onChange={(e) => handleSelectExcavation(e.target.value)}
              className="rounded-none border border-border bg-surface px-3 py-1.5 font-mono text-[13px] text-foreground focus:border-cobalt focus:outline-none"
            >
              <option value="sample">ghost-notes (Sample Specimen)</option>
              {excavations.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.specimen || item.id.slice(0, 8)})
                </option>
              ))}
            </select>

            <Link
              to="/app/evidence"
              search={{ excavationId: selectedId === "sample" ? undefined : selectedId }}
              className={actionVariants({ variant: "outline", size: "sm" })}
              title="Explore evidence records for this repository"
            >
              Browse Evidence <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Interrogation Query Interface */}
      <section className="space-y-4 rounded-none border border-border bg-surface p-6">
        <div>
          <label htmlFor="interrogation-input" className="eyebrow block text-muted-foreground">
            Interrogation Query
          </label>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <textarea
              id="interrogation-input"
              rows={3}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. Why did the previous developers abandon this architecture? What incomplete features exist?"
              className="w-full resize-none border border-border bg-paper p-3 text-[14px] leading-relaxed text-foreground placeholder:text-muted-foreground focus:border-cobalt focus:outline-none"
              disabled={isLoading}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  void handleInterrogate();
                }
              }}
            />
          </div>
        </div>

        {/* Action bar and suggested questions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <span className="font-mono text-[11px] text-faded">Suggested:</span>
            {SUGGESTED_QUESTIONS.map((sq, i) => (
              <button
                key={i}
                type="button"
                disabled={isLoading}
                onClick={() => void handleInterrogate(sq)}
                className="rounded-none border border-border bg-paper px-2.5 py-1 text-left font-mono text-[11.5px] text-muted-foreground transition hover:border-cobalt hover:text-foreground disabled:opacity-50"
              >
                {sq}
              </button>
            ))}
          </div>

          <button
            type="button"
            disabled={isLoading || !question.trim()}
            onClick={() => void handleInterrogate()}
            className={actionVariants({
              variant: "primary",
              size: "md",
              className: "cursor-pointer font-medium disabled:opacity-40",
            })}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin text-paper" />
                Interrogating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4 text-paper" />
                Interrogate Evidence
              </>
            )}
          </button>
        </div>
      </section>

      {/* Loading State */}
      {isLoading && (
        <div className="animate-fade-in border-l-2 border-cobalt bg-surface p-8">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-cobalt" />
            <div className="space-y-1">
              <p className="font-mono text-[13px] font-medium text-foreground">
                Synthesizing findings via Ollama ({ollamaModelName})...
              </p>
              <p className="text-[13px] text-muted-foreground">
                Evaluating {dossier.evidence.length} evidence records and repository tree against
                strict grounding rules.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error / Unavailable / Timeout States */}
      {errorState && !isLoading && (
        <div
          className={cn(
            "border-l-2 bg-surface p-6",
            errorState.isTimeout ? "border-warn" : "border-destructive",
          )}
          role="alert"
        >
          <div className="flex items-start gap-3">
            {errorState.isTimeout ? (
              <Clock className="mt-0.5 h-5 w-5 shrink-0 text-warn" />
            ) : (
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
            )}
            <div className="space-y-2">
              <div className="flex items-center gap-2 font-mono text-xs">
                <span className="font-semibold uppercase tracking-wider text-destructive">
                  [{errorState.code}]
                </span>
                <span className="text-muted-foreground">
                  {errorState.isModelUnavailable
                    ? "Model Not Found"
                    : errorState.isTimeout
                      ? "Request Timeout"
                      : "Interrogation Error"}
                </span>
              </div>
              <p className="text-[14px] leading-relaxed text-foreground">{errorState.message}</p>

              {errorState.isModelUnavailable && (
                <div className="mt-3 rounded border border-border bg-paper p-3 font-mono text-xs text-muted-foreground">
                  <p className="text-foreground">Required Action:</p>
                  <code className="mt-1 block text-cobalt">ollama pull {ollamaModelName}</code>
                  <p className="mt-2 text-[11px]">
                    Once downloaded, click Retry Interrogation below.
                  </p>
                </div>
              )}

              {errorState.isOffline && (
                <div className="mt-3 rounded border border-border bg-paper p-3 font-mono text-xs text-muted-foreground">
                  <p className="text-foreground">Service Instructions:</p>
                  <p className="mt-1">
                    1. Ensure Ollama is running locally:{" "}
                    <code className="text-cobalt">ollama serve</code>
                  </p>
                  <p className="mt-1">
                    2. Ensure the backend server is running:{" "}
                    <code className="text-cobalt">npm run server</code>
                  </p>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => void handleInterrogate()}
                  className={actionVariants({ variant: "outline", size: "sm" })}
                >
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Retry Interrogation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Synthesis Answer Display */}
      {result && !isLoading && (
        <article className="animate-fade-up border-l-2 border-cobalt bg-surface p-8 shadow-sm">
          <header className="border-b border-border pb-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Eyebrow className="text-cobalt">Grounded Forensic Assessment</Eyebrow>
              <div className="flex flex-wrap items-center gap-3 font-mono text-[11px] text-muted-foreground">
                <span>Model: {result.model}</span>
                <span>·</span>
                <span>{new Date(result.timestamp).toLocaleTimeString()}</span>
                <button
                  type="button"
                  onClick={() => {
                    const md = generateForensicMarkdownReport(dossier, result);
                    downloadMarkdownReport(`${dossier.name}_with_ai`, md);
                  }}
                  className="inline-flex items-center gap-1 border border-border bg-paper px-2 py-0.5 text-foreground transition hover:border-cobalt hover:text-cobalt"
                  title="Download complete forensic report including this AI session"
                >
                  <Download className="h-3 w-3 text-cobalt" /> Export Report (.md)
                </button>
              </div>
            </div>
            <h3 className="mt-2 font-display text-2xl font-medium leading-tight">
              &ldquo;{question}&rdquo;
            </h3>
          </header>

          {/* Model Answer Body */}
          <div className="prose prose-sm mt-6 max-w-none text-[15px] leading-relaxed text-foreground">
            {result.answer.split("\n\n").map((para, idx) => (
              <p key={idx} className="whitespace-pre-wrap">
                {para}
              </p>
            ))}
          </div>

          {/* Grounding & Evidence Citations */}
          <div className="mt-8 border-t border-dashed border-border pt-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Referenced Evidence IDs */}
              <div>
                <h4 className="eyebrow flex items-center gap-1.5 text-muted-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-cobalt" />
                  Referenced Evidence Citations ({result.referencedEvidenceIds.length})
                </h4>
                {result.referencedEvidenceIds.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {result.referencedEvidenceIds.map((id) => (
                      <Link
                        key={id}
                        to="/app/evidence"
                        search={{
                          excavationId: selectedId === "sample" ? undefined : selectedId,
                          id,
                        }}
                        className="inline-flex items-center gap-1.5 border border-cobalt/40 bg-cobalt/5 px-2.5 py-1 font-mono text-[12px] text-cobalt transition hover:border-cobalt hover:bg-cobalt/10"
                        title={`View evidence record ${id}`}
                      >
                        <span>{id}</span>
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 font-mono text-[12px] text-muted-foreground">
                    No individual evidence ID was explicitly cited in this response.
                  </p>
                )}
              </div>

              {/* Referenced File Paths */}
              <div>
                <h4 className="eyebrow text-muted-foreground">
                  Corroborating File Paths ({result.referencedPaths.length})
                </h4>
                {result.referencedPaths.length > 0 ? (
                  <ul className="mt-3 space-y-1.5">
                    {result.referencedPaths.map((p) => (
                      <li key={p}>
                        <FilePath path={p} className="text-foreground" />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 font-mono text-[12px] text-muted-foreground">
                    No specific file paths isolated for this finding.
                  </p>
                )}
              </div>
            </div>

            {/* Evidence boundary pledge */}
            <div className="mt-6 border-t border-border/50 pt-4 font-mono text-[11px] text-muted-foreground">
              <p>
                Note: RELIC operates with a zero-hallucination constraint. When evidence is absent
                or inconclusive, findings reflect observed repository data rather than model
                assumptions.
              </p>
            </div>
          </div>
        </article>
      )}
    </div>
  );
}
