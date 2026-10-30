import type { EvidenceRecord, RepositoryDossier } from "../../src/data/types";
import { CONFIG } from "../config";

export class OllamaServiceError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: unknown;

  constructor(message: string, code: string, status = 500, details?: unknown) {
    super(message);
    this.name = "OllamaServiceError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export interface OllamaStatus {
  available: boolean;
  modelAvailable: boolean;
  models: string[];
  configuredModel: string;
  baseUrl: string;
  error?: string | undefined;
}

export interface InterrogationOutput {
  answer: string;
  referencedEvidenceIds: string[];
  referencedPaths: string[];
  model: string;
  excavationId: string;
  timestamp: string;
}

export class OllamaService {
  private baseUrl: string;
  private model: string;
  private timeoutMs: number;

  constructor(
    baseUrl = CONFIG.OLLAMA_BASE_URL,
    model = CONFIG.OLLAMA_MODEL,
    timeoutMs = CONFIG.OLLAMA_TIMEOUT_MS,
  ) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.model = model;
    this.timeoutMs = timeoutMs;
  }

  /**
   * Checks whether the Ollama server is running and the configured model is installed.
   */
  async checkStatus(): Promise<OllamaStatus> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const res = await fetch(`${this.baseUrl}/api/tags`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        return {
          available: false,
          modelAvailable: false,
          models: [],
          configuredModel: this.model,
          baseUrl: this.baseUrl,
          error: `Ollama returned HTTP ${res.status}`,
        };
      }

      const data = (await res.json()) as { models?: { name: string; model?: string }[] };
      const modelNames = (data.models || []).map((m) => m.name || m.model || "");

      const targetPrefix = this.model.split(":")[0]?.toLowerCase() || "";
      const modelAvailable = modelNames.some(
        (m) =>
          m.toLowerCase() === this.model.toLowerCase() ||
          (targetPrefix && m.toLowerCase().startsWith(`${targetPrefix}:`)),
      );

      return {
        available: true,
        modelAvailable,
        models: modelNames,
        configuredModel: this.model,
        baseUrl: this.baseUrl,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        available: false,
        modelAvailable: false,
        models: [],
        configuredModel: this.model,
        baseUrl: this.baseUrl,
        error: msg,
      };
    }
  }

  /**
   * Formats evidence and dossier facts into structured, bounded context for the model.
   */
  private buildEvidenceContext(dossier: RepositoryDossier): string {
    const lines: string[] = [];

    lines.push(`REPOSITORY OVERVIEW:`);
    lines.push(`- Specimen: ${dossier.specimen}`);
    lines.push(`- Name: ${dossier.name}`);
    lines.push(`- Primary Language: ${dossier.language}`);
    lines.push(`- License: ${dossier.license}`);
    lines.push(`- Commit Count: ${dossier.commitCount}`);
    lines.push(`- First Commit: ${dossier.firstCommit}`);
    lines.push(`- Last Commit: ${dossier.lastCommit}`);
    lines.push(`- Contributors: ${dossier.contributors}`);
    lines.push(`- Remnant Count (TODO/FIXME/HACK): ${dossier.todoCount}`);
    lines.push(
      `- Recommendation: ${dossier.recommendation.verdict} — ${dossier.recommendation.rationale}`,
    );
    lines.push(``);

    lines.push(`VERIFIED EVIDENCE RECORDS (${dossier.evidence.length} records):`);
    for (const record of dossier.evidence) {
      lines.push(`--- Evidence [${record.id}] ---`);
      lines.push(`Title: ${record.title}`);
      lines.push(`Category: ${record.category}`);
      lines.push(`Path: ${record.path}${record.line ? `:${record.line}` : ""}`);
      lines.push(`Summary: ${record.summary}`);
      if (record.excerpt) {
        lines.push(`Excerpt: "${record.excerpt}"`);
      }
      lines.push(`Significance: ${record.significance}`);
      lines.push(`Provenance: ${record.provenance}`);
      lines.push(``);
    }

    if (dossier.roadmap.length > 0) {
      lines.push(`RESURRECTION ROADMAP ITEMS:`);
      for (const item of dossier.roadmap) {
        lines.push(
          `- Priority ${item.priority} (${item.effort} effort, ${item.status}): ${item.title}. ${item.explanation} [Evidence: ${item.evidence.join(", ")}]`,
        );
      }
      lines.push(``);
    }

    return lines.join("\n");
  }

  /**
   * Interrogates the repository dossier and evidence records with Ollama.
   */
  async interrogateRepository(
    dossier: RepositoryDossier,
    question: string,
    excavationId: string,
  ): Promise<InterrogationOutput> {
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion) {
      throw new OllamaServiceError("User question cannot be empty.", "MISSING_QUESTION", 400);
    }

    // Check Ollama status before attempting generation
    const status = await this.checkStatus();
    if (!status.available) {
      throw new OllamaServiceError(
        `Ollama service is not reachable at ${this.baseUrl}. Ensure Ollama is running ('ollama serve').`,
        "OLLAMA_UNAVAILABLE",
        503,
        { baseUrl: this.baseUrl, configuredModel: this.model },
      );
    }

    if (!status.modelAvailable) {
      throw new OllamaServiceError(
        `Model '${this.model}' is not available in Ollama. Pull it using 'ollama pull ${this.model}'. Available models: ${status.models.join(", ") || "none"}.`,
        "MODEL_UNAVAILABLE",
        503,
        { installedModels: status.models, requiredModel: this.model },
      );
    }

    const contextText = this.buildEvidenceContext(dossier);

    const systemPrompt = `You are RELIC, an expert digital archaeology intelligence.
Your job is to interrogate abandoned software repositories and answer user questions strictly based on verified evidence records.

STRICT INSTRUCTIONS:
1. Base your answer EXCLUSIVELY and SOLELY on the supplied repository evidence records and facts below.
2. If the supplied evidence does not contain sufficient factual information to answer all or part of the question, you MUST explicitly state: "The repository evidence is insufficient to answer [aspect of question]." NEVER guess, speculate, extrapolate, or fabricate unobserved facts.
3. Whenever asserting any fact, issue, dependency, or history, always cite the evidence identifier in brackets, e.g. [E-001] or [E-003], and mention the source file path when available.
4. Maintain an objective, forensic, and analytical tone. Keep answers concise, factual, and direct.`;

    const userPrompt = `REPOSITORY ARTIFACT CONTEXT:
${contextText}

QUESTION:
${trimmedQuestion}

ANSWER (grounded strictly in the evidence above, stating explicitly if evidence is insufficient):`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    let rawAnswer = "";
    try {
      const res = await fetch(`${this.baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          stream: false,
          options: {
            temperature: 0.1,
          },
        }),
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const errorText = await res.text().catch(() => "");
        throw new OllamaServiceError(
          `Ollama generation request failed with HTTP ${res.status}: ${errorText}`,
          "OLLAMA_ERROR",
          res.status >= 500 ? 502 : res.status,
        );
      }

      const data = (await res.json()) as {
        message?: { content?: string };
        response?: string;
      };

      rawAnswer = (data.message?.content || data.response || "").trim();
    } catch (err) {
      clearTimeout(timeoutId);
      if (err instanceof OllamaServiceError) throw err;

      if (err instanceof Error && err.name === "AbortError") {
        throw new OllamaServiceError(
          `Ollama interrogation timed out after ${this.timeoutMs / 1000} seconds. The model may be busy or processing a large prompt.`,
          "OLLAMA_TIMEOUT",
          504,
        );
      }

      const msg = err instanceof Error ? err.message : String(err);
      throw new OllamaServiceError(
        `Failed to communicate with Ollama: ${msg}`,
        "OLLAMA_COMMUNICATION_ERROR",
        502,
      );
    }

    if (!rawAnswer) {
      throw new OllamaServiceError(
        "Ollama returned an empty response.",
        "EMPTY_MODEL_RESPONSE",
        502,
      );
    }

    // Extract referenced evidence IDs (e.g. E-001, E-002) from the answer and validate against dossier
    const evidenceIdMatches = rawAnswer.match(/E-\d{3,}/g) || [];
    const validEvidenceIds = new Set(dossier.evidence.map((e) => e.id));
    const referencedEvidenceIds = Array.from(
      new Set(evidenceIdMatches.filter((id) => validEvidenceIds.has(id))),
    );

    // Extract referenced file paths from evidence matching referenced IDs or mentioned in answer
    const referencedPathsSet = new Set<string>();
    for (const id of referencedEvidenceIds) {
      const ev = dossier.evidence.find((e) => e.id === id);
      if (ev?.path) referencedPathsSet.add(ev.path);
    }

    // Also look for exact file paths from dossier.evidence mentioned in text
    for (const ev of dossier.evidence) {
      if (ev.path && rawAnswer.includes(ev.path)) {
        referencedPathsSet.add(ev.path);
      }
    }

    return {
      answer: rawAnswer,
      referencedEvidenceIds,
      referencedPaths: Array.from(referencedPathsSet),
      model: this.model,
      excavationId,
      timestamp: new Date().toISOString(),
    };
  }
}

export const ollamaService = new OllamaService();
