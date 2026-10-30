import path from "node:path";
import type { IngestionJob, RepositoryDossier } from "../../src/data/types";
import { analyzeRepository } from "../analyzer";
import { CONFIG } from "../config";
import { cleanWorkspace, safelyExtractZip } from "../security/zip-validator";
import { excavationStore } from "../storage";

export interface JobWithResult extends IngestionJob {
  resultId?: string;
  dossier?: RepositoryDossier;
}

export class JobManager {
  private jobs = new Map<string, JobWithResult>();

  createJob(archiveName: string): JobWithResult {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const job: JobWithResult = {
      jobId,
      archiveName,
      status: "queued",
      progressPercent: 0,
    };

    this.jobs.set(jobId, job);
    excavationStore.saveJob(job).catch(console.error);
    return job;
  }

  getJob(jobId: string): JobWithResult | undefined {
    return this.jobs.get(jobId);
  }

  updateJob(jobId: string, updates: Partial<JobWithResult>): JobWithResult {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);

    Object.assign(job, updates);
    excavationStore.saveJob(job).catch(console.error);
    return job;
  }

  async processArchive(jobId: string, zipBuffer: Buffer): Promise<RepositoryDossier> {
    const workspaceId = `excavation_${jobId}`;
    const workspaceDir = path.join(CONFIG.TEMP_DIR, workspaceId);

    try {
      // 1. Preparing
      this.updateJob(jobId, { status: "preparing", progressPercent: 10 });

      // 2. Extracting
      this.updateJob(jobId, { status: "extracting", progressPercent: 35 });
      const { entryPaths } = safelyExtractZip(zipBuffer, workspaceDir);

      // 3. Analyzing
      this.updateJob(jobId, { status: "analyzing", progressPercent: 75 });
      const job = this.jobs.get(jobId);
      const archiveName = job?.archiveName || "repository.zip";
      const dossier = await analyzeRepository(workspaceDir, archiveName, entryPaths);

      // Generate a stable excavation ID based on repository name and timestamp
      const excavationId = `exc_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
      dossier.specimen = `SPECIMEN ${excavationId.slice(-4).toUpperCase()}`;

      // Persist the completed excavation
      await excavationStore.saveExcavation(excavationId, dossier);

      // 4. Completed
      this.updateJob(jobId, {
        status: "completed",
        progressPercent: 100,
        resultId: excavationId,
        dossier,
      });

      return dossier;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.updateJob(jobId, {
        status: "failed",
        error: errorMsg,
      });
      throw err;
    } finally {
      // Always safely clean up the temporary workspace
      cleanWorkspace(workspaceDir);
    }
  }
}

export const jobManager = new JobManager();
