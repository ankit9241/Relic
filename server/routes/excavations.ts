import { Router, type Request, type Response, type NextFunction } from "express";
import multer from "multer";
import { SAMPLE_ARCHIVE } from "../../src/data/sample-archive";
import { CONFIG } from "../config";
import { jobManager } from "../jobs/job-manager";
import { validateZipMagicBytes, ZipSecurityError } from "../security/zip-validator";
import { excavationStore } from "../storage";
import { ollamaService, OllamaServiceError } from "../ai/ollama-service";

export const excavationsRouter = Router();

// Configure Multer in-memory upload handler with strict size bounds
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: CONFIG.MAX_ZIP_SIZE_BYTES,
    files: 1,
  },
});

/**
 * POST /api/excavations
 * Submits a ZIP archive for deterministic analysis.
 */
excavationsRouter.post(
  "/",
  upload.single("archive"),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const file = req.file;
      if (!file) {
        res.status(400).json({
          error: {
            code: "MISSING_ARCHIVE_FILE",
            message: "No archive file uploaded. Send a multipart request with 'archive' field.",
          },
        });
        return;
      }

      // Check filename extension
      if (!file.originalname.toLowerCase().endsWith(".zip")) {
        res.status(400).json({
          error: {
            code: "UNSUPPORTED_ARCHIVE_FORMAT",
            message: "Only .zip repository archives are accepted.",
          },
        });
        return;
      }

      // Check magic bytes before spawning job
      try {
        validateZipMagicBytes(file.buffer);
      } catch (validationErr) {
        if (validationErr instanceof ZipSecurityError) {
          res.status(validationErr.status).json({
            error: {
              code: validationErr.code,
              message: validationErr.message,
            },
          });
          return;
        }
        throw validationErr;
      }

      // Create tracking job
      const job = jobManager.createJob(file.originalname);

      // Trigger asynchronous background analysis
      jobManager.processArchive(job.jobId, file.buffer).catch((err) => {
        console.error(`Background analysis error for job ${job.jobId}:`, err);
      });

      res.status(202).json({
        success: true,
        jobId: job.jobId,
        archiveName: job.archiveName,
        status: job.status,
        progressPercent: job.progressPercent,
      });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * GET /api/excavations
 * Lists all indexed excavations.
 */
excavationsRouter.get(
  "/",
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const items = await excavationStore.listExcavations();
      res.json(items);
    } catch (err) {
      next(err);
    }
  },
);

function getParamId(req: Request): string | undefined {
  const raw = req.params["id"];
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw) && typeof raw[0] === "string") return raw[0];
  return undefined;
}

async function resolveDossier(id: string) {
  if (id === "sample" || id === "ghost-notes" || id === SAMPLE_ARCHIVE.specimen) {
    return SAMPLE_ARCHIVE;
  }
  const direct = await excavationStore.getExcavation(id);
  if (direct) return direct;

  const job = jobManager.getJob(id) || (await excavationStore.getJob(id));
  if (job?.resultId) {
    return await excavationStore.getExcavation(job.resultId);
  }
  return null;
}

/**
 * GET /api/excavations/:id
 * Retrieves full excavation dossier.
 */
excavationsRouter.get(
  "/:id",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = getParamId(req);
      if (!id) {
        res.status(400).json({ error: { code: "INVALID_ID", message: "Missing excavation id." } });
        return;
      }

      const dossier = await resolveDossier(id);
      if (!dossier) {
        res.status(404).json({
          error: {
            code: "EXCAVATION_NOT_FOUND",
            message: `Excavation '${id}' was not found in storage.`,
          },
        });
        return;
      }

      res.json(dossier);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * GET /api/excavations/:id/status
 * Queries status of an ongoing or completed excavation job.
 */
excavationsRouter.get(
  "/:id/status",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = getParamId(req);
      if (!id) {
        res.status(400).json({ error: { code: "INVALID_ID", message: "Missing job id." } });
        return;
      }

      // Check in-memory job manager first
      const job = jobManager.getJob(id);
      if (job) {
        res.json(job);
        return;
      }

      // Check store
      const storedJob = await excavationStore.getJob(id);
      if (storedJob) {
        res.json(storedJob);
        return;
      }

      // If ID matches an existing excavation, report completed
      const existing = await excavationStore.getExcavation(id);
      if (existing) {
        res.json({
          jobId: id,
          archiveName: existing.name,
          status: "completed",
          progressPercent: 100,
          resultId: id,
        });
        return;
      }

      res.status(404).json({
        error: {
          code: "JOB_NOT_FOUND",
          message: `Analysis job or excavation '${id}' was not found.`,
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * GET /api/excavations/:id/evidence
 * Returns all evidence records for an excavation.
 */
excavationsRouter.get(
  "/:id/evidence",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = getParamId(req);
      if (!id) {
        res.status(400).json({ error: { code: "INVALID_ID", message: "Missing excavation id." } });
        return;
      }

      const dossier = await resolveDossier(id);
      if (!dossier) {
        res.status(404).json({
          error: {
            code: "EXCAVATION_NOT_FOUND",
            message: `Excavation '${id}' was not found.`,
          },
        });
        return;
      }

      res.json(dossier.evidence);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * GET /api/excavations/:id/files
 * Returns directory tree for an excavation.
 */
excavationsRouter.get(
  "/:id/files",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = getParamId(req);
      if (!id) {
        res.status(400).json({ error: { code: "INVALID_ID", message: "Missing excavation id." } });
        return;
      }

      const dossier = await resolveDossier(id);
      if (!dossier) {
        res.status(404).json({
          error: {
            code: "EXCAVATION_NOT_FOUND",
            message: `Excavation '${id}' was not found.`,
          },
        });
        return;
      }

      res.json(dossier.tree);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * POST /api/excavations/:id/interrogate
 * Interrogates the excavation using Ollama and Gemma against verified repository evidence.
 */
excavationsRouter.post(
  "/:id/interrogate",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = getParamId(req);
      if (!id) {
        res.status(400).json({ error: { code: "INVALID_ID", message: "Missing excavation id." } });
        return;
      }

      const question = req.body?.question;
      if (typeof question !== "string" || !question.trim()) {
        res.status(400).json({
          error: {
            code: "MISSING_QUESTION",
            message:
              "Missing or invalid 'question' in request body. Provide a non-empty question string.",
          },
        });
        return;
      }

      const dossier = await resolveDossier(id);
      if (!dossier) {
        res.status(404).json({
          error: {
            code: "EXCAVATION_NOT_FOUND",
            message: `Excavation '${id}' was not found in storage.`,
          },
        });
        return;
      }

      const result = await ollamaService.interrogateRepository(dossier, question, id);
      res.json(result);
    } catch (err) {
      if (err instanceof OllamaServiceError) {
        res.status(err.status).json({
          error: {
            code: err.code,
            message: err.message,
            details: err.details,
          },
        });
        return;
      }
      next(err);
    }
  },
);
