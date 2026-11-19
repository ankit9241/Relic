import { archiveApiClient } from "@/api/client";
import { SAMPLE_ARCHIVE } from "@/data/sample-archive";
import type { Excavation, RepositoryDossier } from "@/data/types";

export const ZIP_MAX_BYTES = 200 * 1024 * 1024; // 200 MB

/**
 * Validates a candidate repository archive before submission.
 * Enforces strict extension and size boundaries.
 */
export function validateArchive(file: File): string | null {
  if (!file) {
    return "No archive file selected.";
  }

  const name = file.name || "";
  if (!name.toLowerCase().endsWith(".zip")) {
    return "Only .zip archives are accepted.";
  }

  if (file.size === 0) {
    return "This archive is empty.";
  }

  if (file.size > ZIP_MAX_BYTES) {
    return "Archives must be 200 MB or smaller.";
  }

  return null;
}

/**
 * Formats a raw byte count into a human-readable string.
 * Formats bytes (< 1024) as integer "B" and larger units with 1 decimal place.
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  const units = ["B", "KB", "MB", "GB", "TB"];
  let unitIndex = 0;
  let val = bytes;
  while (val >= 1024 && unitIndex < units.length - 1) {
    val /= 1024;
    unitIndex++;
  }
  return `${val.toFixed(1)} ${units[unitIndex]}`;
}

export interface ArchiveAdapter {
  connected: boolean;
  getSample(): RepositoryDossier;
  listExcavations(): Promise<Excavation[]>;
  getExcavation(id: string): Promise<RepositoryDossier | null>;
}

export const archiveAdapter: ArchiveAdapter = {
  connected: false,
  getSample: () => SAMPLE_ARCHIVE,
  listExcavations: async () => archiveApiClient.listExcavations(),
  getExcavation: async (id: string) => archiveApiClient.getExcavation(id),
};
