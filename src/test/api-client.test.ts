import { describe, expect, it } from "vitest";
import { archiveApiClient, ArchiveApiError } from "@/api/client";
import { archiveAdapter } from "@/data/archive-adapter";
import { SAMPLE_ARCHIVE } from "@/data/sample-archive";

describe("Archive API client & adapter integration boundary", () => {
  it("reports engine as disconnected by default", async () => {
    const config = await archiveApiClient.getEngineStatus();
    expect(config.status).toBe("disconnected");
    expect(config.capabilities.deterministicAnalysis).toBe(true);
    expect(config.capabilities.fileExecutionAllowed).toBe(false);
  });

  it("provides sample repository dossier with intact specimen data", () => {
    const sample = archiveApiClient.getSampleDossier();
    expect(sample.name).toBe("ghost-notes");
    expect(sample.specimen).toBe("SPECIMEN 001");
    expect(sample.isSample).toBe(true);
    expect(sample.evidence.length).toBeGreaterThan(0);
    expect(sample.roadmap.length).toBeGreaterThan(0);
  });

  it("throws an ArchiveApiError when attempting submission without a connected engine", async () => {
    const dummyFile = new File(["test"], "repo.zip", { type: "application/zip" });
    await expect(archiveApiClient.submitArchive(dummyFile)).rejects.toThrow(ArchiveApiError);
  });

  it("keeps archiveAdapter backward-compatible with legacy expectations", async () => {
    expect(archiveAdapter.connected).toBe(false);
    expect(archiveAdapter.getSample()).toBe(SAMPLE_ARCHIVE);
    const excavations = await archiveAdapter.listExcavations();
    expect(excavations).toEqual([]);
  });
});
