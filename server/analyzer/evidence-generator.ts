import type { EvidenceRecord, RoadmapItem } from "../../src/data/types";
import type { GitAnalysisResult } from "./git-history";
import type { ManifestAnalysisResult } from "./manifests";
import type { RemnantsScanResult } from "./remnants";

export interface EvidenceGenerationInput {
  repoName: string;
  manifest: ManifestAnalysisResult;
  git: GitAnalysisResult;
  remnants: RemnantsScanResult;
  filePaths: string[];
}

/**
 * Generates verified, fact-anchored EvidenceRecords and deterministic roadmap steps.
 * All evidence records are tagged with provenance="observed".
 */
export function generateEvidence(input: EvidenceGenerationInput): {
  evidence: EvidenceRecord[];
  roadmap: RoadmapItem[];
  fileNotes: Record<string, string>;
  recommendation: { verdict: string; rationale: string };
} {
  const evidence: EvidenceRecord[] = [];
  const fileNotes: Record<string, string> = {};
  let counter = 1;

  const nextId = () => `E-${String(counter++).padStart(3, "0")}`;

  // 1. Dependency Evidence
  const criticalDep =
    input.manifest.dependencies.find((d) => d.note) || input.manifest.dependencies[0];
  if (criticalDep) {
    const id = nextId();
    fileNotes[criticalDep.manifestPath] = id;
    evidence.push({
      id,
      path: criticalDep.manifestPath,
      category: "dependency",
      title: criticalDep.note || `Declared dependency: ${criticalDep.name}`,
      summary: `${criticalDep.name}@${criticalDep.version} pinned in ${criticalDep.manifestPath}.`,
      excerpt: `"${criticalDep.name}": "${criticalDep.version}"`,
      significance: criticalDep.note
        ? `${criticalDep.name} version is legacy. Any revival must begin with validating runtime compatibility.`
        : `Key runtime dependency declared in project manifest.`,
      provenance: "observed",
    });
  }

  // 2. Unfinished Remnant (TODO / FIXME) Evidence
  const topRemnant = input.remnants.remnants[0];
  if (topRemnant) {
    const id = nextId();
    fileNotes[topRemnant.path] = id;
    evidence.push({
      id,
      path: topRemnant.path,
      line: topRemnant.line,
      category: "remnant",
      title: `Unfinished work: ${topRemnant.text.slice(0, 50)}`,
      summary: `Found ${topRemnant.type.toUpperCase()} marker at line ${topRemnant.line}.`,
      excerpt: topRemnant.excerpt,
      significance: `Direct marker in source indicating incomplete implementation or intended future work.`,
      provenance: "observed",
    });
  }

  // 3. Test Evidence (Disabled or test suite presence)
  if (input.remnants.skippedTests.length > 0) {
    const skipped = input.remnants.skippedTests[0]!;
    const id = nextId();
    fileNotes[skipped.path] = id;
    evidence.push({
      id,
      path: skipped.path,
      line: skipped.line,
      category: "test",
      title: `Skipped or disabled test suite found`,
      summary: `Test execution skipped in ${skipped.path} at line ${skipped.line}.`,
      excerpt: skipped.excerpt,
      significance: `Disabled test cases define expected behaviour for uncompleted features or flaky paths.`,
      provenance: "observed",
    });
  } else if (input.remnants.testFiles.length > 0) {
    const testFile = input.remnants.testFiles[0]!;
    const id = nextId();
    fileNotes[testFile] = id;
    evidence.push({
      id,
      path: testFile,
      category: "test",
      title: `Test suite files present`,
      summary: `Found ${input.remnants.testFiles.length} test files in repository.`,
      excerpt: `File: ${testFile}`,
      significance: `Automated test files can serve as executable specifications during repository revival.`,
      provenance: "observed",
    });
  }

  // 4. Git History Evidence
  if (input.git.available && input.git.commits.length > 0) {
    const lastCommit = input.git.commits[0]!;
    const id = nextId();
    const primaryFile = lastCommit.files[0] || "Git log";
    if (lastCommit.files[0]) {
      fileNotes[lastCommit.files[0]] = id;
    }
    evidence.push({
      id,
      path: primaryFile,
      category: "history",
      title: `Last recorded commit: ${lastCommit.hash}`,
      summary: `${lastCommit.date} by ${lastCommit.author}: "${lastCommit.message}"`,
      excerpt: `commit ${lastCommit.hash}\nAuthor: ${lastCommit.author}\nDate: ${lastCommit.date}\n\n${lastCommit.message}`,
      significance: `Indicates when active development ceased and which files were touched in the final commit.`,
      provenance: "observed",
    });
  }

  // 5. Additional Remnant or Manifest Evidence
  if (input.remnants.remnants.length > 1) {
    const secondRemnant = input.remnants.remnants[1]!;
    const id = nextId();
    if (!fileNotes[secondRemnant.path]) {
      fileNotes[secondRemnant.path] = id;
    }
    evidence.push({
      id,
      path: secondRemnant.path,
      line: secondRemnant.line,
      category: "remnant",
      title: `Additional marker: ${secondRemnant.text.slice(0, 50)}`,
      summary: `Found ${secondRemnant.type.toUpperCase()} marker at line ${secondRemnant.line}.`,
      excerpt: secondRemnant.excerpt,
      significance: `Source code notation noting needed changes or design concessions.`,
      provenance: "observed",
    });
  }

  // Fallback: If minimal evidence was generated, add an overview record
  if (evidence.length === 0) {
    const id = nextId();
    const firstFile = input.filePaths[0] || "README.md";
    fileNotes[firstFile] = id;
    evidence.push({
      id,
      path: firstFile,
      category: "history",
      title: "Repository file index initialized",
      summary: `Repository contains ${input.filePaths.length} indexed files.`,
      excerpt: `Indexed structure: ${input.filePaths.slice(0, 5).join("\n")}`,
      significance: "Initial baseline evidence record representing observed repository structure.",
      provenance: "observed",
    });
  }

  // Generate deterministic resurrection roadmap steps organized into 4 clear phases
  const roadmap: RoadmapItem[] = [];

  // Phase 1: Stabilize
  const depEvidence = evidence.find((e) => e.category === "dependency");
  roadmap.push({
    priority: 1,
    phase: "stabilize",
    observedProblem:
      input.manifest.manifestFiles.length > 0
        ? `Declared dependencies in ${input.manifest.manifestFiles.join(", ")} require runtime pinning and lockfile audit.`
        : "No standard package manifest detected in repository intake.",
    title: "Lock dependencies & establish deterministic runtime",
    explanation:
      input.manifest.manifestFiles.length > 0
        ? `Verify package manifests in ${input.manifest.manifestFiles.join(", ")} and pin runtime dependencies.`
        : "Establish a standard project manifest and dependency lockfile.",
    evidence: depEvidence ? [depEvidence.id] : [],
    paths: input.manifest.manifestFiles,
    effort: "small",
    status: "proposed",
  });

  // Phase 2: Repair
  const testEvidence = evidence.find((e) => e.category === "test");
  const remnantEvidence = evidence.filter((e) => e.category === "remnant");
  const repairEvidence = [
    ...(testEvidence ? [testEvidence.id] : []),
    ...remnantEvidence.slice(0, 2).map((e) => e.id),
  ];
  roadmap.push({
    priority: 2,
    phase: "repair",
    observedProblem:
      input.remnants.skippedTests.length > 0 || input.remnants.todoCount > 0
        ? `Observed ${input.remnants.todoCount} TODO/FIXME markers and ${input.remnants.skippedTests.length} disabled test suites.`
        : "Existing test coverage requires validation against current runtime.",
    title:
      input.remnants.skippedTests.length > 0
        ? "Re-enable skipped test suites & resolve critical remnants"
        : "Resolve recorded TODO and FIXME markers",
    explanation:
      remnantEvidence.length > 0
        ? `Address recorded remnant markers starting with ${remnantEvidence[0]?.path} and unblock test executions.`
        : "Construct baseline tests for core modules before attempting refactoring.",
    evidence: repairEvidence,
    paths: remnantEvidence.slice(0, 3).map((e) => e.path),
    effort: "medium",
    status: "needs-review",
  });

  // Phase 3: Modernize
  roadmap.push({
    priority: 3,
    phase: "modernize",
    observedProblem: `Codebase relies on ${input.manifest.dependencies.length} declared packages requiring modernization against current compiler targets.`,
    title: "Upgrade dependencies & build toolchain",
    explanation: `Audit and upgrade declared dependencies from ${input.manifest.manifestFiles[0] || "manifest"} to eliminate deprecation warnings.`,
    evidence: depEvidence ? [depEvidence.id] : [],
    paths: input.manifest.manifestFiles,
    effort: "medium",
    status: "proposed",
  });

  // Phase 4: Revive
  const historyEvidence = evidence.find((e) => e.category === "history");
  roadmap.push({
    priority: 4,
    phase: "revive",
    observedProblem: input.git.available
      ? `Repository stalled after commit ${input.git.commits[0]?.hash.slice(0, 7) || "HEAD"} (${input.git.lastCommit}).`
      : "No Git history available to track abandoned branch state.",
    title: "Resume stalled feature implementation",
    explanation: input.git.available
      ? `Review changes in last recorded commit (${input.git.lastCommit}) to resume author's final objective.`
      : "Reconstruct roadmap milestones from repository documentation and entrypoints.",
    evidence: historyEvidence ? [historyEvidence.id] : [],
    paths: input.git.commits[0]?.files || [],
    effort: "large",
    status: "proposed",
  });

  const recommendation = {
    verdict: input.git.available
      ? `Inspected — ${input.filePaths.length} files, ${input.git.commitCount} commits, ${input.remnants.todoCount} TODOs.`
      : `Inspected without Git history — ${input.filePaths.length} files, ${input.remnants.todoCount} TODOs.`,
    rationale: `Repository contains ${input.manifest.dependencies.length} declared dependencies and ${input.remnants.testFiles.length} test files. Verified facts have been extracted and indexed.`,
  };

  return {
    evidence,
    roadmap,
    fileNotes,
    recommendation,
  };
}
