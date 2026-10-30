import path from "node:path";

export const CONFIG = {
  PORT: Number.parseInt(process.env["PORT"] || "3001", 10),
  HOST: process.env["HOST"] || "127.0.0.1",
  CORS_ORIGIN: process.env["CORS_ORIGIN"] || "*",

  // Ingestion limits
  MAX_ZIP_SIZE_BYTES: 200 * 1024 * 1024, // 200 MB compressed
  MAX_EXPANDED_SIZE_BYTES: 500 * 1024 * 1024, // 500 MB uncompressed limit
  MAX_FILE_COUNT: 10000, // Maximum files inside archive
  MAX_FILE_SIZE_BYTES: 10 * 1024 * 1024, // 10 MB limit per file for content scanning
  MAX_NESTING_DEPTH: 25, // Maximum folder hierarchy depth

  // Storage and temporary paths
  STORAGE_DIR: path.resolve(process.env["STORAGE_DIR"] || "./data"),
  TEMP_DIR: path.resolve(process.env["TEMP_DIR"] || "./tmp"),
  DB_PATH: path.resolve(process.env["DB_PATH"] || "./data/dead_archive.db"),

  // Ollama local AI synthesis settings
  OLLAMA_BASE_URL: process.env["OLLAMA_BASE_URL"] || "http://localhost:11434",
  OLLAMA_MODEL: process.env["OLLAMA_MODEL"] || "gemma3:4b",
  OLLAMA_TIMEOUT_MS: Number.parseInt(process.env["OLLAMA_TIMEOUT_MS"] || "60000", 10),
};
