import type { RepositoryDossier } from "@/data/types";

/**
 * Baseline demonstration repository dossier ("ghost-notes").
 * This is explicitly labeled fictional sample data representing a digital archaeology specimen.
 */
export const SAMPLE_ARCHIVE: RepositoryDossier = {
  isSample: true,
  specimen: "SPECIMEN 001",
  name: "ghost-notes",
  description:
    "A local-first collaborative note-taking application using CRDTs that was abandoned during peer sync engine stabilization.",
  language: "TypeScript",
  license: "MIT",
  firstCommit: "2022-04-10",
  lastCommit: "2024-11-18",
  commitCount: 142,
  todoCount: 7,
  contributors: 2,
  tree: [
    {
      name: "package.json",
      type: "file",
      note: "E-003",
    },
    {
      name: "README.md",
      type: "file",
    },
    {
      name: "src",
      type: "dir",
      children: [
        {
          name: "crdt",
          type: "dir",
          children: [
            { name: "clock.ts", type: "file" },
            { name: "merge.ts", type: "file", note: "E-002" },
          ],
        },
        {
          name: "editor",
          type: "dir",
          children: [{ name: "editor.ts", type: "file" }],
        },
        {
          name: "storage",
          type: "dir",
          children: [{ name: "sqlite.ts", type: "file", note: "E-004" }],
        },
        { name: "index.ts", type: "file" },
      ],
    },
    {
      name: "tests",
      type: "dir",
      children: [{ name: "sync.test.ts", type: "file", note: "E-001" }],
    },
  ],
  commits: [
    {
      hash: "8f3a1c2",
      date: "2024-11-18",
      author: "Elena Vance",
      message: "wip: attempt to patch crdt merge divergence",
      kind: "last",
      files: ["src/crdt/merge.ts"],
    },
    {
      hash: "5d2e7f1",
      date: "2024-09-04",
      author: "Marcus Chen",
      message: "skip flaky merge tests on high peer count",
      kind: "abandon",
      files: ["tests/sync.test.ts"],
    },
    {
      hash: "3b8c9d0",
      date: "2024-06-12",
      author: "Elena Vance",
      message: "fix: sqlite transaction isolation during sync",
      kind: "fix",
      files: ["src/storage/sqlite.ts"],
    },
    {
      hash: "7e1a2f4",
      date: "2023-11-20",
      author: "Marcus Chen",
      message: "feat: add vector clock comparator",
      kind: "feature",
      files: ["src/crdt/clock.ts"],
    },
    {
      hash: "4c6d8e9",
      date: "2023-05-15",
      author: "Elena Vance",
      message: "feat: markdown editor note syncing",
      kind: "feature",
      files: ["src/editor/editor.ts"],
    },
    {
      hash: "2f5a7b8",
      date: "2022-10-02",
      author: "Marcus Chen",
      message: "feat: local sqlite document store",
      kind: "feature",
      files: ["src/storage/sqlite.ts"],
    },
    {
      hash: "1a0b3c4",
      date: "2022-04-10",
      author: "Elena Vance",
      message: "init: ghost-notes local-first notebook",
      kind: "origin",
      files: ["package.json", "src/index.ts"],
    },
  ],
  evidence: [
    {
      id: "E-001",
      path: "tests/sync.test.ts",
      line: 8,
      category: "test",
      title: "Disabled synchronization unit test",
      summary: "Test suite for CRDT merge resolution was skipped.",
      excerpt: `describe.skip("merge conflict resolution under high concurrency", () => {\n  it("converges to identical state across 3 peers", () => {});\n});`,
      significance:
        "Skipped test demonstrates known concurrency failure when three or more peers attempt concurrent block editing.",
      provenance: "observed",
    },
    {
      id: "E-002",
      path: "src/crdt/merge.ts",
      line: 142,
      category: "remnant",
      title: "Unresolved vector clock edge case",
      summary: "FIXME comment indicates concurrent peer edits cause state divergence.",
      excerpt: `// FIXME: Handle concurrent updates when vector clocks diverge\nif (!clock.isComparable(remoteClock)) {\n  throw new Error("Vector clock divergence unhandled");\n}`,
      significance:
        "Direct source marker indicating the root cause of the synchronization failure that preceded project abandonment.",
      provenance: "observed",
    },
    {
      id: "E-003",
      path: "package.json",
      category: "dependency",
      title: "Deprecated peer dependency",
      summary: "automerge pinned to legacy alpha release.",
      excerpt: `"@automerge/automerge": "2.0.0-alpha.5"`,
      significance:
        "Legacy alpha dependency version lacks critical merge stability fixes and has multiple known upstream issues.",
      provenance: "observed",
    },
    {
      id: "E-004",
      path: "src/storage/sqlite.ts",
      line: 87,
      category: "remnant",
      title: "Unfinished transaction batching",
      summary: "TODO comment indicates bulk note import causes SQLite write lock timeout.",
      excerpt: `// TODO: Batch transaction writes to prevent WAL database lock\nfor (const op of operations) {\n  db.exec(op.sql);\n}`,
      significance:
        "Unbatched disk operations risk SQLite busy/lock errors during intensive synchronization exchanges.",
      provenance: "observed",
    },
    {
      id: "E-005",
      path: "src/crdt/merge.ts",
      category: "history",
      title: "Last recorded commit before abandonment",
      summary: "Final commit by maintainer attempting to patch peer synchronization crash.",
      excerpt: `commit 8f3a1c2\nAuthor: Elena Vance <elena@ghostnotes.dev>\nDate: 2024-11-18\n\nwip: attempt to patch crdt merge divergence`,
      significance:
        "Identifies the exact stopping point of the original maintainer's work on synchronization convergence.",
      provenance: "observed",
    },
    {
      id: "E-006",
      path: "package.json",
      category: "history",
      title: "Repository origin commit",
      summary: "Initial commit establishing ghost-notes local-first note architecture.",
      excerpt: `commit 1a0b3c4\nAuthor: Elena Vance <elena@ghostnotes.dev>\nDate: 2022-04-10\n\ninit: ghost-notes local-first notebook`,
      significance:
        "Establishes baseline repository lineage, original dependencies, and initial architectural intent.",
      provenance: "observed",
    },
  ],
  roadmap: [
    {
      priority: 1,
      phase: "stabilize",
      effort: "small",
      status: "proposed",
      title: "Lock dependencies & establish deterministic runtime",
      observedProblem:
        "Legacy @automerge/automerge@2.0.0-alpha.5 dependency in package.json causes peer protocol divergence.",
      explanation: "Verify package manifests in package.json and pin runtime dependencies.",
      evidence: ["E-003"],
      paths: ["package.json"],
    },
    {
      priority: 2,
      phase: "repair",
      effort: "medium",
      status: "needs-review",
      title: "Re-enable skipped test suites & resolve critical remnants",
      observedProblem:
        "Observed skipped test suite in tests/sync.test.ts:8 and critical FIXME in src/crdt/merge.ts:142.",
      explanation:
        "Address recorded remnant markers in src/crdt/merge.ts and unblock test executions in tests/sync.test.ts.",
      evidence: ["E-001", "E-002"],
      paths: ["tests/sync.test.ts", "src/crdt/merge.ts"],
    },
    {
      priority: 3,
      phase: "modernize",
      effort: "medium",
      status: "proposed",
      title: "Upgrade dependencies & build toolchain",
      observedProblem:
        "Unbatched SQLite transaction writes in src/storage/sqlite.ts:87 risk database lock contention during concurrent sync.",
      explanation:
        "Introduce WAL transaction batching in src/storage/sqlite.ts to resolve performance bottlenecks.",
      evidence: ["E-004"],
      paths: ["src/storage/sqlite.ts", "package.json"],
    },
    {
      priority: 4,
      phase: "revive",
      effort: "large",
      status: "proposed",
      title: "Resume stalled feature implementation",
      observedProblem:
        "Repository stalled after commit 8f3a1c2 (2024-11-18) during vector clock reconciliation.",
      explanation:
        "Review changes in last recorded commit to resume author's final objective of complete peer synchronization.",
      evidence: ["E-005"],
      paths: ["src/crdt/merge.ts"],
    },
  ],
  recommendation: {
    verdict: "High-value candidate for targeted revival",
    rationale:
      "Core CRDT and storage primitives are well-structured with 142 commits of history. Primary stall point was isolated to vector clock tie-breaking under high concurrency [E-001, E-002], which is addressable with modern algorithms.",
  },
};
