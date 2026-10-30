import fs from "node:fs";
import path from "node:path";

export interface DependencyItem {
  name: string;
  version: string;
  type: "runtime" | "dev" | "peer";
  manifestPath: string;
  note?: string | undefined;
}

export interface ManifestAnalysisResult {
  name?: string | undefined;
  description?: string | undefined;
  license?: string | undefined;
  entryPoint?: string | undefined;
  scripts: Record<string, string>;
  dependencies: DependencyItem[];
  manifestFiles: string[];
}

/**
 * Parses package and project manifests across common ecosystems.
 */
export function parseManifests(
  workspaceDir: string,
  relativeFilePaths: string[],
): ManifestAnalysisResult {
  const result: ManifestAnalysisResult = {
    scripts: {},
    dependencies: [],
    manifestFiles: [],
  };

  const normalizedPaths = new Set(relativeFilePaths.map((p) => p.replace(/\\/g, "/")));

  // 1. Check Node.js package.json
  const packageJsonPath = Array.from(normalizedPaths).find(
    (p) => p === "package.json" || p.endsWith("/package.json"),
  );
  if (packageJsonPath) {
    result.manifestFiles.push(packageJsonPath);
    try {
      const fullPath = path.join(workspaceDir, packageJsonPath);
      const content = fs.readFileSync(fullPath, "utf-8");
      const pkg = JSON.parse(content) as Record<string, unknown>;

      if (typeof pkg["name"] === "string" && !result.name) result.name = pkg["name"];
      if (typeof pkg["description"] === "string" && !result.description)
        result.description = pkg["description"];
      if (typeof pkg["license"] === "string" && !result.license) result.license = pkg["license"];
      if (typeof pkg["main"] === "string" && !result.entryPoint) result.entryPoint = pkg["main"];

      if (typeof pkg["scripts"] === "object" && pkg["scripts"] !== null) {
        for (const [k, v] of Object.entries(pkg["scripts"] as Record<string, unknown>)) {
          if (typeof v === "string") result.scripts[k] = v;
        }
      }

      if (typeof pkg["dependencies"] === "object" && pkg["dependencies"] !== null) {
        for (const [dep, ver] of Object.entries(pkg["dependencies"] as Record<string, unknown>)) {
          if (typeof ver === "string") {
            let note: string | undefined;
            if (dep === "electron" && Number.parseFloat(ver.replace(/[^0-9.]/g, "")) < 20) {
              note = "Electron release is likely past end-of-life";
            }
            result.dependencies.push({
              name: dep,
              version: ver,
              type: "runtime",
              manifestPath: packageJsonPath,
              note,
            });
          }
        }
      }

      if (typeof pkg["devDependencies"] === "object" && pkg["devDependencies"] !== null) {
        for (const [dep, ver] of Object.entries(
          pkg["devDependencies"] as Record<string, unknown>,
        )) {
          if (typeof ver === "string") {
            result.dependencies.push({
              name: dep,
              version: ver,
              type: "dev",
              manifestPath: packageJsonPath,
            });
          }
        }
      }
    } catch {
      // Ignore JSON parse errors in malformed manifest
    }
  }

  // 2. Check Rust Cargo.toml
  const cargoPath = Array.from(normalizedPaths).find(
    (p) => p === "Cargo.toml" || p.endsWith("/Cargo.toml"),
  );
  if (cargoPath) {
    result.manifestFiles.push(cargoPath);
    try {
      const fullPath = path.join(workspaceDir, cargoPath);
      const content = fs.readFileSync(fullPath, "utf-8");
      const nameMatch = content.match(/name\s*=\s*"([^"]+)"/);
      if (nameMatch && nameMatch[1] && !result.name) result.name = nameMatch[1];
      const licenseMatch = content.match(/license\s*=\s*"([^"]+)"/);
      if (licenseMatch && licenseMatch[1] && !result.license) result.license = licenseMatch[1];
    } catch {
      // Ignore
    }
  }

  // 3. Check Python pyproject.toml / requirements.txt
  const reqPath = Array.from(normalizedPaths).find(
    (p) => p === "requirements.txt" || p.endsWith("/requirements.txt"),
  );
  if (reqPath) {
    result.manifestFiles.push(reqPath);
    try {
      const fullPath = path.join(workspaceDir, reqPath);
      const content = fs.readFileSync(fullPath, "utf-8");
      const lines = content.split(/\r?\n/);
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const [dep, ver] = trimmed.split(/==|>=|<=|~=/);
        if (dep) {
          result.dependencies.push({
            name: dep.trim(),
            version: ver?.trim() || "*",
            type: "runtime",
            manifestPath: reqPath,
          });
        }
      }
    } catch {
      // Ignore
    }
  }

  // 4. Check Go go.mod
  const goModPath = Array.from(normalizedPaths).find(
    (p) => p === "go.mod" || p.endsWith("/go.mod"),
  );
  if (goModPath) {
    result.manifestFiles.push(goModPath);
    try {
      const fullPath = path.join(workspaceDir, goModPath);
      const content = fs.readFileSync(fullPath, "utf-8");
      const moduleMatch = content.match(/module\s+([^\s]+)/);
      if (moduleMatch && moduleMatch[1] && !result.name) {
        result.name = moduleMatch[1].split("/").pop() || moduleMatch[1];
      }
    } catch {
      // Ignore
    }
  }

  return result;
}
