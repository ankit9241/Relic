/**
 * Core type definitions for RELIC — Digital Archaeology for Software.
 */

export type Provenance = "observed" | "hypothesis";

export type EvidenceCategory = "history" | "remnant" | "dependency" | "test";

export type CommitKind = "origin" | "feature" | "fix" | "abandon" | "last";

export type RoadmapPhase = "stabilize" | "repair" | "modernize" | "revive";

export type Effort = "small" | "medium" | "large";

export type RoadmapStatus = "proposed" | "needs-review" | "blocked";

export interface CommitRecord {
  hash: string;
  date: string;
  author: string;
  message: string;
  files: string[];
  kind: CommitKind;
}

export interface TreeNode {
  name: string;
  type: "dir" | "file";
  note?: string | undefined;
  children?: TreeNode[] | undefined;
}

export interface EvidenceRecord {
  id: string;
  path: string;
  line?: number | undefined;
  category: EvidenceCategory;
  title: string;
  summary: string;
  excerpt?: string | undefined;
  significance: string;
  provenance: Provenance;
}

export interface RoadmapItem {
  priority: number;
  title: string;
  observedProblem?: string | undefined;
  explanation: string;
  evidence: string[];
  paths?: string[] | undefined;
  effort: Effort;
  status: RoadmapStatus;
  phase?: RoadmapPhase | undefined;
}

export interface RepositoryRecommendation {
  verdict: string;
  rationale: string;
}

export interface RepositoryDossier {
  isSample: boolean;
  specimen: string;
  name: string;
  description: string;
  language: string;
  license: string;
  firstCommit: string;
  lastCommit: string;
  commitCount: number;
  todoCount: number;
  contributors: number;
  tree: TreeNode[];
  commits: CommitRecord[];
  evidence: EvidenceRecord[];
  roadmap: RoadmapItem[];
  recommendation: RepositoryRecommendation;
}

export interface Excavation {
  id: string;
  name: string;
  specimen: string;
  commitCount: number;
  evidenceCount: number;
  createdAt: string;
  isSample?: boolean | undefined;
}

export type IngestionJobStatus =
  | "queued"
  | "preparing"
  | "extracting"
  | "analyzing"
  | "completed"
  | "failed"
  | "pending"
  | "processing";

export interface IngestionJob {
  jobId: string;
  archiveName: string;
  status: IngestionJobStatus;
  progressPercent: number;
  error?: string | undefined;
  resultId?: string | undefined;
}

export interface EngineCapabilities {
  deterministicAnalysis: boolean;
  localAiSynthesis: boolean;
  fileExecutionAllowed: boolean;
  maxArchiveSizeBytes: number;
}

export interface EngineAiConfig {
  provider?: string | undefined;
  baseUrl?: string | undefined;
  model?: string | undefined;
  available?: boolean | undefined;
  modelAvailable?: boolean | undefined;
  models?: string[] | undefined;
  error?: string | undefined;
}

export interface EngineConfig {
  status: "ready" | "connected" | "disconnected";
  endpoint?: string | undefined;
  capabilities: EngineCapabilities;
  storagePersisted?: boolean | undefined;
  ai?: EngineAiConfig | undefined;
}

export interface InterrogationResult {
  answer: string;
  referencedEvidenceIds: string[];
  referencedPaths: string[];
  model: string;
  excavationId: string;
  timestamp: string;
}
