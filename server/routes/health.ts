import { Router } from "express";
import { CONFIG } from "../config";
import { ollamaService } from "../ai/ollama-service";

export const healthRouter = Router();

healthRouter.get("/", async (_req, res) => {
  const ollamaStatus = await ollamaService.checkStatus();

  res.json({
    status: "ready",
    service: "RELIC Local Analysis Engine",
    version: "3.0.0",
    capabilities: {
      deterministicAnalysis: true,
      localAiSynthesis: ollamaStatus.available && ollamaStatus.modelAvailable,
      fileExecutionAllowed: false, // Strict execution sandbox
      maxArchiveSizeBytes: CONFIG.MAX_ZIP_SIZE_BYTES,
    },
    storagePersisted: true,
    ai: {
      provider: "ollama",
      baseUrl: CONFIG.OLLAMA_BASE_URL,
      model: CONFIG.OLLAMA_MODEL,
      available: ollamaStatus.available,
      modelAvailable: ollamaStatus.modelAvailable,
      models: ollamaStatus.models,
      error: ollamaStatus.error,
    },
  });
});
