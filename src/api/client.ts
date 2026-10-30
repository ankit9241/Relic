import type {
  EngineConfig,
  Excavation,
  IngestionJob,
  InterrogationResult,
  RepositoryDossier,
} from "@/data/types";
import { SAMPLE_ARCHIVE } from "@/data/sample-archive";

export class ArchiveApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(message: string, code = "ENGINE_UNAVAILABLE", status = 503) {
    super(message);
    this.name = "ArchiveApiError";
    this.code = code;
    this.status = status;
  }
}

export interface ArchiveApiClient {
  getEngineStatus(): Promise<EngineConfig>;
  listExcavations(): Promise<Excavation[]>;
  getExcavation(id: string): Promise<RepositoryDossier | null>;
  getSampleDossier(): RepositoryDossier;
  submitArchive(file: File): Promise<IngestionJob>;
  getIngestionStatus(jobId: string): Promise<IngestionJob | null>;
  interrogateExcavation(id: string, question: string): Promise<InterrogationResult>;
  setBaseUrl?(url: string): void;
}

export const defaultEngineConfig: EngineConfig = {
  status: "disconnected",
  capabilities: {
    deterministicAnalysis: true,
    localAiSynthesis: false,
    fileExecutionAllowed: false,
    maxArchiveSizeBytes: 200 * 1024 * 1024,
  },
  storagePersisted: false,
};

function getApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    const win = window as unknown as { __ENV__?: { VITE_API_URL?: string } };
    if (win.__ENV__?.VITE_API_URL) return win.__ENV__.VITE_API_URL;
  }

  if (typeof process !== "undefined" && process.env?.["VITE_API_URL"]) {
    return process.env["VITE_API_URL"];
  }

  return "http://127.0.0.1:3001";
}

/**
 * Standard implementation of the Archive API client.
 * Connects to the local Express backend while seamlessly preserving sample demonstration data.
 */
class ArchiveApiClientImpl implements ArchiveApiClient {
  private baseUrl: string = getApiBaseUrl();

  setBaseUrl(url: string) {
    this.baseUrl = url;
  }

  async getEngineStatus(): Promise<EngineConfig> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const res = await fetch(`${this.baseUrl}/api/health`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        return { ...defaultEngineConfig, status: "disconnected" };
      }

      const data = (await res.json()) as {
        status?: string;
        capabilities?: EngineConfig["capabilities"];
        storagePersisted?: boolean;
        ai?: EngineConfig["ai"];
      };

      return {
        status: data.status === "ready" ? "ready" : "connected",
        endpoint: this.baseUrl,
        capabilities: data.capabilities || defaultEngineConfig.capabilities,
        storagePersisted: data.storagePersisted ?? true,
        ai: data.ai,
      };
    } catch {
      return { ...defaultEngineConfig, status: "disconnected" };
    }
  }

  async listExcavations(): Promise<Excavation[]> {
    try {
      const res = await fetch(`${this.baseUrl}/api/excavations`);
      if (!res.ok) return [];
      const list = (await res.json()) as Excavation[];
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  }

  async getExcavation(id: string): Promise<RepositoryDossier | null> {
    if (id === "sample" || id === "ghost-notes" || id === SAMPLE_ARCHIVE.specimen) {
      return SAMPLE_ARCHIVE;
    }

    try {
      const res = await fetch(`${this.baseUrl}/api/excavations/${encodeURIComponent(id)}`);
      if (res.status === 404) return null;
      if (!res.ok) {
        const errorData = (await res.json().catch(() => ({}))) as {
          error?: { message?: string; code?: string };
        };
        throw new ArchiveApiError(
          errorData.error?.message || "Failed to retrieve excavation",
          errorData.error?.code || "RETRIEVAL_FAILED",
          res.status,
        );
      }

      return (await res.json()) as RepositoryDossier;
    } catch (err) {
      if (err instanceof ArchiveApiError) throw err;
      return null;
    }
  }

  getSampleDossier(): RepositoryDossier {
    return SAMPLE_ARCHIVE;
  }

  async submitArchive(file: File): Promise<IngestionJob> {
    const formData = new FormData();
    formData.append("archive", file);

    try {
      const res = await fetch(`${this.baseUrl}/api/excavations`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorData = (await res.json().catch(() => ({}))) as {
          error?: { message?: string; code?: string };
        };
        throw new ArchiveApiError(
          errorData.error?.message || `Upload failed with HTTP status ${res.status}`,
          errorData.error?.code || "UPLOAD_FAILED",
          res.status,
        );
      }

      const data = (await res.json()) as IngestionJob;
      return data;
    } catch (err) {
      if (err instanceof ArchiveApiError) throw err;
      throw new ArchiveApiError(
        "Analysis engine is offline. Start the backend service (npm run server) to begin excavations.",
        "ENGINE_OFFLINE",
        503,
      );
    }
  }

  async getIngestionStatus(jobId: string): Promise<IngestionJob | null> {
    try {
      const res = await fetch(
        `${this.baseUrl}/api/excavations/${encodeURIComponent(jobId)}/status`,
      );
      if (res.status === 404) return null;
      if (!res.ok) return null;
      return (await res.json()) as IngestionJob;
    } catch {
      return null;
    }
  }

  async interrogateExcavation(id: string, question: string): Promise<InterrogationResult> {
    try {
      const res = await fetch(
        `${this.baseUrl}/api/excavations/${encodeURIComponent(id)}/interrogate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question }),
        },
      );

      if (!res.ok) {
        const errorData = (await res.json().catch(() => ({}))) as {
          error?: { message?: string; code?: string; details?: unknown };
        };
        throw new ArchiveApiError(
          errorData.error?.message || `Interrogation failed with HTTP status ${res.status}`,
          errorData.error?.code || "INTERROGATION_FAILED",
          res.status,
        );
      }

      return (await res.json()) as InterrogationResult;
    } catch (err) {
      if (err instanceof ArchiveApiError) throw err;
      throw new ArchiveApiError(
        "Analysis engine is offline. Start the backend service (npm run server) to interrogate excavations.",
        "ENGINE_OFFLINE",
        503,
      );
    }
  }
}

export const archiveApiClient: ArchiveApiClient = new ArchiveApiClientImpl();
