import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { encryptArchive, decryptArchive } from "./archiveCrypto.js";

// Git-tracked archive root, committed by the calling GitHub Actions workflow
// after this runs.
export const DATA_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../data");

// Appends rows to data/<relativePath>.json.enc (relativePath may include
// subfolders, e.g. "2026/08/20/videos"), deduping on `dedupeKey` against
// what's already in the file — the file has no DB-level unique constraint
// to fall back on, so dedup has to happen here. The file on disk is
// encrypted (see archiveCrypto.ts) since this repo is public; this function
// still deals in plain arrays, encryption/decryption happens at the
// read/write boundary only.
export async function appendRows<T>(relativePath: string, rows: T[], dedupeKey: keyof T): Promise<void> {
  if (rows.length === 0) return;

  const filePath = path.join(DATA_DIR, `${relativePath}.json.enc`);
  const existing = await readStore<T>(filePath);
  const existingKeys = new Set(existing.map((r) => r[dedupeKey]));
  const newRows = rows.filter((r) => !existingKeys.has(r[dedupeKey]));
  if (newRows.length === 0) return;

  await mkdir(path.dirname(filePath), { recursive: true });
  const plaintext = JSON.stringify([...existing, ...newRows], null, 2) + "\n";
  await writeFile(filePath, encryptArchive(plaintext), "utf-8");
}

async function readStore<T>(filePath: string): Promise<T[]> {
  try {
    const contents = await readFile(filePath, "utf-8");
    return JSON.parse(decryptArchive(contents)) as T[];
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}
