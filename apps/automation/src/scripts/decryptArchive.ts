import "dotenv/config";
import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import { DATA_DIR } from "../fileStore.js";
import { decryptArchive } from "../archiveCrypto.js";

// Local-only viewer for the encrypted archive (see archiveCrypto.ts for
// why it's encrypted at all — the repo is public). Never writes plaintext
// back into data/ itself — output goes to OUTPUT_DIR, which is gitignored,
// so decrypting can't accidentally re-expose plaintext on the next commit.
const OUTPUT_DIR = path.resolve(DATA_DIR, "../.decrypted-archive");

async function findEncFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return findEncFiles(full);
      return entry.name.endsWith(".json.enc") ? [full] : [];
    })
  );
  return files.flat();
}

async function decryptOne(encPath: string): Promise<string> {
  const relative = path.relative(DATA_DIR, encPath).replace(/\.enc$/, "");
  const outPath = path.join(OUTPUT_DIR, relative);
  const plaintext = decryptArchive(await readFile(encPath, "utf-8"));
  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, plaintext, "utf-8");
  return outPath;
}

async function run() {
  const arg = process.argv[2]; // optional: a specific data/-relative path, e.g. 2026/08/23/videos
  const targets = arg ? [path.join(DATA_DIR, `${arg}.json.enc`)] : await findEncFiles(DATA_DIR);

  if (targets.length === 0) {
    console.log("No encrypted archive files found.");
    return;
  }

  for (const target of targets) {
    const outPath = await decryptOne(target);
    console.log(`Decrypted -> ${outPath}`);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
