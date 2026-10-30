import type { RepositoryDossier } from "../../src/data/types";
import { generateEvidence } from "./evidence-generator";
import { extractGitHistory } from "./git-history";
import { detectLanguages } from "./language-detector";
import { parseManifests } from "./manifests";
import { scanRemnants } from "./remnants";
import { buildFileTree } from "./tree-builder";

export async function analyzeRepository(
  workspaceDir: string,
  archiveName: string,
  filePaths: string[],
): Promise<RepositoryDossier> {
  // 1. Language detection
  const languages = detectLanguages(filePaths);

  // 2. Manifest parsing
  const manifest = parseManifests(workspaceDir, filePaths);

  // 3. Git history extraction
  const git = await extractGitHistory(workspaceDir);

  // 4. Remnants & tests scanning
  const remnants = scanRemnants(workspaceDir, filePaths);

  // Derive repository name
  const rawRepoName = manifest.name || archiveName.replace(/\.zip$/i, "") || "unnamed-repository";
  const repoName = rawRepoName.trim();

  // 5. Evidence generation & deterministic roadmap
  const { evidence, roadmap, fileNotes, recommendation } = generateEvidence({
    repoName,
    manifest,
    git,
    remnants,
    filePaths,
  });

  // 6. Tree structure construction
  const tree = buildFileTree(filePaths, fileNotes);

  const firstCommit =
    git.available && git.firstCommit !== "Unknown" ? git.firstCommit : "Not recorded";
  const lastCommit =
    git.available && git.lastCommit !== "Unknown" ? git.lastCommit : "Not recorded";

  const dossier: RepositoryDossier = {
    isSample: false,
    specimen: `EXCAVATION ${Date.now().toString().slice(-4)}`,
    name: repoName,
    description:
      manifest.description ||
      `Excavated codebase containing ${filePaths.length} files in ${languages.primary}.`,
    language: languages.primary,
    license: manifest.license || "Not specified",
    firstCommit,
    lastCommit,
    commitCount: git.commitCount,
    todoCount: remnants.todoCount,
    contributors: git.contributors,
    tree,
    commits: git.commits,
    evidence,
    roadmap,
    recommendation,
  };

  return dossier;
}
