import "dotenv/config";
import { tables } from "./tables.js";
import { fetchRowsSince } from "./archiveDb.js";
import { readWatermark, writeWatermark } from "./state.js";
import { appendRows } from "../../fileStore.js";
import { notifyFailure } from "../../alert.js";

const JOB_NAME = "archive-sync";

// Runs at 1:30 AM IST — folder is dated for the IST calendar day that just
// ended (not the UTC date the job happens to execute in).
function istArchiveFolder(): string {
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const nowIst = new Date(Date.now() + IST_OFFSET_MS);
  const yesterdayIst = new Date(nowIst.getTime() - 24 * 60 * 60 * 1000);
  const y = yesterdayIst.getUTCFullYear();
  const m = String(yesterdayIst.getUTCMonth() + 1).padStart(2, "0");
  const d = String(yesterdayIst.getUTCDate()).padStart(2, "0");
  return `${y}/${m}/${d}`;
}

async function run() {
  const folder = istArchiveFolder();

  for (const table of tables) {
    const since = await readWatermark(table.name);
    const rows = await fetchRowsSince(table.name, since);

    console.log(`[${JOB_NAME}] ${table.name}: ${rows.length} row(s) since ${since}`);
    if (rows.length === 0) continue;

    await appendRows(`${folder}/${table.name}`, rows, table.idColumn);

    const latest = rows[rows.length - 1].created_at; // fetched ascending
    await writeWatermark(table.name, latest);
    console.log(`[${JOB_NAME}] ${table.name}: archived to data/${folder}/${table.name}.json, watermark -> ${latest}`);
  }
}

run().catch(async (err) => {
  console.error(err);
  await notifyFailure("archive-sync", err);
  process.exit(1);
});
