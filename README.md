# RELIC

> **Digital Archaeology for Software**  
> _Bring forgotten code back to life._

**RELIC** is a digital archaeology workstation designed to investigate forgotten codebases, uncover technical debt, and generate evidence-backed revival plans. By combining deterministic repository extraction with strictly grounded local AI synthesis, RELIC reconstructs commit chronologies, catalogs code remnants (TODOs/FIXMEs/HACKs), audits dependency drift, and provides actionable 4-phase resurrection blueprints without code execution.

---

## Key Capabilities

1. **Deterministic Repository Ingestion**:
   - Secure ZIP ingestion with validation against ZIP Slip, path traversal, symlink attacks, and excessive archive expansion.
   - Zero-execution sandbox: analyzes ASTs, code comments, file hierarchies, and manifests without executing repository scripts or binaries.
   - Safe Git history inspection with hook neutralization (`core.hooksPath=""`).

2. **Verifiable Evidence Ledger**:
   - Every observation is recorded with a stable identifier (`E-001`, `E-002`, ...), exact file path, line number, and verifiable code snippet.
   - Strict distinction between _Observed Facts_ and _AI Hypotheses_.

3. **Local AI Interrogation (Ollama & Gemma)**:
   - Grounded conversational analysis running entirely locally on your machine via Ollama and `gemma3:4b`.
   - Never leaks code or metadata to external third-party cloud APIs.
   - Model prompt enforces strict attribution: the model must cite evidence IDs `[E-xxx]` and explicitly state when repository evidence is insufficient.

4. **4-Phase Resurrection Roadmap**:
   - Prioritizes revival actions into clear milestones:
     1. **Phase 1: Stabilize** — Runtime pinning, lockfile reconciliation, and dependency verification.
     2. **Phase 2: Repair** — Broken tests, failing suites, and critical code remnants.
     3. **Phase 3: Modernize** — Toolchain upgrades, framework migrations, and architecture refactoring.
     4. **Phase 4: Revive** — Incomplete feature completion and release readiness.

5. **Client-Side Forensic Markdown Export**:
   - Generates downloadable, comprehensive Markdown audit reports directly in the browser with zero external reporting libraries.

6. **Demonstration Baseline**:
   - Seamlessly falls back to an explicitly labeled demonstration archive (`ghost-notes`) when backend services are offline, ensuring full UI inspection without fabricated results.

---

## System Architecture

RELIC is architected as two decoupled, independently runnable services:

```
┌────────────────────────────────────────────────────────┐
│               RELIC Frontend Workspace                 │
│  TanStack Start · TanStack Router · Vite · Tailwind    │
│  - Editorial darkroom visual design system             │
│  - Interactive Evidence Inspector & Chronology Map     │
│  - Interrogation Console & Resurrection Roadmap        │
│  - In-browser Forensic Markdown Report Generator       │
└──────────────────────────┬─────────────────────────────┘
                           │ HTTP REST Client
                           ▼
┌────────────────────────────────────────────────────────┐
│            RELIC Analysis Service (Node.js)            │
│  Express · TypeScript · Built-in node:sqlite           │
│  - Bounded extraction sandbox (tmp/ directory)         │
│  - Security validators (magic bytes, path traversal)   │
│  - AST & comment remnant parser (TODO/FIXME/HACK)      │
│  - Dependency manifest analyzer (Node, Rust, Go, Py)   │
│  - Safe Git log parser (with neutralized hooks)        │
└──────────────────────────┬─────────────────────────────┘
                           │ Local REST (11434)
                           ▼
┌────────────────────────────────────────────────────────┐
│               Local AI Inference Engine                │
│  Ollama · Gemma 3:4b (open weights)                   │
│  - Evidence-grounded synthesis                         │
│  - Zero cloud leakage / fully private execution        │
└────────────────────────────────────────────────────────┘
```

---

## Getting Started

### Prerequisites

- **Node.js**: v22.x or v24.x (uses built-in `node:sqlite`)
- **Git**: Installed on PATH (optional, used for safe commit history analysis)
- **Ollama**: (Optional, for local AI interrogation) [ollama.com](https://ollama.com)
  - Model: `gemma3:4b` (`ollama pull gemma3:4b`)

### 1. Installation

```bash
# Clone the repository
git clone https://github.com/your-username/relic.git
cd relic

# Install dependencies
npm install
```

### 2. Environment Configuration

Copy the example environment configuration:

```bash
cp .env.example .env
```

Default configuration in `.env.example`:

| Variable                  | Default                  | Description                                           |
| :------------------------ | :----------------------- | :---------------------------------------------------- |
| `PORT`                    | `3001`                   | Analysis engine HTTP port                             |
| `HOST`                    | `127.0.0.1`              | Analysis engine bind address                          |
| `STORAGE_DIR`             | `./data`                 | Directory for persistent SQLite database and metadata |
| `TEMP_DIR`                | `./tmp`                  | Directory for ephemeral extraction workspaces         |
| `VITE_API_URL`            | `http://127.0.0.1:3001`  | Backend URL used by frontend API client               |
| `OLLAMA_BASE_URL`         | `http://localhost:11434` | Ollama service endpoint                               |
| `OLLAMA_MODEL`            | `gemma3:4b`              | Local language model for evidence interrogation       |
| `OLLAMA_TIMEOUT_MS`       | `60000`                  | Maximum wait time for local AI inference              |
| `MAX_ARCHIVE_SIZE_BYTES`  | `209715200` (200 MB)     | Maximum uploaded ZIP file size                        |
| `MAX_EXPANDED_SIZE_BYTES` | `524288000` (500 MB)     | Maximum expanded archive size                         |
| `MAX_FILE_COUNT`          | `10000`                  | Maximum file count in archive                         |

### 3. Setting Up Local AI (Ollama)

To enable AI interrogation:

```bash
# Ensure Ollama is running
ollama serve

# Pull the recommended model
ollama pull gemma3:4b
```

_Note: If Ollama is not installed or offline, RELIC gracefully marks AI capabilities as offline while all deterministic analysis, evidence indexing, roadmap planning, and report exporting remain fully operational._

### 4. Running the Application

Run both services in separate terminals:

```bash
# Terminal 1: Start the Analysis Engine (Backend)
npm run server
# (or with live-reload: npm run server:dev)

# Terminal 2: Start the Web Application (Frontend)
npm run dev
```

Open your browser to `http://localhost:3000`.

---

## End-to-End Demo Workflow

1. **Landing Page (`/`)**:
   - Review the digital archaeology mission, core principles (Local-first AI, Evidence-backed, Open-source), and the specimen map.
   - Click **Begin excavation** or **Open workspace**.

2. **New Excavation (`/app/excavate`)**:
   - Drag and drop any repository `.zip` archive (or select the bundled sample).
   - Watch the real-time stage progression:
     `Queued` → `Preparing workspace` → `Extracting archive` → `Analyzing AST & remnants` → `Completed`.

3. **Overview & Specimen Map (`/app` & `/app/excavations`)**:
   - Inspect high-level metrics: primary language, commit chronology, open remnant count, and historical contributor activity.
   - Review the specimen map illustrating commit cadence and abandonment indicators.

4. **Evidence Explorer (`/app/evidence`)**:
   - Filter evidence records by category: `all`, `history`, `remnant`, `dependency`, or `test`.
   - Inspect exact file paths, line numbers, and excerpted code blocks.
   - Click **Ask AI about this evidence** to jump directly into interrogation with pre-filled context.

5. **AI Interrogation (`/app/interrogate`)**:
   - Select suggested queries (e.g., _"Why was this repository abandoned?"_, _"What incomplete features or architectural blockers remain?"_) or ask custom questions.
   - Observe evidence citations `[E-xxx]` linked directly to indexed records.
   - Test out-of-scope questions to verify strict refusal against unevidenced speculation.

6. **Resurrection Plan (`/app/roadmap`)**:
   - Explore prioritized, evidence-backed actions categorized into `Phase 1: Stabilize`, `Phase 2: Repair`, `Phase 3: Modernize`, and `Phase 4: Revive`.
   - Filter by phase or effort level (`small`, `medium`, `large`).

7. **Forensic Report Export**:
   - In either the Roadmap or Interrogate screen, click **Export Report**.
   - A complete Markdown report (`relic-report-<specimen>.md`) is generated client-side and saved to your device.

---

## Security & Ingestion Safeguards

RELIC operates on untrusted codebases and enforces strict defense-in-depth protections:

- **ZIP Verification**: Magic byte header check (`PK\x03\x04`), rejecting renamed executables.
- **ZIP Slip Prevention**: Path validation against directory traversal (`..`, `.`, absolute paths, drive roots).
- **Symlink Protection**: Strict POSIX file attribute check rejecting symbolic and hard links.
- **Safe Git Extraction**: Git commands execute with `-c core.hooksPath=""` and omit `.git/hooks` extraction to disk.
- **Resource Limits**: Strict limits on archive size (200 MB), expanded size (500 MB), file count (10,000), single file size (10 MB), and nesting depth (25).
- **Sensitive Data Exclusion**: Automatically ignores credentials, private keys (`.pem`, `.key`, `id_rsa`), `.env` files, and database binaries.
- **Zero Execution Policy**: Never runs `npm install`, shell scripts, test runners, or repository binaries.
- **Ephemeral Workspaces**: Extraction workspaces are isolated in `tmp/` and pruned immediately on completion or failure.

---

## API Reference

The backend analysis service exposes a clean, typed REST API on `http://127.0.0.1:3001`:

| Method   | Endpoint                           | Description                                             |
| :------- | :--------------------------------- | :------------------------------------------------------ |
| `GET`    | `/api/health`                      | Engine health, version, capabilities, and Ollama status |
| `POST`   | `/api/excavations`                 | Upload a repository ZIP archive to queue excavation     |
| `GET`    | `/api/excavations`                 | List all persisted excavations                          |
| `GET`    | `/api/excavations/:id`             | Fetch full repository dossier by excavation ID          |
| `GET`    | `/api/excavations/:id/status`      | Poll excavation job status and progression stage        |
| `GET`    | `/api/excavations/:id/evidence`    | Query indexed evidence records for an excavation        |
| `GET`    | `/api/excavations/:id/files`       | Retrieve annotated directory hierarchy                  |
| `POST`   | `/api/excavations/:id/interrogate` | Interrogate dossier evidence using local Ollama/Gemma   |
| `DELETE` | `/api/excavations/:id`             | Delete an excavation and its persistent records         |

---

## Quality Assurance & Verification

```bash
# Run unit and integration test suite (Vitest)
npm test

# Run TypeScript type verification
npx tsc --noEmit

# Run ESLint analysis
npm run lint

# Format code with Prettier
npm run format

# Production build bundle verification
npm run build
```

---

## License

This project is licensed under the [MIT License](LICENSE) — see the [LICENSE](LICENSE) file for details.

Copyright (c) 2026 Ankit Kumar
