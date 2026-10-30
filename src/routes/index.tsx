import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { ArchiveIndex } from "@/components/archive/ArchiveIndex";
import { Dossier } from "@/components/archive/Dossier";
import { Eyebrow, SectionHeading, Wordmark } from "@/components/archive/primitives";
import { actionVariants } from "@/components/ui/action";
import { SAMPLE_ARCHIVE } from "@/data/sample-archive";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "RELIC — Digital Archaeology for Software" },
      {
        name: "description",
        content:
          "Investigate forgotten codebases, uncover technical debt, and generate evidence-backed revival plans.",
      },
      { property: "og:title", content: "RELIC — Digital Archaeology for Software" },
      {
        property: "og:description",
        content: "Bring forgotten code back to life.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const PRINCIPLES = [
  ["Local-first AI", "Your code stays on your machine."],
  ["Evidence-backed", "Every claim cites a file or commit."],
  ["Open-source", "Inspectable, forkable foundations."],
];

const CHAPTERS = [
  ["01", "History", "Chronological records, commits, changes, and the last known activity."],
  [
    "02",
    "Remnants",
    "Unfinished tasks, orphaned modules, old dependencies, and traces of incomplete features.",
  ],
  ["03", "Resurrection", "Prioritized next steps supported by evidence, not guesswork."],
];

function Landing() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-border">
        <div className="shell flex h-16 items-center justify-between gap-6">
          <Wordmark />
          <nav
            className="hidden items-center gap-8 text-[13.5px] text-muted-foreground md:flex"
            aria-label="Primary"
          >
            <a href="#concept" className="hover:text-foreground">
              The archive concept
            </a>
            <a href="#method" className="hover:text-foreground">
              How it works
            </a>
            <a href="#open" className="hover:text-foreground">
              Open-source approach
            </a>
          </nav>
          <Link to="/app" className={actionVariants({ variant: "outline", size: "sm" })}>
            Open workspace
          </Link>
        </div>
      </header>

      {/* HERO */}
      <section id="concept" className="shell grid gap-10 pb-16 pt-12 lg:grid-cols-12 lg:pt-16">
        <div className="flex flex-col lg:col-span-5">
          <Eyebrow>Archive system / 001</Eyebrow>
          <h1 className="mt-8 font-display text-[clamp(3rem,6.6vw,6.25rem)] font-medium leading-[0.93]">
            Not everything
            <br />
            that disappears
            <br />
            <span className="text-muted-foreground">is lost.</span>
          </h1>
          <p className="mt-8 max-w-md text-lg leading-relaxed text-muted-foreground">
            Excavate abandoned repositories. Recover the stories buried in their code. Find out what
            deserves a second life.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-7">
            <Link to="/app/excavate" className={actionVariants({ size: "lg" })}>
              Begin excavation <ArrowRight strokeWidth={1.5} />
            </Link>
            <a href="#sample" className={actionVariants({ variant: "link", size: "none" })}>
              Explore the archive
            </a>
          </div>
          <dl className="mt-auto grid grid-cols-3 gap-5 pt-14">
            {PRINCIPLES.map(([k, v]) => (
              <div key={k} className="border-t border-foreground pt-3">
                <dt className="text-[13.5px] font-medium">{k}</dt>
                <dd className="mt-1 text-[12.5px] leading-snug text-muted-foreground">{v}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="relative lg:col-span-7">
          <div className="flex items-start justify-between border-b border-border pb-3 font-mono text-[11px] text-muted-foreground">
            <span>
              FIG. 1 — Archive index, <span className="text-foreground">{SAMPLE_ARCHIVE.name}</span>{" "}
              (sample)
            </span>
            <span className="text-right leading-relaxed">
              {SAMPLE_ARCHIVE.specimen}
              <br />
              STATUS: <span className="text-cobalt">UNEXCAVATED</span>
            </span>
          </div>
          <ArchiveIndex dossier={SAMPLE_ARCHIVE} className="mt-2" />
        </div>
      </section>

      {/* EVIDENCE SPREAD */}
      <section id="method" className="bg-ink py-24 text-on-ink md:py-32">
        <div className="shell">
          <SectionHeading
            tone="ink"
            index="§ 02 — Method"
            title={
              <>
                Every repository
                <br />
                leaves evidence.
              </>
            }
            lede="The code is only part of the story. The history lives in commits, unfinished work, dependencies, and the decisions that remain."
          />
          <div className="relative mt-20">
            <div className="absolute left-0 right-0 top-[7px] hidden h-px bg-ink-rule md:block" />
            <ol className="grid gap-12 md:grid-cols-3 md:gap-0">
              {CHAPTERS.map(([n, t, d], i) => (
                <li
                  key={n}
                  className={i > 0 ? "md:border-l md:border-ink-rule md:pl-8" : "md:pr-8"}
                >
                  <span
                    className={`relative block h-[15px] w-[15px] ${i === 2 ? "bg-cobalt" : "border border-on-ink bg-ink"}`}
                  />
                  <p className="mt-8 font-mono text-[12px] text-on-ink-muted">{n} /</p>
                  <h3 className="mt-2 font-display text-4xl font-medium md:text-5xl">{t}</h3>
                  <p className="mt-5 max-w-xs leading-relaxed text-on-ink-muted">{d}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* SAMPLE */}
      <section id="sample" className="shell py-24 md:py-32">
        <SectionHeading
          index="§ 03 — Sample excavation"
          title={
            <>
              A dossier,
              <br />
              not a dashboard.
            </>
          }
          lede="A fictional repository, written to show what an excavation surfaces. Select evidence to inspect it."
        />
        <div className="mt-16">
          <Dossier dossier={SAMPLE_ARCHIVE} />
        </div>
      </section>

      {/* OPEN */}
      <section id="open" className="border-t border-border">
        <div className="shell grid gap-8 py-20 md:grid-cols-12">
          <p className="eyebrow pt-3 text-muted-foreground md:col-span-2">§ 04 — Open</p>
          <h2 className="font-display text-4xl font-medium leading-[1.02] md:col-span-6 md:text-5xl">
            Some code deserves
            <br />a second life.
          </h2>
          <div className="md:col-span-4">
            <p className="leading-relaxed text-muted-foreground">
              Analysis runs locally against models you control. The methods, prompts and evidence
              format are open, so every conclusion can be reproduced.
            </p>
            <Link to="/app" className={`${actionVariants({ variant: "ink" })} mt-6`}>
              Open workspace <ArrowRight strokeWidth={1.5} />
            </Link>
          </div>
        </div>
        <footer className="shell flex flex-wrap justify-between gap-4 border-t border-border py-6 font-mono text-[11px] text-muted-foreground">
          <span>RELIC — Digital Archaeology for Software</span>
          <span>Sample content is fictional.</span>
        </footer>
      </section>
    </div>
  );
}
