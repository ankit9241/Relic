import path from "node:path";

const EXCLUDED_DIRS = new Set([
  "node_modules",
  "dist",
  "build",
  "out",
  ".output",
  ".next",
  ".nuxt",
  ".turbo",
  ".cache",
  "vendor",
  "target",
  "bin",
  "obj",
  "coverage",
  ".nyc_output",
]);

const SECRET_FILE_PATTERNS = [
  /^\.env(\..+)?$/i,
  /^id_rsa(\..+)?$/i,
  /^id_dsa(\..+)?$/i,
  /^id_ed25519(\..+)?$/i,
  /^id_ecdsa(\..+)?$/i,
  /\.pem$/i,
  /\.key$/i,
  /\.pfx$/i,
  /\.p12$/i,
  /\.keystore$/i,
  /\.jks$/i,
  /credentials\.json$/i,
  /service-account.*\.json$/i,
  /secret.*\.json$/i,
  /token.*\.json$/i,
];

const BINARY_EXTENSIONS = new Set([
  ".exe",
  ".dll",
  ".so",
  ".dylib",
  ".bin",
  ".iso",
  ".img",
  ".dmg",
  ".class",
  ".jar",
  ".war",
  ".ear",
  ".zip",
  ".tar",
  ".gz",
  ".tgz",
  ".bz2",
  ".xz",
  ".7z",
  ".rar",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".ico",
  ".bmp",
  ".tiff",
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
  ".woff",
  ".woff2",
  ".ttf",
  ".eot",
  ".otf",
  ".mp3",
  ".wav",
  ".ogg",
  ".flac",
  ".mp4",
  ".webm",
  ".mov",
  ".avi",
  ".mkv",
  ".wasm",
  ".pyc",
  ".pyo",
  ".pyd",
  ".o",
  ".a",
  ".lib",
  ".obj",
]);

/**
 * Returns true if a path segments include an excluded build/cache/dependency directory.
 */
export function isExcludedDirectory(normalizedPath: string): boolean {
  const parts = normalizedPath.split("/").filter(Boolean);
  return parts.some((p) => EXCLUDED_DIRS.has(p.toLowerCase()));
}

/**
 * Returns true if the file appears to be a secret, credential, or key file.
 */
export function isSecretFile(filename: string): boolean {
  const base = path.basename(filename);
  return SECRET_FILE_PATTERNS.some((pattern) => pattern.test(base));
}

/**
 * Returns true if the file extension corresponds to a binary or compiled asset.
 */
export function isBinaryFile(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase();
  return BINARY_EXTENSIONS.has(ext);
}

/**
 * Returns true if the file is safe to index and scan for text contents (TODOs, manifests, code).
 */
export function isIndexableTextFile(normalizedPath: string): boolean {
  if (isExcludedDirectory(normalizedPath)) return false;
  if (isSecretFile(normalizedPath)) return false;
  if (isBinaryFile(normalizedPath)) return false;

  // Exclude git internal metadata from text indexing, except history parsing
  if (normalizedPath.startsWith(".git/") || normalizedPath === ".git") return false;

  return true;
}
