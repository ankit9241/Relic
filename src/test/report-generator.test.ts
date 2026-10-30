import { describe, expect, it } from "vitest";
import { generateForensicMarkdownReport } from "@/lib/report-generator";
import { SAMPLE_ARCHIVE } from "@/data/sample-archive";
import type { InterrogationResult } from "@/data/types";

describe("Forensic Markdown Report Generator", () => {
  it("generates complete forensic report without AI session", () => {
    const report = generateForensicMarkdownReport(SAMPLE_ARCHIVE);

    expect(report).toContain("# RELIC FORENSIC DOSSIER");
    expect(report).toContain("ghost-notes");
    expect(report).toContain("## 1. Executive Verdict & Summary");
    expect(report).toContain("## 2. Vitality & Abandonment Signals");
    expect(report).toContain("## 3. Language & Architecture Breakdown");
    expect(report).toContain("## 4. Git History Summary");
    expect(report).toContain("## 5. Verified Code Remnants & Incomplete Work");
    expect(report).toContain("## 6. Prioritized Resurrection Roadmap");
    expect(report).toContain("Phase 1: Stabilize");
    expect(report).toContain("Phase 2: Repair");
    expect(report).toContain("Phase 3: Modernize");
    expect(report).toContain("Phase 4: Revive");

    // Check evidence IDs and line numbers are present
    expect(report).toContain("E-001");
    expect(report).toContain("E-002");
    expect(report).toContain("E-003");
    expect(report).toContain("tests/sync.test.ts:8");

    // Check AI summary indicates no session was recorded
    expect(report).toContain("No interactive AI interrogation session was recorded");
  });

  it("includes AI interrogation findings when session is present", () => {
    const mockAi: InterrogationResult = {
      answer:
        "The repository was stalled because CRDT merge synchronization failed under high concurrency [E-001].",
      referencedEvidenceIds: ["E-001", "E-005"],
      referencedPaths: ["src/crdt/merge.ts"],
      model: "gemma3:4b",
      excavationId: "sample",
      timestamp: "2026-10-30T10:00:00.000Z",
    };

    const report = generateForensicMarkdownReport(SAMPLE_ARCHIVE, mockAi);

    expect(report).toContain("## 7. AI Forensic Interrogation Summary");
    expect(report).toContain("gemma3:4b");
    expect(report).toContain("CRDT merge synchronization failed");
    expect(report).toContain("E-001");
    expect(report).toContain("src/crdt/merge.ts");
  });
});
