import type { Excavation, IngestionJob, RepositoryDossier } from "../../src/data/types";

export interface ExcavationStore {
  init(): Promise<void>;
  saveExcavation(
    id: string,
    dossier: RepositoryDossier,
    metadata?: Partial<Excavation>,
  ): Promise<void>;
  getExcavation(id: string): Promise<RepositoryDossier | null>;
  listExcavations(): Promise<Excavation[]>;
  deleteExcavation(id: string): Promise<boolean>;
  saveJob(job: IngestionJob): Promise<void>;
  getJob(jobId: string): Promise<IngestionJob | null>;
  close(): Promise<void>;
}
