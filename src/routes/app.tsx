import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Archive,
  FileSearch,
  LayoutGrid,
  Map,
  Plus,
  Search,
  Settings,
  Sparkles,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Wordmark } from "@/components/archive/primitives";
import { actionVariants } from "@/components/ui/action";
import { archiveApiClient } from "@/api/client";
import { SAMPLE_ARCHIVE } from "@/data/sample-archive";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app")({
  component: AppLayout,
});

const NAV = [
  { to: "/app", label: "Overview", icon: LayoutGrid, exact: true },
  { to: "/app/excavations", label: "Excavations", icon: Archive },
  { to: "/app/evidence", label: "Evidence", icon: FileSearch },
  { to: "/app/interrogate", label: "Interrogate", icon: Sparkles },
  { to: "/app/roadmap", label: "Resurrection plans", icon: Map },
  { to: "/app/settings", label: "Settings", icon: Settings },
] as const;

function AppLayout() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const search = useRouterState({ select: (s) => s.location.search }) as Record<string, unknown>;
  const activeEvidenceId = typeof search["id"] === "string" ? (search["id"] as string) : undefined;
  const [engineReady, setEngineReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    archiveApiClient.getEngineStatus().then((cfg) => {
      if (mounted && (cfg.status === "ready" || cfg.status === "connected")) {
        setEngineReady(true);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const currentLabel =
    path === "/app/excavate"
      ? "new excavation"
      : path === "/app/interrogate"
        ? "ai interrogation"
        : path === "/app/evidence" && activeEvidenceId
          ? `evidence / ${activeEvidenceId.toLowerCase()}`
          : path === "/app/roadmap"
            ? "resurrection plan"
            : path === "/app/excavations"
              ? "excavations"
              : path === "/app/settings"
                ? "settings"
                : path === "/app/evidence"
                  ? "evidence"
                  : "overview";

  return (
    <div className="flex min-h-screen flex-col md:flex-row" suppressHydrationWarning>
      <aside className="flex shrink-0 flex-col border-b border-border bg-surface md:sticky md:top-0 md:h-screen md:w-56 md:border-b-0 md:border-r">
        <div className="flex h-14 items-center px-5">
          <Wordmark to="/app" />
        </div>
        <nav
          aria-label="Workspace"
          className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:overflow-visible md:pt-4"
        >
          {NAV.map(({ to, label, icon: Icon, ...rest }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: "exact" in rest }}
              className="group flex shrink-0 items-center gap-3 border-l-2 border-transparent px-3 py-2 text-[13.5px] text-muted-foreground transition-colors hover:text-foreground data-[status=active]:border-cobalt data-[status=active]:bg-paper data-[status=active]:text-foreground"
            >
              <Icon className="h-4 w-4" strokeWidth={1.5} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto hidden px-5 py-5 font-mono text-[10.5px] leading-relaxed text-muted-foreground md:block">
          <p>Analysis engine</p>
          <Link
            to="/app/settings"
            className={cn(
              "inline-flex items-center gap-1.5 hover:underline",
              engineReady ? "text-cobalt" : "text-warn",
            )}
            title="Configure engine settings"
          >
            <span>● {engineReady ? "ready" : "not connected"}</span>
          </Link>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-4 border-b border-border bg-paper/95 px-5 backdrop-blur md:px-10">
          <p className="hidden font-mono text-[12px] text-muted-foreground sm:block">
            archive / <span className="text-foreground">{currentLabel}</span>
          </p>
          <CommandSearch />
          <Link to="/app/excavate" className={actionVariants({ size: "sm" })}>
            <Plus strokeWidth={1.5} /> <span className="hidden sm:inline">New excavation</span>
          </Link>
        </header>
        <main key={path} className="animate-fade-up flex-1 px-5 py-10 md:px-10 md:py-14">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function CommandSearch() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  const nav = useNavigate();

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        ref.current?.focus();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const hits = q
    ? SAMPLE_ARCHIVE.evidence.filter((e) =>
        `${e.id} ${e.path} ${e.title}`.toLowerCase().includes(q.toLowerCase()),
      )
    : [];

  const handleSelect = (id: string) => {
    nav({ to: "/app/evidence", search: { id } });
    setQ("");
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setOpen(false);
      ref.current?.blur();
    } else if (e.key === "Enter" && hits[0]) {
      e.preventDefault();
      handleSelect(hits[0].id);
    }
  };

  return (
    <div className="relative ml-auto w-full max-w-sm">
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
        strokeWidth={1.5}
      />
      <input
        ref={ref}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={handleKeyDown}
        placeholder="Search sample evidence…"
        aria-label="Search sample evidence"
        className="h-9 w-full rounded-sm border border-border bg-surface pl-9 pr-12 font-mono text-[12px] outline-none placeholder:text-muted-foreground focus:border-cobalt"
      />
      <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 font-mono text-[10px] text-muted-foreground">
        ⌘K
      </kbd>
      {open && q && (
        <ul className="absolute left-0 right-0 top-11 z-30 border border-foreground bg-surface shadow-[4px_4px_0_0_var(--color-ink)]">
          {hits.length ? (
            hits.map((h) => (
              <li key={h.id}>
                <button
                  type="button"
                  onMouseDown={() => handleSelect(h.id)}
                  className={cn(
                    "flex w-full gap-3 px-3 py-2 text-left font-mono text-[12px] hover:bg-cobalt-pale",
                  )}
                >
                  <span className="text-cobalt">{h.id}</span>
                  <span className="truncate">{h.path}</span>
                </button>
              </li>
            ))
          ) : (
            <li className="px-3 py-2 text-[13px] text-muted-foreground">No matching evidence.</li>
          )}
        </ul>
      )}
    </div>
  );
}
