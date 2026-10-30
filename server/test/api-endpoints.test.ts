/**
 * @vitest-environment node
 */
import AdmZip from "adm-zip";
import request from "supertest";
import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { createApp } from "../app";
import { excavationStore } from "../storage";

describe("Server API Endpoints", () => {
  const app = createApp();

  beforeAll(async () => {
    await excavationStore.init();
  });

  afterAll(async () => {
    await excavationStore.close();
  });

  describe("GET /api/health", () => {
    it("returns service health and deterministic capabilities", async () => {
      const res = await request(app).get("/api/health");
      expect(res.status).toBe(200);
      expect(res.body.status).toBe("ready");
      expect(res.body.capabilities.deterministicAnalysis).toBe(true);
      expect(typeof res.body.capabilities.localAiSynthesis).toBe("boolean");
      expect(res.body.capabilities.fileExecutionAllowed).toBe(false);
    });
  });

  describe("POST /api/excavations", () => {
    it("rejects request when archive file is missing", async () => {
      const res = await request(app).post("/api/excavations");
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("MISSING_ARCHIVE_FILE");
    });

    it("rejects non-zip files", async () => {
      const res = await request(app)
        .post("/api/excavations")
        .attach("archive", Buffer.from("fake text"), "notes.txt");

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("UNSUPPORTED_ARCHIVE_FORMAT");
    });

    it("rejects malicious zip with invalid binary signature", async () => {
      const fakeZipHeader = Buffer.from("NOT_A_REAL_ZIP");
      const res = await request(app)
        .post("/api/excavations")
        .attach("archive", fakeZipHeader, "malicious.zip");

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("INVALID_ZIP_MAGIC");
    });

    it("accepts a valid repository zip and triggers background analysis", async () => {
      const zip = new AdmZip();
      zip.addFile(
        "package.json",
        Buffer.from(
          JSON.stringify({
            name: "sample-repo-test",
            version: "1.0.0",
            scripts: { test: "vitest" },
          }),
        ),
      );
      zip.addFile(
        "src/index.ts",
        Buffer.from("// TODO: finish implementation\nconsole.log('hi');"),
      );
      const zipBuffer = zip.toBuffer();

      const res = await request(app)
        .post("/api/excavations")
        .attach("archive", zipBuffer, "sample-repo-test.zip");

      expect(res.status).toBe(202);
      expect(res.body.success).toBe(true);
      expect(res.body.jobId).toBeDefined();
      expect(res.body.archiveName).toBe("sample-repo-test.zip");
      expect(res.body.status).toMatch(/^(queued|preparing|extracting|analyzing|completed)$/);
    });
  });

  describe("GET /api/excavations/:id", () => {
    it("returns the built-in sample archive for sample ID", async () => {
      const res = await request(app).get("/api/excavations/sample");
      expect(res.status).toBe(200);
      expect(res.body.name).toBe("ghost-notes");
      expect(res.body.isSample).toBe(true);
      expect(res.body.evidence.length).toBeGreaterThan(0);
    });

    it("returns 404 for non-existent excavation ID", async () => {
      const res = await request(app).get("/api/excavations/non_existent_id");
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("EXCAVATION_NOT_FOUND");
    });
  });

  describe("GET /api/excavations/:id/evidence", () => {
    it("returns evidence array for sample archive", async () => {
      const res = await request(app).get("/api/excavations/sample/evidence");
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0].id).toBe("E-001");
    });
  });

  describe("GET /api/excavations/:id/files", () => {
    it("returns tree structure for sample archive", async () => {
      const res = await request(app).get("/api/excavations/sample/files");
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });
  });
});
