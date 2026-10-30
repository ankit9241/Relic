import fs from "node:fs";
import path from "node:path";
import type { Excavation, IngestionJob, RepositoryDossier } from "../../src/data/types";
import type { ExcavationStore } from "./types";

interface SqliteDatabaseSync {
  exec(sql: string): void;
  prepare(sql: string): {
    run(...params: unknown[]): { changes: number; lastInsertRowid: number | bigint };
    all(...params: unknown[]): unknown[];
    get(...params: unknown[]): unknown;
  };
  close(): void;
}

export class SqliteExcavationStore implements ExcavationStore {
  private db: SqliteDatabaseSync | null = null;
  private dbPath: string;

  constructor(dbPath: string) {
    this.dbPath = dbPath;
  }

  async init(): Promise<void> {
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    try {
      // Dynamic import to handle environments gracefully in ESM
      const sqliteModule = (await import("node:sqlite")) as unknown as {
        DatabaseSync: new (path: string) => SqliteDatabaseSync;
      };
      this.db = new sqliteModule.DatabaseSync(this.dbPath);

      this.db.exec(`
        PRAGMA journal_mode = WAL;
        PRAGMA busy_timeout = 5000;

        CREATE TABLE IF NOT EXISTS excavations (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          specimen TEXT,
          commit_count INTEGER,
          evidence_count INTEGER,
          data TEXT NOT NULL,
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS jobs (
          job_id TEXT PRIMARY KEY,
          archive_name TEXT NOT NULL,
          status TEXT NOT NULL,
          progress_percent INTEGER NOT NULL,
          error TEXT,
          result_id TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
      `);
    } catch (err) {
      console.warn(
        "Notice: node:sqlite initialization error; storage operating in fallback mode.",
        err,
      );
      this.db = null;
    }
  }

  async saveExcavation(
    id: string,
    dossier: RepositoryDossier,
    metadata?: Partial<Excavation>,
  ): Promise<void> {
    const createdAt = metadata?.createdAt || new Date().toISOString();
    const name = dossier.name;
    const specimen = dossier.specimen;
    const commitCount = dossier.commitCount;
    const evidenceCount = dossier.evidence.length;
    const data = JSON.stringify(dossier);

    if (this.db) {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO excavations (id, name, specimen, commit_count, evidence_count, data, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(id, name, specimen, commitCount, evidenceCount, data, createdAt);
    } else {
      // Fallback JSON file storage
      const fallbackPath = path.join(path.dirname(this.dbPath), `excavation_${id}.json`);
      fs.writeFileSync(
        fallbackPath,
        JSON.stringify({ id, metadata, dossier, createdAt }, null, 2),
        "utf-8",
      );
    }
  }

  async getExcavation(id: string): Promise<RepositoryDossier | null> {
    if (this.db) {
      const stmt = this.db.prepare(`SELECT data FROM excavations WHERE id = ?`);
      const row = stmt.get(id) as { data: string } | undefined;
      if (!row) return null;
      try {
        return JSON.parse(row.data) as RepositoryDossier;
      } catch {
        return null;
      }
    } else {
      const fallbackPath = path.join(path.dirname(this.dbPath), `excavation_${id}.json`);
      if (!fs.existsSync(fallbackPath)) return null;
      try {
        const parsed = JSON.parse(fs.readFileSync(fallbackPath, "utf-8")) as {
          dossier: RepositoryDossier;
        };
        return parsed.dossier;
      } catch {
        return null;
      }
    }
  }

  async listExcavations(): Promise<Excavation[]> {
    if (this.db) {
      const stmt = this.db.prepare(
        `SELECT id, name, specimen, commit_count, evidence_count, created_at FROM excavations ORDER BY created_at DESC`,
      );
      const rows = stmt.all() as {
        id: string;
        name: string;
        specimen: string;
        commit_count: number;
        evidence_count: number;
        created_at: string;
      }[];

      return rows.map((r) => ({
        id: r.id,
        name: r.name,
        specimen: r.specimen,
        commitCount: r.commit_count,
        evidenceCount: r.evidence_count,
        createdAt: r.created_at,
        isSample: false,
      }));
    } else {
      const dir = path.dirname(this.dbPath);
      if (!fs.existsSync(dir)) return [];
      const files = fs
        .readdirSync(dir)
        .filter((f) => f.startsWith("excavation_") && f.endsWith(".json"));
      const items: Excavation[] = [];
      for (const file of files) {
        try {
          const content = JSON.parse(fs.readFileSync(path.join(dir, file), "utf-8")) as {
            id: string;
            createdAt: string;
            dossier: RepositoryDossier;
          };
          items.push({
            id: content.id,
            name: content.dossier.name,
            specimen: content.dossier.specimen,
            commitCount: content.dossier.commitCount,
            evidenceCount: content.dossier.evidence.length,
            createdAt: content.createdAt,
            isSample: false,
          });
        } catch {
          // ignore corrupted files
        }
      }
      return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
  }

  async deleteExcavation(id: string): Promise<boolean> {
    if (this.db) {
      const stmt = this.db.prepare(`DELETE FROM excavations WHERE id = ?`);
      const result = stmt.run(id);
      return result.changes > 0;
    } else {
      const fallbackPath = path.join(path.dirname(this.dbPath), `excavation_${id}.json`);
      if (fs.existsSync(fallbackPath)) {
        fs.unlinkSync(fallbackPath);
        return true;
      }
      return false;
    }
  }

  async saveJob(job: IngestionJob): Promise<void> {
    const now = new Date().toISOString();
    if (this.db) {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO jobs (job_id, archive_name, status, progress_percent, error, result_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, COALESCE((SELECT created_at FROM jobs WHERE job_id = ?), ?), ?)
      `);
      stmt.run(
        job.jobId,
        job.archiveName,
        job.status,
        job.progressPercent,
        job.error ?? null,
        job.resultId ?? null,
        job.jobId,
        now,
        now,
      );
    }
  }

  async getJob(jobId: string): Promise<IngestionJob | null> {
    if (this.db) {
      const stmt = this.db.prepare(
        `SELECT job_id, archive_name, status, progress_percent, error, result_id FROM jobs WHERE job_id = ?`,
      );
      const row = stmt.get(jobId) as
        | {
            job_id: string;
            archive_name: string;
            status: IngestionJob["status"];
            progress_percent: number;
            error: string | null;
            result_id: string | null;
          }
        | undefined;

      if (!row) return null;
      return {
        jobId: row.job_id,
        archiveName: row.archive_name,
        status: row.status,
        progressPercent: row.progress_percent,
        error: row.error ?? undefined,
        resultId: row.result_id ?? undefined,
      };
    }
    return null;
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}
