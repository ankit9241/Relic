import cors from "cors";
import express, { type Request, type Response, type NextFunction } from "express";
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

  // Centralized Error Handler
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction): void => {
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
