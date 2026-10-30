import { CONFIG } from "../config";
import { SqliteExcavationStore } from "./sqlite-store";
import type { ExcavationStore } from "./types";

export const excavationStore: ExcavationStore = new SqliteExcavationStore(CONFIG.DB_PATH);
