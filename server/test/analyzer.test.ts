import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, afterEach } from "vitest";
import { generateEvidence } from "../analyzer/evidence-generator";
import { extractGitHistory } from "../analyzer/git-history";
import { detectLanguages } from "../analyzer/language-detector";
import { parseManifests } from "../analyzer/manifests";
import { scanRemnants } from "../analyzer/remnants";
import { buildFileTree } from "../analyzer/tree-builder";
import { cleanWorkspace } from "../security/zip-validator";
import {
  isBinaryFile,
  isExcludedDirectory,
  isIndexableTextFile,
  isSecretFile,
} from "../security/file-filter";

describe("Deterministic Analyzer Modules", () => {
  const tempDirsToClean: string[] = [];

  const createTempDir = () => {
    const dir = path.join(
      os.tmpdir(),
      `dead_archive_analyzer_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
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

  describe("File Filtering & Exclusions", () => {
    it("identifies build and dependency directories for exclusion", () => {
      expect(isExcludedDirectory("node_modules/express/index.js")).toBe(true);
      expect(isExcludedDirectory("dist/bundle.js")).toBe(true);
      expect(isExcludedDirectory(".next/static/chunks/main.js")).toBe(true);
      expect(isExcludedDirectory("src/components/Header.tsx")).toBe(false);
    });

    it("identifies secret, key, and environment files", () => {
      expect(isSecretFile(".env")).toBe(true);
      expect(isSecretFile(".env.local")).toBe(true);
      expect(isSecretFile("id_rsa")).toBe(true);
      expect(isSecretFile("server.key")).toBe(true);
      expect(isSecretFile("cert.pem")).toBe(true);
      expect(isSecretFile("app.config.ts")).toBe(false);
    });

    it("identifies compiled binaries and non-text formats", () => {
      expect(isBinaryFile("program.exe")).toBe(true);
      expect(isBinaryFile("lib.so")).toBe(true);
      expect(isBinaryFile("archive.zip")).toBe(true);
      expect(isBinaryFile("image.png")).toBe(true);
      expect(isBinaryFile("code.ts")).toBe(false);
    });

    it("correctly identifies safe indexable text files", () => {
      expect(isIndexableTextFile("src/index.ts")).toBe(true);
      expect(isIndexableTextFile("node_modules/pkg/index.js")).toBe(false);
      expect(isIndexableTextFile(".env")).toBe(false);
      expect(isIndexableTextFile("logo.png")).toBe(false);
      expect(isIndexableTextFile(".git/config")).toBe(false);
    });
  });

  describe("Language Detection", () => {
    it("identifies predominant programming language and distributions", () => {
      const files = [
        "src/app.tsx",
        "src/util.ts",
        "src/types.ts",
        "scripts/run.py",
        "styles/main.css",
      ];
      const result = detectLanguages(files);
      expect(result.primary).toBe("TypeScript");
      expect(result.distribution.length).toBeGreaterThanOrEqual(3);
      expect(result.distribution[0]?.language).toBe("TypeScript");
    });

    it("handles repository with no recognized code extensions", () => {
      const files = ["LICENSE", "NOTICE", "DATA.csv"];
      const result = detectLanguages(files);
      expect(result.primary).toBe("Plaintext / Unknown");
      expect(result.distribution).toEqual([]);
    });
  });

  describe("Remnants & TODO/FIXME Extraction", () => {
    it("extracts TODO and FIXME markers with accurate line numbers and excerpts", () => {
      const workspace = createTempDir();
      const codePath = path.join(workspace, "src");
      fs.mkdirSync(codePath, { recursive: true });

      const fileContent = `
import { db } from "./db";

export function loadUser(id: string) {
  // TODO: implement caching layer for users
  const user = db.query(id);
  // FIXME: handle null user case properly
  return user;
}
`.trim();

      fs.writeFileSync(path.join(codePath, "user.ts"), fileContent, "utf-8");

      const result = scanRemnants(workspace, ["src/user.ts"]);
      expect(result.todoCount).toBe(2);
      expect(result.remnants.length).toBe(2);

      const todoItem = result.remnants.find((r) => r.type === "todo");
      expect(todoItem).toBeDefined();
      expect(todoItem?.path).toBe("src/user.ts");
      expect(todoItem?.line).toBe(4);
      expect(todoItem?.excerpt).toContain("implement caching layer");

      const fixmeItem = result.remnants.find((r) => r.type === "fixme");
      expect(fixmeItem).toBeDefined();
      expect(fixmeItem?.line).toBe(6);
    });

    it("detects skipped test cases", () => {
      const workspace = createTempDir();
      const testPath = path.join(workspace, "tests");
      fs.mkdirSync(testPath, { recursive: true });

      const testContent = `
import { describe, it } from "vitest";

describe.skip("flaky payment integration", () => {
  it("processes credit card", () => {});
});
`.trim();

      fs.writeFileSync(path.join(testPath, "payment.test.ts"), testContent, "utf-8");

      const result = scanRemnants(workspace, ["tests/payment.test.ts"]);
      expect(result.testFiles).toContain("tests/payment.test.ts");
      expect(result.skippedTests.length).toBe(1);
      expect(result.skippedTests[0]?.line).toBe(3);
    });
  });

  describe("Manifest Parsing", () => {
    it("parses package.json manifests and flags legacy dependencies", () => {
      const workspace = createTempDir();
      const pkg = {
        name: "test-legacy-app",
        description: "An archived electron desktop tool",
        license: "Apache-2.0",
        main: "src/main.js",
        scripts: { build: "tsc", test: "vitest" },
        dependencies: {
          electron: "12.0.0",
          react: "^18.0.0",
        },
        devDependencies: {
          typescript: "^5.0.0",
        },
      };

      fs.writeFileSync(path.join(workspace, "package.json"), JSON.stringify(pkg), "utf-8");

      const result = parseManifests(workspace, ["package.json"]);
      expect(result.name).toBe("test-legacy-app");
      expect(result.license).toBe("Apache-2.0");
      expect(result.entryPoint).toBe("src/main.js");
      expect(result.scripts["build"]).toBe("tsc");
      expect(result.dependencies.length).toBe(3);

      const electronDep = result.dependencies.find((d) => d.name === "electron");
      expect(electronDep?.note).toContain("end-of-life");
    });
  });

  describe("Git History Extraction", () => {
    it("safely reports unavailable when no .git exists without throwing", async () => {
      const workspace = createTempDir();
      const gitResult = await extractGitHistory(workspace);
      expect(gitResult.available).toBe(false);
      expect(gitResult.commits).toEqual([]);
      expect(gitResult.commitCount).toBe(0);
      expect(gitResult.reason).toContain("No .git directory found");
    });
  });

  describe("Evidence & Roadmap Generation", () => {
    it("generates evidence records with observed provenance and connects to roadmap", () => {
      const manifest = {
        name: "test-repo",
        license: "MIT",
        scripts: {},
        dependencies: [
          {
            name: "electron",
            version: "12.0.0",
            type: "runtime" as const,
            manifestPath: "package.json",
            note: "Legacy runtime version",
          },
        ],
        manifestFiles: ["package.json"],
      };

      const git = {
        available: false,
        firstCommit: "Unknown",
        lastCommit: "Unknown",
        commitCount: 0,
        contributors: 0,
        commits: [],
      };

      const remnants = {
        todoCount: 1,
        remnants: [
          {
            path: "src/sync.ts",
            line: 42,
            type: "todo" as const,
            text: "TODO: fix sync merge",
            excerpt: "// TODO: fix sync merge",
          },
        ],
        testFiles: ["tests/sync.test.ts"],
        skippedTests: [],
      };

      const filePaths = ["package.json", "src/sync.ts", "tests/sync.test.ts"];

      const result = generateEvidence({
        repoName: "test-repo",
        manifest,
        git,
        remnants,
        filePaths,
      });

      expect(result.evidence.length).toBeGreaterThan(0);
      for (const ev of result.evidence) {
        expect(ev.id).toMatch(/^E-\d{3}$/);
        expect(ev.provenance).toBe("observed");
        expect(ev.category).toMatch(/^(history|remnant|dependency|test)$/);
      }

      expect(result.roadmap.length).toBeGreaterThan(0);
      for (const item of result.roadmap) {
        expect(item.priority).toBeGreaterThanOrEqual(1);
        expect(item.priority).toBeLessThanOrEqual(5);
        expect(item.status).toMatch(/^(proposed|needs-review|blocked)$/);
      }
    });
  });

  describe("Tree Builder", () => {
    it("builds a nested tree and links file notes", () => {
      const files = ["src/index.ts", "src/util/math.ts", "package.json"];
      const notes = { "src/index.ts": "E-001" };

      const tree = buildFileTree(files, notes);
      expect(tree.length).toBe(2); // 'package.json' and 'src'

      const srcDir = tree.find((n) => n.name === "src");
      expect(srcDir).toBeDefined();
      expect(srcDir?.type).toBe("dir");
      expect(srcDir?.children).toBeDefined();

      const indexFile = srcDir?.children?.find((n) => n.name === "index.ts");
      expect(indexFile?.note).toBe("E-001");
    });
  });
});
