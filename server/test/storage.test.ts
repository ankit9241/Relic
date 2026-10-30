import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { SAMPLE_ARCHIVE } from "../../src/data/sample-archive";
import type { IngestionJob, RepositoryDossier } from "../../src/data/types";
import { SqliteExcavationStore } from "../storage/sqlite-store";

describe("Storage Layer & Persistence", () => {
  let tempDbPath: string;
  let store: SqliteExcavationStore;

  beforeAll(async () => {
    tempDbPath = path.join(
      os.tmpdir(),
      `dead_archive_test_db_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.db`,
    );
    store = new SqliteExcavationStore(tempDbPath);
    await store.init();
  });

  afterAll(async () => {
    await store.close();
    try {
      if (fs.existsSync(tempDbPath)) fs.unlinkSync(tempDbPath);
    } catch {
      // ignore
    }
  });

  it("persists an excavation dossier and retrieves it accurately", async () => {
    const testDossier: RepositoryDossier = {
      ...SAMPLE_ARCHIVE,
      name: "persisted-repo",
      specimen: "SPECIMEN TEST",
    };

    await store.saveExcavation("exc_test_1", testDossier);

    const retrieved = await store.getExcavation("exc_test_1");
    expect(retrieved).toBeDefined();
    expect(retrieved?.name).toBe("persisted-repo");
    expect(retrieved?.specimen).toBe("SPECIMEN TEST");
    expect(retrieved?.evidence.length).toBe(SAMPLE_ARCHIVE.evidence.length);
  });

  it("lists all persisted excavations ordered by creation date", async () => {
    const list = await store.listExcavations();
    expect(list.length).toBeGreaterThanOrEqual(1);
    expect(list.some((item) => item.id === "exc_test_1")).toBe(true);
  });

  it("persists and updates ingestion jobs", async () => {
    const job: IngestionJob = {
      jobId: "job_test_100",
      archiveName: "repo.zip",
      status: "analyzing",
      progressPercent: 75,
    };

    await store.saveJob(job);
    const retrievedJob = await store.getJob("job_test_100");

    expect(retrievedJob).toBeDefined();
    expect(retrievedJob?.jobId).toBe("job_test_100");
    expect(retrievedJob?.status).toBe("analyzing");
    expect(retrievedJob?.progressPercent).toBe(75);
  });

  it("deletes an excavation from storage", async () => {
    const deleted = await store.deleteExcavation("exc_test_1");
    expect(deleted).toBe(true);

    const check = await store.getExcavation("exc_test_1");
    expect(check).toBeNull();
  });
});
