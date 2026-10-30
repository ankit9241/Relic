import { describe, expect, it } from "vitest";
import { formatBytes, validateArchive, ZIP_MAX_BYTES } from "@/data/archive-adapter";

describe("Archive adapter validation and utilities", () => {
  it("accepts a valid .zip file within size limits", () => {
    const validFile = new File(["dummy content"], "repository.zip", {
      type: "application/zip",
    });
    expect(validateArchive(validFile)).toBeNull();
  });

  it("accepts a file with .zip extension even if MIME type is generic", () => {
    const zipExtension = new File(["dummy content"], "repo-master.zip", {
      type: "application/octet-stream",
    });
    expect(validateArchive(zipExtension)).toBeNull();
  });

  it("rejects non-zip file extensions and types", () => {
    const tarFile = new File(["dummy content"], "repo.tar.gz", {
      type: "application/gzip",
    });
    expect(validateArchive(tarFile)).toBe("Only .zip archives are accepted.");
  });

  it("rejects empty archives (0 bytes)", () => {
    const emptyFile = new File([], "empty.zip", {
      type: "application/zip",
    });
    expect(validateArchive(emptyFile)).toBe("This archive is empty.");
  });

  it("rejects archives exceeding the size limit", () => {
    // Construct a mock File object with an inflated size property
    const oversizedFile = {
      name: "massive.zip",
      type: "application/zip",
      size: ZIP_MAX_BYTES + 1024,
    } as unknown as File;

    expect(validateArchive(oversizedFile)).toBe("Archives must be 200 MB or smaller.");
  });

  it("correctly formats byte sizes", () => {
    expect(formatBytes(500)).toBe("500 B");
    expect(formatBytes(1024)).toBe("1.0 KB");
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(1024 * 1024)).toBe("1.0 MB");
    expect(formatBytes(200 * 1024 * 1024)).toBe("200.0 MB");
  });
});
