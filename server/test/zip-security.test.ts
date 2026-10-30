/**
 * @vitest-environment node
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import AdmZip from "adm-zip";
import { describe, expect, it, afterEach } from "vitest";
import {
  cleanWorkspace,
  safelyExtractZip,
  validateZipMagicBytes,
  ZipSecurityError,
} from "../security/zip-validator";

describe("ZIP Ingestion & Security Hardening", () => {
  const tempDirsToClean: string[] = [];

  const createTempDir = () => {
    const dir = path.join(
      os.tmpdir(),
      `dead_archive_test_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    );
    fs.mkdirSync(dir, { recursive: true });
    tempDirsToClean.push(dir);
    return dir;
  };

  afterEach(() => {
    for (const dir of tempDirsToClean) {
      cleanWorkspace(dir);
    }
    tempDirsToClean.length = 0;
  });

  it("validates valid ZIP magic bytes and rejects invalid buffers", () => {
    const validHeader = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00]);
    expect(() => validateZipMagicBytes(validHeader)).not.toThrow();

    const invalidHeader = Buffer.from([0x7f, 0x45, 0x4c, 0x46]); // ELF binary
    expect(() => validateZipMagicBytes(invalidHeader)).toThrow(ZipSecurityError);
  });

  it("safely extracts a benign repository archive within workspace", () => {
    const zip = new AdmZip();
    zip.addFile("README.md", Buffer.from("# Test Repo"));
    zip.addFile("src/index.ts", Buffer.from("console.log('hello');"));
    const zipBuffer = zip.toBuffer();

    const workspace = createTempDir();
    const result = safelyExtractZip(zipBuffer, workspace);

    expect(result.totalFiles).toBe(2);
    expect(fs.existsSync(path.join(workspace, "README.md"))).toBe(true);
    expect(fs.existsSync(path.join(workspace, "src/index.ts"))).toBe(true);
  });

  it("prevents ZIP Slip and path traversal attacks (../ relative paths)", () => {
    const zip = new AdmZip();
    zip.addFile("dummy.txt", Buffer.from("malicious payload"));
    const entries = zip.getEntries();
    entries[0]!.entryName = "../escaped.txt";
    const zipBuffer = zip.toBuffer();

    const workspace = createTempDir();
    expect(() => safelyExtractZip(zipBuffer, workspace)).toThrow(ZipSecurityError);
    expect(fs.existsSync(path.join(workspace, "../escaped.txt"))).toBe(false);
  });

  it("prevents deep nested path traversal attacks", () => {
    const zip = new AdmZip();
    zip.addFile("dummy.txt", Buffer.from("escape"));
    const entries = zip.getEntries();
    entries[0]!.entryName = "foo/../../escape.txt";
    const zipBuffer = zip.toBuffer();

    const workspace = createTempDir();
    expect(() => safelyExtractZip(zipBuffer, workspace)).toThrow(ZipSecurityError);
  });

  it("rejects symbolic links in archive entries", () => {
    const zip = new AdmZip();
    zip.addFile("regular.txt", Buffer.from("normal file"));

    // Add entry and set UNIX symlink mode (0o120777 << 16)
    zip.addFile("symlink.txt", Buffer.from("/etc/passwd"));
    const entries = zip.getEntries();
    const symlinkEntry = entries.find((e) => e.entryName === "symlink.txt");
    if (symlinkEntry) {
      symlinkEntry.header.made = 0x031e; // Unix
      symlinkEntry.header.attr = (0o120777 << 16) >>> 0;
      symlinkEntry.attr = (0o120777 << 16) >>> 0;
    }

    const zipBuffer = zip.toBuffer();
    const workspace = createTempDir();

    expect(() => safelyExtractZip(zipBuffer, workspace)).toThrow(/symbolic link/i);
  });

  it("rejects empty archives", () => {
    const zip = new AdmZip();
    const zipBuffer = zip.toBuffer();
    const workspace = createTempDir();

    expect(() => safelyExtractZip(zipBuffer, workspace)).toThrow(/archive is empty/i);
  });

  it("skips .git/hooks directory during extraction to prevent hook execution", () => {
    const zip = new AdmZip();
    zip.addFile(".git/HEAD", Buffer.from("ref: refs/heads/main"));
    zip.addFile(".git/hooks/pre-commit", Buffer.from("#!/bin/sh\nexit 1"));
    zip.addFile("src/code.ts", Buffer.from("export const a = 1;"));

    const zipBuffer = zip.toBuffer();
    const workspace = createTempDir();
    const result = safelyExtractZip(zipBuffer, workspace);

    expect(result.entryPaths).toContain("src/code.ts");
    expect(fs.existsSync(path.join(workspace, "src/code.ts"))).toBe(true);
    // .git/hooks should not be extracted
    expect(fs.existsSync(path.join(workspace, ".git/hooks/pre-commit"))).toBe(false);
  });
});
