import fs from "node:fs";
import path from "node:path";
import { isIndexableTextFile } from "../security/file-filter";

export interface RemnantItem {
  path: string;
  line: number;
  type: "todo" | "fixme" | "hack" | "skipped_test";
  text: string;
  excerpt: string;
}

export interface RemnantsScanResult {
  todoCount: number;
  remnants: RemnantItem[];
  testFiles: string[];
  skippedTests: RemnantItem[];
}

const REMNANT_PATTERN = /\b(TODO|FIXME|HACK|XXX)\b(?:\s*[:(]|\s+)(.*)$/i;
const SKIPPED_TEST_PATTERNS = [
  /describe\.skip\s*\(/,
  /it\.skip\s*\(/,
  /test\.skip\s*\(/,
  /xit\s*\(/,
  /xtest\s*\(/,
  /@pytest\.mark\.skip/,
  /#\[ignore\]/,
  /@Ignore\b/,
];

export function isTestFilePath(relPath: string): boolean {
  const normalized = relPath.replace(/\\/g, "/").toLowerCase();
  const base = path.basename(normalized);
  return (
    base.includes(".test.") ||
    base.includes(".spec.") ||
    base.startsWith("test_") ||
    base.endsWith("_test.go") ||
    base.endsWith("_test.py") ||
    normalized.startsWith("tests/") ||
    normalized.startsWith("test/") ||
    normalized.includes("/tests/") ||
    normalized.includes("/test/")
  );
}

/**
 * Scans a repository workspace for unfinished code markers and disabled tests.
 */
export function scanRemnants(
  workspaceDir: string,
  relativeFilePaths: string[],
): RemnantsScanResult {
  const remnants: RemnantItem[] = [];
  const testFiles: string[] = [];
  const skippedTests: RemnantItem[] = [];
  let todoCount = 0;

  for (const relPath of relativeFilePaths) {
    if (!isIndexableTextFile(relPath)) continue;

    const fullPath = path.join(workspaceDir, relPath);
    if (!fs.existsSync(fullPath)) continue;

    const isTest = isTestFilePath(relPath);
    if (isTest) {
      testFiles.push(relPath);
    }

    try {
      const stats = fs.statSync(fullPath);
      // Skip files larger than 1 MB for remnant regex scanning
      if (stats.size > 1024 * 1024) continue;

      const content = fs.readFileSync(fullPath, "utf-8");
      const lines = content.split(/\r?\n/);

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]!;
        const lineNum = i + 1;

        // Check for TODO / FIXME / HACK / XXX
        const remnantMatch = line.match(REMNANT_PATTERN);
        if (remnantMatch) {
          todoCount++;
          const tag = (remnantMatch[1] || "TODO").toLowerCase() as "todo" | "fixme" | "hack";
          const snippetStart = Math.max(0, i - 1);
          const snippetEnd = Math.min(lines.length, i + 2);
          const excerpt = lines.slice(snippetStart, snippetEnd).join("\n");

          if (remnants.length < 50) {
            remnants.push({
              path: relPath,
              line: lineNum,
              type: tag === "fixme" ? "fixme" : tag === "hack" ? "hack" : "todo",
              text: line.trim(),
              excerpt,
            });
          }
        }

        // Check for skipped tests
        if (isTest) {
          const isSkipped = SKIPPED_TEST_PATTERNS.some((p) => p.test(line));
          if (isSkipped) {
            const snippetStart = Math.max(0, i - 1);
            const snippetEnd = Math.min(lines.length, i + 3);
            const excerpt = lines.slice(snippetStart, snippetEnd).join("\n");

            if (skippedTests.length < 20) {
              skippedTests.push({
                path: relPath,
                line: lineNum,
                type: "skipped_test",
                text: line.trim(),
                excerpt,
              });
            }
          }
        }
      }
    } catch {
      // Ignore read errors on individual unreadable files
    }
  }

  return {
    todoCount,
    remnants,
    testFiles,
    skippedTests,
  };
}
