import { useEffect, useMemo, useState } from "react";
import type { RepositoryDossier } from "@/data/types";
import { cn } from "@/lib/utils";

const W = 640;
const H = 560;
const AXIS_Y = 488;
const X0 = 56;
const X1 = 600;
const CENTER = { x: 300, y: 236 };

/** Data-driven specimen map of a repository's remains. */
export function ArchiveIndex({
  dossier,
  className,
}: {
  dossier: RepositoryDossier;
  className?: string;
}) {
  const [hover, setHover] = useState<string | null>(null);
  const [selected, setSelected] = useState(0);

  const t0 = new Date(dossier.firstCommit).getTime();
  const t1 = new Date(dossier.lastCommit).getTime();
  const years = useMemo(() => {
    const ys: number[] = [];
    for (let y = new Date(t0).getFullYear(); y <= new Date(t1).getFullYear() + 1; y++) ys.push(y);
    return ys;
  }, [t0, t1]);
  const xFor = (iso: string | number) => {
    const t = typeof iso === "number" ? iso : new Date(iso).getTime();
    const span =
      new Date(`${years.at(-1)}-01-01`).getTime() - new Date(`${years[0]}-01-01`).getTime();
    return X0 + ((t - new Date(`${years[0]}-01-01`).getTime()) / span) * (X1 - X0);
  };

  const ys = [120, 360, 96, 392, 168] as const;
  const nodes = dossier.commits.map((c, i) => {
    const yVal = ys[i % ys.length] ?? 120;
    return { ...c, x: xFor(c.date), y: yVal };
  });
  const evidenceNodes = nodes.filter((n) => n.kind === "abandon" || n.kind === "feature");

  useEffect(() => {
    const id = setInterval(
      () => setSelected((s) => (s + 1) % Math.max(evidenceNodes.length, 1)),
      3200,
    );
    return () => clearInterval(id);
  }, [evidenceNodes.length]);

  const faded = [
    { x: 520, y: 70, label: "mobile/" },
    { x: 560, y: 300, label: "crdt/merge.ts" },
    { x: 92, y: 300, label: "docs/legacy" },
  ];

  const hovered = nodes.find((n) => n.hash === hover);

  return (
    <figure className={cn("relative", className)}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Archive index of ${dossier.name}: ${dossier.commits.length} indexed events from ${dossier.firstCommit} to ${dossier.lastCommit}`}
      >
        {/* grid */}
        <g className="text-border" stroke="currentColor" strokeWidth="1">
          {years.map((y) => (
            <line
              key={y}
              x1={xFor(`${y}-01-01`)}
              x2={xFor(`${y}-01-01`)}
              y1={24}
              y2={AXIS_Y}
              strokeDasharray="1 5"
            />
          ))}
        </g>

        {/* concentric specimen rings */}
        <g fill="none" className="text-faded" stroke="currentColor">
          <circle cx={CENTER.x} cy={CENTER.y} r="58" strokeWidth="1" />
          <circle cx={CENTER.x} cy={CENTER.y} r="128" strokeWidth="0.75" strokeDasharray="2 4" />
        </g>

        {/* connections — orthogonal elbows */}
        <g fill="none" strokeWidth="1">
          {nodes.map((n, i) => {
            const d = `M${CENTER.x},${CENTER.y} L${CENTER.x},${n.y} L${n.x},${n.y}`;
            const active = hover === n.hash;
            return (
              <path
                key={n.hash}
                d={d}
                pathLength={1000}
                className={cn(
                  "animate-draw transition-colors",
                  active
                    ? "stroke-cobalt"
                    : n.kind === "abandon"
                      ? "stroke-faded"
                      : "stroke-foreground/45",
                )}
                strokeDasharray={n.kind === "abandon" ? "3 3" : undefined}
                style={{ animationDelay: `${300 + i * 140}ms`, ["--len" as string]: 1000 }}
              />
            );
          })}
          {/* drop lines to axis */}
          {nodes.map((n, i) => (
            <line
              key={`d-${n.hash}`}
              x1={n.x}
              x2={n.x}
              y1={n.y}
              y2={AXIS_Y}
              className="stroke-border animate-fade-up"
              style={{ animationDelay: `${900 + i * 100}ms` }}
            />
          ))}
        </g>

        {/* faded, disconnected */}
        {faded.map((f, i) => (
          <g
            key={f.label}
            className="animate-fade-up"
            style={{ animationDelay: `${1400 + i * 120}ms` }}
          >
            <circle
              cx={f.x}
              cy={f.y}
              r="4"
              fill="none"
              className="stroke-faded"
              strokeDasharray="1.5 1.5"
            />
            <text x={f.x + 9} y={f.y + 3.5} className="fill-faded font-mono" fontSize="10">
              {f.label}
            </text>
          </g>
        ))}

        {/* timeline axis */}
        <line
          x1={X0}
          x2={X1}
          y1={AXIS_Y}
          y2={AXIS_Y}
          pathLength={1000}
          className="stroke-foreground animate-draw"
          style={{ animationDelay: "100ms", ["--len" as string]: 1000 }}
        />
        {years.map((y) => (
          <g key={`y-${y}`}>
            <line
              x1={xFor(`${y}-01-01`)}
              x2={xFor(`${y}-01-01`)}
              y1={AXIS_Y}
              y2={AXIS_Y + 6}
              className="stroke-foreground"
            />
            <text
              x={xFor(`${y}-01-01`)}
              y={AXIS_Y + 22}
              textAnchor="middle"
              className="fill-muted-foreground font-mono"
              fontSize="10"
            >
              {y}
            </text>
          </g>
        ))}
        {nodes.map((n) => (
          <rect
            key={`t-${n.hash}`}
            x={n.x - 2}
            y={AXIS_Y - 2}
            width="4"
            height="4"
            className={n.kind === "last" ? "fill-cobalt" : "fill-foreground"}
          />
        ))}

        {/* events */}
        {nodes.map((n, i) => {
          const isEvidence = evidenceNodes[selected]?.hash === n.hash;
          const left = n.x > 470;
          return (
            <g
              key={`n-${n.hash}`}
              className="cursor-pointer outline-none"
              tabIndex={0}
              onMouseEnter={() => setHover(n.hash)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(n.hash)}
              onBlur={() => setHover(null)}
            >
              <circle cx={n.x} cy={n.y} r="14" fill="transparent" />
              {isEvidence && (
                <circle
                  cx={n.x}
                  cy={n.y}
                  r="6"
                  fill="none"
                  className="stroke-cobalt animate-pulse-ring"
                />
              )}
              <circle
                cx={n.x}
                cy={n.y}
                r={n.kind === "origin" ? 5 : 4}
                className={cn(
                  "animate-node transition-colors",
                  n.kind === "abandon"
                    ? "fill-surface stroke-foreground"
                    : isEvidence || n.kind === "last"
                      ? "fill-cobalt"
                      : "fill-foreground",
                )}
                strokeWidth="1"
                style={{ animationDelay: `${500 + i * 160}ms` }}
              />
              <text
                x={left ? n.x - 10 : n.x + 10}
                y={n.y - 8}
                textAnchor={left ? "end" : "start"}
                className="fill-foreground font-mono animate-fade-up"
                fontSize="10"
                style={{ animationDelay: `${700 + i * 160}ms` }}
              >
                {(n.files[0] ?? "").split("/").pop() || n.hash}
              </text>
              <text
                x={left ? n.x - 10 : n.x + 10}
                y={n.y + 14}
                textAnchor={left ? "end" : "start"}
                className="fill-muted-foreground font-mono"
                fontSize="9"
              >
                {n.hash}
              </text>
            </g>
          );
        })}

        {/* central repository node */}
        <g className="animate-node" style={{ animationDelay: "200ms" }}>
          <rect x={CENTER.x - 9} y={CENTER.y - 9} width="18" height="18" className="fill-ink" />
          <rect x={CENTER.x - 3} y={CENTER.y - 3} width="6" height="6" className="fill-cobalt" />
        </g>
        <text
          x={CENTER.x + 18}
          y={CENTER.y + 4}
          className="fill-foreground font-display"
          fontSize="13"
          fontWeight="600"
        >
          {dossier.name}
        </text>

        {/* legend */}
        <g transform={`translate(${X0}, ${H - 26})`} className="font-mono" fontSize="9.5">
          <rect x="0" y="-5" width="8" height="8" className="fill-ink" />
          <text x="14" y="2" className="fill-muted-foreground">
            repository
          </text>
          <circle cx="104" cy="-1" r="3.5" className="fill-foreground" />
          <text x="112" y="2" className="fill-muted-foreground">
            commit
          </text>
          <circle cx="182" cy="-1" r="3.5" className="fill-surface stroke-foreground" />
          <text x="190" y="2" className="fill-muted-foreground">
            abandoned
          </text>
          <circle cx="276" cy="-1" r="3.5" className="fill-cobalt" />
          <text x="284" y="2" className="fill-muted-foreground">
            evidence
          </text>
          <circle
            cx="356"
            cy="-1"
            r="3.5"
            fill="none"
            className="stroke-faded"
            strokeDasharray="1.5 1.5"
          />
          <text x="364" y="2" className="fill-muted-foreground">
            unlinked
          </text>
        </g>
      </svg>

      {hovered && (
        <div
          className="pointer-events-none absolute z-10 w-56 border border-foreground bg-surface p-3 shadow-[4px_4px_0_0_var(--color-ink)] animate-fade-up"
          style={{
            left: `${Math.min((hovered.x / W) * 100, 60)}%`,
            top: `${((hovered.y ?? 0) / H) * 100 + 4}%`,
          }}
        >
          <p className="font-mono text-[10.5px] text-muted-foreground">
            {hovered.hash} · {hovered.date}
          </p>
          <p className="mt-1 text-[13px] leading-snug">{hovered.message}</p>
        </div>
      )}
    </figure>
  );
}
