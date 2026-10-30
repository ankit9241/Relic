import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import type { CommitRecord } from "../../src/data/types";

const execFileAsync = promisify(execFile);

export interface GitAnalysisResult {
  available: boolean;
  reason?: string;
  firstCommit: string;
  lastCommit: string;
  commitCount: number;
  contributors: number;
  commits: CommitRecord[];
}

export async function extractGitHistory(workspaceDir: string): Promise<GitAnalysisResult> {
  let targetDir = workspaceDir;

  if (!fs.existsSync(path.join(targetDir, ".git"))) {
    try {
      const items = fs.readdirSync(workspaceDir);
      for (const item of items) {
        const sub = path.join(workspaceDir, item);
        if (fs.existsSync(path.join(sub, ".git")) && fs.statSync(sub).isDirectory()) {
          targetDir = sub;
          break;
        }
      }
    } catch {
      // Ignore directory read errors
    }
  }

  const gitDir = path.join(targetDir, ".git");
  if (!fs.existsSync(gitDir)) {
    return {
      available: false,
      reason: "No .git directory found in repository archive.",
      firstCommit: "Unknown",
      lastCommit: "Unknown",
      commitCount: 0,
      contributors: 0,
      commits: [],
    };
  }

  try {
    // Run git log safely without shell, disabling any hook paths
    // Format: COMMIT:<hash>|<iso-date>|<author>|<message>
    const gitArgs = [
      "-C",
      targetDir,
      "-c",
      "core.hooksPath=",
      "log",
      "-n",
      "50",
      "--pretty=format:COMMIT:%H|%aI|%an|%s",
      "--name-only",
    ];

    const { stdout } = await execFileAsync("git", gitArgs, {
      timeout: 10000,
      maxBuffer: 5 * 1024 * 1024,
    });

    if (!stdout.trim()) {
      return {
        available: false,
        reason: "Git repository contains no commits.",
        firstCommit: "Unknown",
        lastCommit: "Unknown",
        commitCount: 0,
        contributors: 0,
        commits: [],
      };
    }

    const rawBlocks = stdout.split("COMMIT:").filter(Boolean);
    const parsedCommits: {
      hash: string;
      date: string;
      author: string;
      message: string;
      files: string[];
    }[] = [];

    const authorSet = new Set<string>();

    for (const block of rawBlocks) {
      const lines = block.split(/\r?\n/).filter((l) => l.trim().length > 0);
      const headerLine = lines[0];
      if (!headerLine) continue;

      const [fullHash, dateStr, author, ...msgParts] = headerLine.split("|");
      if (!fullHash || !dateStr) continue;

      const message = msgParts.join("|") || "No commit message";
      const files = lines.slice(1).map((f) => f.trim().replace(/\\/g, "/"));

      if (author) authorSet.add(author.trim().toLowerCase());

      parsedCommits.push({
        hash: fullHash.trim().slice(0, 7),
        date: dateStr.slice(0, 10), // YYYY-MM-DD
        author: author?.trim() || "unknown",
        message: message.trim(),
        files: files.slice(0, 10), // limit listed files
      });
    }

    if (parsedCommits.length === 0) {
      return {
        available: false,
        reason: "No parseable commits found in repository.",
        firstCommit: "Unknown",
        lastCommit: "Unknown",
        commitCount: 0,
        contributors: 0,
        commits: [],
      };
    }

    // Determine total commit count via git rev-list --count
    let totalCommitCount = parsedCommits.length;
    try {
      const countRes = await execFileAsync(
        "git",
        ["-C", targetDir, "-c", "core.hooksPath=", "rev-list", "--count", "HEAD"],
        { timeout: 5000 },
      );
      const parsedCount = Number.parseInt(countRes.stdout.trim(), 10);
      if (!Number.isNaN(parsedCount)) {
        totalCommitCount = parsedCount;
      }
    } catch {
      // Fallback to parsed length
    }

    // Determine kinds for chronological display
    const lastCommitDate = parsedCommits[0]?.date || "Unknown";
    const firstCommitDate = parsedCommits[parsedCommits.length - 1]?.date || "Unknown";

    const commits: CommitRecord[] = parsedCommits.map((c, index) => {
      let kind: CommitRecord["kind"] = "feature";
      const lowerMsg = c.message.toLowerCase();

      if (index === 0) {
        kind = "last";
      } else if (index === parsedCommits.length - 1) {
        kind = "origin";
      } else if (
        lowerMsg.includes("abandon") ||
        lowerMsg.includes("wip") ||
        lowerMsg.includes("skip") ||
        lowerMsg.includes("drop") ||
        lowerMsg.includes("temporary") ||
        lowerMsg.includes("temp")
      ) {
        kind = "abandon";
      } else if (
        lowerMsg.includes("fix") ||
        lowerMsg.includes("bug") ||
        lowerMsg.includes("patch")
      ) {
        kind = "fix";
      }

      return {
        ...c,
        kind,
      };
    });

    return {
      available: true,
      firstCommit: firstCommitDate,
      lastCommit: lastCommitDate,
      commitCount: totalCommitCount,
      contributors: Math.max(authorSet.size, 1),
      commits,
    };
  } catch (err) {
    return {
      available: false,
      reason: `Failed to extract Git history safely: ${err instanceof Error ? err.message : String(err)}`,
      firstCommit: "Unknown",
      lastCommit: "Unknown",
      commitCount: 0,
      contributors: 0,
      commits: [],
    };
  }
}
