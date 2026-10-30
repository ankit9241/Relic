/**
 * @vitest-environment node
 */
import request from "supertest";
import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { createApp } from "../app";
import { excavationStore } from "../storage";
import { ollamaService } from "../ai/ollama-service";

describe("Local AI Synthesis (Ollama & Gemma Interrogation)", () => {
  const app = createApp();

  beforeAll(async () => {
    await excavationStore.init();
  });

  afterAll(async () => {
    await excavationStore.close();
  });

  it("reports Ollama capabilities on GET /api/health", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.ai).toBeDefined();
    expect(res.body.ai.provider).toBe("ollama");
    expect(res.body.ai.model).toBe("gemma3:4b");
    expect(typeof res.body.capabilities.localAiSynthesis).toBe("boolean");
  });

  it("rejects missing question on POST /api/excavations/:id/interrogate", async () => {
    const res = await request(app)
      .post("/api/excavations/sample/interrogate")
      .send({ question: "   " });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("MISSING_QUESTION");
  });

  it("returns 404 for unknown excavation ID on interrogation", async () => {
    const res = await request(app)
      .post("/api/excavations/unknown_nonexistent_id/interrogate")
      .send({ question: "What is this repo?" });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("EXCAVATION_NOT_FOUND");
  });

  it("interrogates sample archive using live Ollama when available", async () => {
    const status = await ollamaService.checkStatus();

    // If Ollama is running and gemma3 is loaded on the test machine
    if (status.available && status.modelAvailable) {
      const res = await request(app).post("/api/excavations/sample/interrogate").send({
        question: "What unfinished remnants or memory leaks exist in the codebase?",
      });

      expect(res.status).toBe(200);
      expect(res.body.answer).toBeDefined();
      expect(typeof res.body.answer).toBe("string");
      expect(res.body.answer.length).toBeGreaterThan(10);
      expect(Array.isArray(res.body.referencedEvidenceIds)).toBe(true);
      expect(Array.isArray(res.body.referencedPaths)).toBe(true);
      expect(res.body.model).toBe("gemma3:4b");
      expect(res.body.excavationId).toBe("sample");
    } else {
      // If Ollama is offline or model is missing, verify clean structured 503 response
      const res = await request(app)
        .post("/api/excavations/sample/interrogate")
        .send({ question: "What unfinished features exist?" });

      expect(res.status).toBe(503);
      expect(res.body.error).toBeDefined();
      expect(["OLLAMA_UNAVAILABLE", "MODEL_UNAVAILABLE"]).toContain(res.body.error.code);
    }
  }, 60000);
});
