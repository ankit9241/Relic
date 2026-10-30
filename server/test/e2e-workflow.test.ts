/**
 * @vitest-environment node
 */
import AdmZip from "adm-zip";
import request from "supertest";
import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { createApp } from "../app";
import { excavationStore } from "../storage";

describe("End-to-End Analysis Workflow", () => {
  const app = createApp();

  beforeAll(async () => {
    await excavationStore.init();
  });

  afterAll(async () => {
    await excavationStore.close();
  });

  it("completes full lifecycle: upload, status polling, dossier, remnants, dependencies, and evidence generation", async () => {
    // 1. Check health
    const healthRes = await request(app).get("/api/health");
    expect(healthRes.status).toBe(200);
    expect(healthRes.body.status).toBe("ready");

    // 2. Synthesize a realistic multi-language repository archive
    const zip = new AdmZip();
    zip.addFile(
      "package.json",
      Buffer.from(
        JSON.stringify(
          {
            name: "e2e-archaeology-project",
            version: "2.1.0",
            scripts: { test: "vitest run", build: "vite build" },
            dependencies: { react: "^18.3.1", express: "^4.21.0" },
            devDependencies: { typescript: "^5.7.0" },
          },
          null,
          2,
        ),
      ),
    );
    zip.addFile(
      "src/index.ts",
      Buffer.from(
        "// TODO: Complete authentication pipeline\nexport const x = 42;\n// FIXME: Memory leak in subscription\n",
      ),
    );
    zip.addFile(
      "src/utils.py",
      Buffer.from("# HACK: Temporary workaround for parser\ndef parse(): pass\n"),
    );
    zip.addFile(
      "README.md",
      Buffer.from("# E2E Archaeology Project\nObserved repository documentation.\n"),
    );
    const zipBuffer = zip.toBuffer();

    // 3. Post to /api/excavations
    const uploadRes = await request(app)
      .post("/api/excavations")
      .attach("archive", zipBuffer, "e2e-archaeology-project.zip");

    expect(uploadRes.status).toBe(202);
    expect(uploadRes.body.success).toBe(true);
    const jobId = uploadRes.body.jobId;
    expect(jobId).toBeDefined();

    // 4. Poll until completed
    let statusRes;
    let completed = false;
    for (let i = 0; i < 40; i++) {
      statusRes = await request(app).get(`/api/excavations/${jobId}/status`);
      expect(statusRes.status).toBe(200);
      if (statusRes.body.status === "completed") {
        completed = true;
        break;
      }
      expect(statusRes.body.status).not.toBe("failed");
      await new Promise((r) => setTimeout(r, 100));
    }
    expect(completed).toBe(true);
    expect(statusRes?.body.progressPercent).toBe(100);

    // 5. Retrieve complete dossier
    const dossierRes = await request(app).get(`/api/excavations/${jobId}`);
    expect(dossierRes.status).toBe(200);
    const dossier = dossierRes.body;

    expect(dossier.name).toBe("e2e-archaeology-project");
    expect(dossier.isSample).toBe(false);
    expect(dossier.tree.length).toBeGreaterThanOrEqual(1);
    expect(dossier.todoCount).toBeGreaterThanOrEqual(2);
    expect(dossier.language).toBe("TypeScript");

    // Check evidence records
    expect(dossier.evidence.length).toBeGreaterThan(0);
    const firstEvidence = dossier.evidence[0];
    expect(firstEvidence.id).toBe("E-001");
    expect(firstEvidence.provenance).toBe("observed");

    // Check TODO / FIXME remnants
    const remnantEvidence = dossier.evidence.filter(
      (e: { category: string }) => e.category === "remnant",
    );
    expect(remnantEvidence.length).toBeGreaterThanOrEqual(2);
    const todoRecord = remnantEvidence.find((e: { excerpt: string }) =>
      e.excerpt.includes("Complete authentication pipeline"),
    );
    expect(todoRecord).toBeDefined();
    expect(todoRecord?.line).toBe(1);
    expect(todoRecord?.path).toBe("src/index.ts");

    // Check dependency evidence
    const depEvidence = dossier.evidence.filter(
      (e: { category: string }) => e.category === "dependency",
    );
    expect(depEvidence.length).toBeGreaterThan(0);
    expect(depEvidence.some((e: { excerpt: string }) => e.excerpt.includes("react"))).toBe(true);

    // 6. Test evidence endpoint
    const evidenceRes = await request(app).get(`/api/excavations/${jobId}/evidence`);
    expect(evidenceRes.status).toBe(200);
    expect(evidenceRes.body.length).toBe(dossier.evidence.length);

    // 7. Test file tree endpoint
    const filesRes = await request(app).get(`/api/excavations/${jobId}/files`);
    expect(filesRes.status).toBe(200);
    expect(Array.isArray(filesRes.body)).toBe(true);
    expect(filesRes.body.some((node: { name: string }) => node.name === "package.json")).toBe(true);

    // 8. Test excavations catalogue listing
    const listRes = await request(app).get("/api/excavations");
    expect(listRes.status).toBe(200);
    const excavationId = statusRes?.body.resultId;
    expect(
      listRes.body.some((item: { id: string }) => item.id === excavationId || item.id === jobId),
    ).toBe(true);
  });
});
