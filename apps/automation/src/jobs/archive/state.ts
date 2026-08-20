import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { DATA_DIR } from "../../fileStore.js";

// Tracks the last-archived `created_at` per table so each sync run only
// pulls what's genuinely new since last time — without this, the same rows
// could get written into more than one day's folder as they sit in Supabase
// across several runs before their retention cutoff deletes them.
const STATE_PATH = path.join(DATA_DIR, ".archive-state.json");
const EPOCH = "1970-01-01T00:00:00.000Z";

type ArchiveState = Record<string, string>;

export async function readWatermark(table: string): Promise<string> {
  const state = await readState();
  return state[table] ?? EPOCH;
}

export async function writeWatermark(table: string, timestamp: string): Promise<void> {
  const state = await readState();
  state[table] = timestamp;
  await mkdir(path.dirname(STATE_PATH), { recursive: true });
  await writeFile(STATE_PATH, JSON.stringify(state, null, 2) + "\n", "utf-8");
}

async function readState(): Promise<ArchiveState> {
  try {
    return JSON.parse(await readFile(STATE_PATH, "utf-8")) as ArchiveState;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return {};
    throw err;
  }
}
