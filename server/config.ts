import path from "node:path";

export const CONFIG = {
  PORT: Number.parseInt(process.env["PORT"] || "3001", 10),
  HOST: process.env["HOST"] || "127.0.0.1",
  CORS_ORIGIN: process.env["CORS_ORIGIN"] || "*",

  // Ingestion limits
  MAX_ZIP_SIZE_BYTES: Number.parseInt(
    process.env["MAX_ARCHIVE_SIZE_BYTES"] || String(200 * 1024 * 1024),
    10,
  ), // 200 MB compressed limit
  MAX_EXPANDED_SIZE_BYTES: Number.parseInt(
    process.env["MAX_EXPANDED_SIZE_BYTES"] || String(500 * 1024 * 1024),
    10,
  ), // 500 MB uncompressed limit
  MAX_FILE_COUNT: Number.parseInt(process.env["MAX_FILE_COUNT"] || "10000", 10), // Maximum files inside archive
  MAX_FILE_SIZE_BYTES: Number.parseInt(
    process.env["MAX_SINGLE_FILE_BYTES"] ||
      process.env["MAX_FILE_SIZE_BYTES"] ||
      String(100 * 1024 * 1024),
    10,
  ), // 100 MB default limit per file
  MAX_NESTING_DEPTH: Number.parseInt(process.env["MAX_NESTING_DEPTH"] || "25", 10), // Maximum folder hierarchy depth

  // Storage and temporary paths
  STORAGE_DIR: path.resolve(process.env["STORAGE_DIR"] || "./data"),
  TEMP_DIR: path.resolve(process.env["TEMP_DIR"] || "./tmp"),
  DB_PATH: path.resolve(process.env["DB_PATH"] || "./data/dead_archive.db"),

  // Ollama local AI synthesis settings
  OLLAMA_BASE_URL: process.env["OLLAMA_BASE_URL"] || "http://localhost:11434",
  OLLAMA_MODEL: process.env["OLLAMA_MODEL"] || "gemma3:4b",
  OLLAMA_TIMEOUT_MS: Number.parseInt(process.env["OLLAMA_TIMEOUT_MS"] || "60000", 10),
};
