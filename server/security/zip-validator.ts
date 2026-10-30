import fs from "node:fs";
import path from "node:path";
import AdmZip from "adm-zip";
import { CONFIG } from "../config";

export class ZipSecurityError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(message: string, code = "INVALID_ARCHIVE", status = 400) {
    super(message);
    this.name = "ZipSecurityError";
    this.code = code;
    this.status = status;
  }
}

/**
 * Validates the ZIP archive magic bytes (PK\x03\x04, PK\x05\x06, or PK\x07\x08).
 */
export function validateZipMagicBytes(buffer: Buffer): void {
  if (buffer.length < 4) {
    throw new ZipSecurityError("Archive file is corrupted or too small to be a valid ZIP.");
  }

  const isZipMagic =
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    ((buffer[2] === 0x03 && buffer[3] === 0x04) ||
      (buffer[2] === 0x05 && buffer[3] === 0x06) ||
      (buffer[2] === 0x07 && buffer[3] === 0x08));

  if (!isZipMagic) {
    throw new ZipSecurityError(
      "Uploaded file does not match ZIP binary signature.",
      "INVALID_ZIP_MAGIC",
    );
  }
}

export interface ExtractedArchiveResult {
  workspaceDir: string;
  totalFiles: number;
  totalExpandedBytes: number;
  entryPaths: string[];
}

/**
 * Inspects, validates, and safely extracts a ZIP archive into a target workspace directory.
 * Enforces strict ZIP Slip prevention, symlink rejection, resource bounds, and directory isolation.
 */
export function safelyExtractZip(zipBuffer: Buffer, workspaceDir: string): ExtractedArchiveResult {
  validateZipMagicBytes(zipBuffer);

  let zip: AdmZip;
  try {
    zip = new AdmZip(zipBuffer);
  } catch (err) {
    throw new ZipSecurityError(
      `Unable to parse ZIP archive structure: ${err instanceof Error ? err.message : String(err)}`,
      "CORRUPT_ZIP",
    );
  }

  const entries = zip.getEntries();
  if (entries.length === 0) {
    throw new ZipSecurityError("This archive is empty.", "EMPTY_ARCHIVE");
  }

  if (entries.length > CONFIG.MAX_FILE_COUNT) {
    throw new ZipSecurityError(
      `Archive contains ${entries.length} entries, exceeding the maximum limit of ${CONFIG.MAX_FILE_COUNT}.`,
      "EXCESSIVE_FILE_COUNT",
    );
  }

  const normalizedWorkspace = path.resolve(workspaceDir);
  let totalExpandedBytes = 0;
  const safeEntries: { entry: AdmZip.IZipEntry; targetPath: string; isDir: boolean }[] = [];
  const entryPaths: string[] = [];

  // Pass 1: Pre-validation of all entries before writing any bytes to disk
  for (const entry of entries) {
    const rawName = entry.entryName;

    // Reject symlinks (mode attribute bitmask for S_IFLNK is 0o120000)
    // In ZIP format, external file attributes store POSIX permissions in upper 16 bits
    const rawAttr = entry.attr || (entry.header ? entry.header.attr : 0);
    const unixMode = (rawAttr >>> 16) & 0o177777;
    const isSymlink = (unixMode & 0o170000) === 0o120000;
    if (isSymlink) {
      throw new ZipSecurityError(
        `Archive contains forbidden symbolic link: ${rawName}`,
        "SYMLINK_FORBIDDEN",
      );
    }

    // Normalize path separators to forward slash
    const normalizedName = rawName.replace(/\\/g, "/");

    // ZIP Slip prevention: forbid path traversal attempts
    const segments = normalizedName.split("/").filter(Boolean);
    if (segments.some((seg) => seg === ".." || seg === ".")) {
      throw new ZipSecurityError(
        `Archive contains illegal path traversal traversal: ${rawName}`,
        "ZIP_SLIP_ATTEMPT",
      );
    }

    if (segments.length > CONFIG.MAX_NESTING_DEPTH) {
      throw new ZipSecurityError(
        `Archive directory nesting depth exceeds maximum limit of ${CONFIG.MAX_NESTING_DEPTH}: ${rawName}`,
        "NESTING_DEPTH_EXCEEDED",
      );
    }

    // Resolve target path and verify it stays inside normalizedWorkspace
    const targetPath = path.resolve(normalizedWorkspace, ...segments);
    if (
      !targetPath.startsWith(normalizedWorkspace + path.sep) &&
      targetPath !== normalizedWorkspace
    ) {
      throw new ZipSecurityError(
        `Path traversal detected outside target workspace: ${rawName}`,
        "PATH_TRAVERSAL_DETECTED",
      );
    }

    // Reject .git/hooks to prevent execution of hook scripts
    if (
      normalizedName.toLowerCase().startsWith(".git/hooks/") ||
      normalizedName.toLowerCase() === ".git/hooks"
    ) {
      continue; // Safely ignore and skip git hooks
    }

    // Check individual entry uncompressed size
    if (entry.header.size > CONFIG.MAX_FILE_SIZE_BYTES) {
      throw new ZipSecurityError(
        `File ${rawName} uncompressed size exceeds limit of ${CONFIG.MAX_FILE_SIZE_BYTES / (1024 * 1024)} MB.`,
        "FILE_SIZE_EXCEEDED",
      );
    }

    totalExpandedBytes += entry.header.size;
    if (totalExpandedBytes > CONFIG.MAX_EXPANDED_SIZE_BYTES) {
      throw new ZipSecurityError(
        `Total uncompressed archive size exceeds maximum limit of ${CONFIG.MAX_EXPANDED_SIZE_BYTES / (1024 * 1024)} MB.`,
        "EXPANDED_SIZE_EXCEEDED",
      );
    }

    const isDir = entry.isDirectory;
    safeEntries.push({ entry, targetPath, isDir });
    if (!isDir) {
      entryPaths.push(segments.join("/"));
    }
  }

  // Pass 2: Ensure destination directory exists and extract files safely
  fs.mkdirSync(normalizedWorkspace, { recursive: true });

  for (const item of safeEntries) {
    if (item.isDir) {
      fs.mkdirSync(item.targetPath, { recursive: true });
    } else {
      const parentDir = path.dirname(item.targetPath);
      fs.mkdirSync(parentDir, { recursive: true });

      const content = item.entry.getData();
      fs.writeFileSync(item.targetPath, content, { mode: 0o644 });
    }
  }

  return {
    workspaceDir: normalizedWorkspace,
    totalFiles: entryPaths.length,
    totalExpandedBytes,
    entryPaths,
  };
}

/**
 * Recursively cleans up a temporary workspace folder without throwing unhandled exceptions.
 */
export function cleanWorkspace(workspaceDir: string): void {
  try {
    if (fs.existsSync(workspaceDir)) {
      fs.rmSync(workspaceDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
    }
  } catch (err) {
    console.error(`Warning: Failed to clean up workspace ${workspaceDir}:`, err);
  }
}
