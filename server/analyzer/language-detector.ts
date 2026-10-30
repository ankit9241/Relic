import path from "node:path";

export interface LanguageStat {
  language: string;
  files: number;
  percentage: number;
}

const EXTENSION_MAP: Record<string, string> = {
  ".ts": "TypeScript",
  ".tsx": "TypeScript",
  ".js": "JavaScript",
  ".jsx": "JavaScript",
  ".mjs": "JavaScript",
  ".cjs": "JavaScript",
  ".py": "Python",
  ".pyw": "Python",
  ".rs": "Rust",
  ".go": "Go",
  ".java": "Java",
  ".c": "C",
  ".h": "C",
  ".cpp": "C++",
  ".cc": "C++",
  ".cxx": "C++",
  ".hpp": "C++",
  ".cs": "C#",
  ".rb": "Ruby",
  ".php": "PHP",
  ".swift": "Swift",
  ".kt": "Kotlin",
  ".kts": "Kotlin",
  ".scala": "Scala",
  ".sh": "Shell",
  ".bash": "Shell",
  ".zsh": "Shell",
  ".ps1": "PowerShell",
  ".html": "HTML",
  ".htm": "HTML",
  ".css": "CSS",
  ".scss": "SCSS",
  ".sass": "Sass",
  ".less": "Less",
  ".sql": "SQL",
  ".lua": "Lua",
  ".dart": "Dart",
  ".r": "R",
  ".vue": "Vue",
  ".svelte": "Svelte",
  ".zig": "Zig",
  ".ex": "Elixir",
  ".exs": "Elixir",
  ".clj": "Clojure",
  ".hs": "Haskell",
};

/**
 * Detects languages used in the repository based on file extensions.
 */
export function detectLanguages(relativeFilePaths: string[]): {
  primary: string;
  distribution: LanguageStat[];
} {
  const counts: Record<string, number> = {};
  let totalCodeFiles = 0;

  for (const relPath of relativeFilePaths) {
    const ext = path.extname(relPath).toLowerCase();
    const lang = EXTENSION_MAP[ext];
    if (lang) {
      counts[lang] = (counts[lang] || 0) + 1;
      totalCodeFiles++;
    }
  }

  if (totalCodeFiles === 0) {
    return {
      primary: "Plaintext / Unknown",
      distribution: [],
    };
  }

  const distribution: LanguageStat[] = Object.entries(counts)
    .map(([language, files]) => ({
      language,
      files,
      percentage: Math.round((files / totalCodeFiles) * 100),
    }))
    .sort((a, b) => b.files - a.files);

  const primary = distribution[0]?.language || "Unknown";

  return {
    primary,
    distribution,
  };
}
