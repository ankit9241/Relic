import cors from "cors";
import express, { type Request, type Response, type NextFunction } from "express";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import multer from "multer";
import { CONFIG } from "./config";
import { excavationsRouter } from "./routes/excavations";
import { healthRouter } from "./routes/health";
import { ZipSecurityError } from "./security/zip-validator";

export function createApp() {
  const app = express();

  app.use(cors({ origin: CONFIG.CORS_ORIGIN }));
  app.use(express.json());

  // Register API routes
  app.use("/api/health", healthRouter);
  app.use("/api/excavations", excavationsRouter);

  // Return standard JSON 404 for any unmatched /api route (prevents falling through to SSR HTML)
  app.use("/api", (_req: Request, res: Response) => {
    res.status(404).json({
      error: {
        code: "NOT_FOUND",
        message: "API endpoint not found",
      },
    });
  });

  // Serve static assets from Vite/Nitro production build if available
  const publicDir = path.resolve(process.cwd(), ".output/public");
  if (fs.existsSync(publicDir)) {
    app.use(express.static(publicDir));
  }

  // TanStack Start SSR frontend via Nitro middleware in production
  const nitroServerPath = path.resolve(process.cwd(), ".output/server/index.mjs");
  let nitroMiddleware: ((req: Request, res: Response, next: NextFunction) => void) | null = null;
  let nitroLoadPromise: Promise<void> | null = null;

  async function getNitroMiddleware() {
    if (nitroMiddleware) return nitroMiddleware;
    if (!nitroLoadPromise) {
      nitroLoadPromise = (async () => {
        try {
          if (fs.existsSync(nitroServerPath)) {
            const nitroModule = (await import(pathToFileURL(nitroServerPath).href)) as {
              middleware?: (req: Request, res: Response, next: NextFunction) => void;
            };
            if (typeof nitroModule.middleware === "function") {
              nitroMiddleware = nitroModule.middleware;
            }
          }
        } catch (err) {
          console.error("Failed to load frontend SSR middleware:", err);
        }
      })();
    }
    await nitroLoadPromise;
    return nitroMiddleware;
  }

  // Preload SSR middleware if build artifacts are already present
  if (fs.existsSync(nitroServerPath)) {
    getNitroMiddleware().catch(() => {});
  }

  // Fallback to SSR middleware for client/page web routes
  app.use(async (req: Request, res: Response, next: NextFunction) => {
    try {
      const handler = await getNitroMiddleware();
      if (handler) {
        handler(req, res, next);
        return;
      }
      next();
    } catch (err) {
      next(err);
    }
  });

  // Centralized Error Handler
  app.use((err: unknown, _req: Request, res: Response, next: NextFunction): void => {
    if (res.headersSent) {
      next(err);
      return;
    }

    // Handle Multer upload limits
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        res.status(413).json({
          error: {
            code: "FILE_TOO_LARGE",
            message: `Archive exceeds maximum upload size of ${CONFIG.MAX_ZIP_SIZE_BYTES / (1024 * 1024)} MB.`,
          },
        });
        return;
      }
      res.status(400).json({
        error: {
          code: "UPLOAD_ERROR",
          message: err.message,
        },
      });
      return;
    }

    // Handle Zip Security Errors
    if (err instanceof ZipSecurityError) {
      res.status(err.status).json({
        error: {
          code: err.code,
          message: err.message,
        },
      });
      return;
    }

    // Standard unhandled error (sanitizes filesystem paths from output)
    const rawMessage = err instanceof Error ? err.message : String(err);
    // Sanitize any local directory paths that might leak internal structure
    const sanitizedMessage = rawMessage.replace(/[A-Za-z]:\\[^"'\n\r]+/g, "[internal-path]");

    console.error("Internal Server Error:", err);
    res.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: sanitizedMessage,
      },
    });
  });

  return app;
}
