import type { InterrogationResult, RepositoryDossier, RoadmapPhase } from "@/data/types";

const PHASE_TITLES: Record<RoadmapPhase, string> = {
  stabilize: "Phase 1: Stabilize (Runtime & Dependencies)",
  repair: "Phase 2: Repair (Broken Tests & Critical Remnants)",
  modernize: "Phase 3: Modernize (Toolchain & Architecture)",
  revive: "Phase 4: Revive (Feature Completion & Release)",
};

/**
 * Generates an evidence-backed forensic Markdown report from an excavation dossier
 * and optional local AI interrogation results.
 */
export function generateForensicMarkdownReport(
  dossier: RepositoryDossier,
  aiInterrogation?: InterrogationResult | null,
): string {
  const timestamp = new Date().toISOString();
  const lines: string[] = [];

  // Header & Title
  lines.push(`# RELIC FORENSIC DOSSIER`);
  lines.push(`**Evidence-Backed Repository Investigation & Resurrection Blueprint**`);
  lines.push(``);
  lines.push(`- **Specimen:** ${dossier.specimen}`);
  lines.push(`- **Repository Name:** ${dossier.name}`);
  lines.push(`- **Primary Language:** ${dossier.language}`);
  lines.push(`- **Declared License:** ${dossier.license}`);
  lines.push(`- **Report Generated:** ${timestamp}`);
  lines.push(
    `- **Verification Mode:** ${dossier.isSample ? "Demonstration Baseline" : "Forensic Repository Extraction"}`,
  );
  lines.push(``);
  lines.push(`---`);
  lines.push(``);

  // 1. Executive Verdict & Rationale
  lines.push(`## 1. Executive Verdict & Summary`);
  lines.push(``);
  lines.push(`**Forensic Verdict:** ${dossier.recommendation.verdict}`);
  lines.push(``);
  lines.push(`**Archaeological Rationale:** ${dossier.recommendation.rationale}`);
  lines.push(``);
  lines.push(`> [!NOTE]`);
  lines.push(
    `> All findings in this document are derived strictly from observed repository artifacts.`,
  );
  lines.push(`> Hypotheses are explicitly demarcated from verified evidence.`);
  lines.push(``);
  lines.push(`---`);
  lines.push(``);

  // 2. Vitality & Abandonment Signals
  lines.push(`## 2. Vitality & Abandonment Signals`);
  lines.push(``);
  lines.push(`| Metric | Observation | Forensic Implication |`);
  lines.push(`| :--- | :--- | :--- |`);
  lines.push(
    `| **Indexed File Count** | ${dossier.tree.length > 0 ? "Indexed structure" : "Files present"} | Baseline surface area |`,
  );
  lines.push(
    `| **Total Commits** | ${dossier.commitCount.toLocaleString()} | Depth of recorded history |`,
  );
  lines.push(
    `| **Active Contributors** | ${dossier.contributors} | Team size / single maintainer risk |`,
  );
  lines.push(`| **First Recorded Activity** | ${dossier.firstCommit} | Repository origin |`);
  lines.push(`| **Last Recorded Activity** | ${dossier.lastCommit} | Point of cessation / stall |`);
  lines.push(
    `| **Unresolved Remnants** | ${dossier.todoCount} TODO/FIXME markers | Technical debt volume |`,
  );
  lines.push(``);

  // Abandonment Etiology Analysis
  lines.push(`### Abandonment Diagnosis`);
  if (dossier.commits.length > 0) {
    const lastCommit = dossier.commits[0];
    lines.push(
      `The repository stalled following commit \`${lastCommit?.hash.slice(0, 7)}\` by **${lastCommit?.author}** on ${lastCommit?.date}:`,
    );
    lines.push(`> "${lastCommit?.message}"`);
  } else {
    lines.push(
      `Git commit history was not packaged in the repository archive (.git omitted). Vitality timeline reconstructed from manifest and file metadata.`,
    );
  }
  lines.push(``);
  lines.push(`---`);
  lines.push(``);

  // 3. Language & Dependency Architecture
  lines.push(`## 3. Language & Architecture Breakdown`);
  lines.push(``);
  lines.push(`- **Core Language:** ${dossier.language}`);
  lines.push(`- **License:** ${dossier.license}`);
  lines.push(``);

  const depEvidence = dossier.evidence.filter((e) => e.category === "dependency");
  if (depEvidence.length > 0) {
    lines.push(`### Declared Dependencies & Runtime Artifacts`);
    for (const dep of depEvidence) {
      lines.push(`- **[${dep.id}]** \`${dep.path}\`: ${dep.title} — ${dep.summary}`);
      if (dep.excerpt) {
        lines.push(`  \`\`\`json`);
        lines.push(`  ${dep.excerpt.trim()}`);
        lines.push(`  \`\`\``);
      }
    }
    lines.push(``);
  }

  lines.push(`---`);
  lines.push(``);

  // 4. Git History Summary
  lines.push(`## 4. Git History Summary`);
  lines.push(``);
  if (dossier.commits.length > 0) {
    lines.push(`| Commit | Date | Author | Message | Kind |`);
    lines.push(`| :--- | :--- | :--- | :--- | :--- |`);
    for (const c of dossier.commits.slice(0, 10)) {
      lines.push(
        `| \`${c.hash.slice(0, 7)}\` | ${c.date.slice(0, 10)} | ${c.author} | ${c.message.replace(/\|/g, "\\|")} | \`${c.kind}\` |`,
      );
    }
    if (dossier.commits.length > 10) {
      lines.push(`*... and ${dossier.commits.length - 10} earlier recorded commits.*`);
    }
  } else {
    lines.push(`*No Git commit records were detected in the ingested archive.*`);
  }
  lines.push(``);
  lines.push(`---`);
  lines.push(``);

  // 5. Verified Remnants (TODO / FIXME / HACK)
  lines.push(`## 5. Verified Code Remnants & Incomplete Work`);
  lines.push(``);
  lines.push(
    `Forensic scanning identified code markers indicating incomplete work or known flaws:`,
  );
  lines.push(``);
  lines.push(`| ID | Category | Location | Summary | Excerpt |`);
  lines.push(`| :--- | :--- | :--- | :--- | :--- |`);
  for (const e of dossier.evidence) {
    const loc = e.line ? `\`${e.path}:${e.line}\`` : `\`${e.path}\``;
    const cleanExcerpt = (e.excerpt || "").replace(/\n/g, " ").slice(0, 80);
    lines.push(
      `| **${e.id}** | \`${e.category}\` | ${loc} | ${e.title} | ${cleanExcerpt ? `\`${cleanExcerpt}\`` : "—"} |`,
    );
  }
  lines.push(``);
  lines.push(`---`);
  lines.push(``);

  // 6. Prioritized Resurrection Roadmap
  lines.push(`## 6. Prioritized Resurrection Roadmap`);
  lines.push(``);
  lines.push(
    `Actions are sequenced across four phases to systematically restore repository operability.`,
  );
  lines.push(``);

  const phaseOrder: RoadmapPhase[] = ["stabilize", "repair", "modernize", "revive"];

  for (const phase of phaseOrder) {
    const items = dossier.roadmap.filter(
      (r) => r.phase === phase || (!r.phase && defaultPhaseForPriority(r.priority) === phase),
    );

    if (items.length > 0) {
      lines.push(`### ${PHASE_TITLES[phase]}`);
      lines.push(``);
      for (const item of items) {
        lines.push(`#### Action ${String(item.priority).padStart(2, "0")}: ${item.title}`);
        if (item.observedProblem) {
          lines.push(`- **Observed Problem:** ${item.observedProblem}`);
        }
        lines.push(`- **Proposed Action:** ${item.explanation}`);
        lines.push(
          `- **Estimated Effort:** \`${item.effort}\` | **Current Status:** \`${item.status}\``,
        );
        if (item.evidence.length > 0) {
          lines.push(
            `- **Corroborating Evidence:** ${item.evidence.map((id) => `[${id}](#)`).join(", ")}`,
          );
        }
        if (item.paths && item.paths.length > 0) {
          lines.push(`- **Target Paths:** ${item.paths.map((p) => `\`${p}\``).join(", ")}`);
        }
        lines.push(``);
      }
    }
  }

  lines.push(`---`);
  lines.push(``);

  // 7. AI Interrogation Summary (only if available)
  lines.push(`## 7. AI Forensic Interrogation Summary`);
  lines.push(``);
  if (aiInterrogation && aiInterrogation.answer) {
    lines.push(`- **Synthesizing Model:** \`${aiInterrogation.model}\``);
    lines.push(`- **Session Timestamp:** ${aiInterrogation.timestamp}`);
    lines.push(
      `- **Citations Checked:** ${aiInterrogation.referencedEvidenceIds.length} evidence records, ${aiInterrogation.referencedPaths.length} file paths`,
    );
    lines.push(``);
    lines.push(`### Grounded Analysis`);
    lines.push(``);
    lines.push(aiInterrogation.answer);
    lines.push(``);
    if (aiInterrogation.referencedEvidenceIds.length > 0) {
      lines.push(
        `- **Referenced Evidence IDs:** ${aiInterrogation.referencedEvidenceIds.map((id) => `\`${id}\``).join(", ")}`,
      );
    }
    if (aiInterrogation.referencedPaths.length > 0) {
      lines.push(
        `- **Referenced File Paths:** ${aiInterrogation.referencedPaths.map((p) => `\`${p}\``).join(", ")}`,
      );
    }
  } else {
    lines.push(`*No interactive AI interrogation session was recorded for this dossier.*`);
    lines.push(
      `*Run an interrogation session in the RELIC Interrogate workspace to capture model assessments.*`,
    );
  }
  lines.push(``);

  lines.push(`---`);
  lines.push(``);
  lines.push(`*Report compiled by RELIC — Digital Archaeology for Software.*`);
  lines.push(`*Strictly grounded in observed repository artifacts. Zero unevidenced speculation.*`);

  return lines.join("\n");
}

function defaultPhaseForPriority(priority: number): RoadmapPhase {
  if (priority === 1) return "stabilize";
  if (priority === 2) return "repair";
  if (priority === 3) return "modernize";
  return "revive";
}

/**
 * Triggers a native client-side file download of the Markdown report.
 */
export function downloadMarkdownReport(filename: string, content: string): void {
  if (typeof window === "undefined") return;

  const sanitized = filename.toLowerCase().replace(/[^a-z0-9-_]+/g, "_");
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${sanitized}_forensic_report.md`;
  document.body.appendChild(anchor);
  anchor.click();

  // Cleanup
  setTimeout(() => {
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }, 150);
}
