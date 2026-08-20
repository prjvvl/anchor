import "dotenv/config";
import { tables } from "./tables.js";
import { fetchIdsForRetention, deleteRowsByIds, type RetentionRow } from "./archiveDb.js";
import { notifyFailure } from "../../alert.js";

const JOB_NAME = "archive-prune";

async function run() {
  for (const table of tables) {
    const { keep, groupBy, scopeToGroups } = table.retention;
    const rows = await fetchIdsForRetention(table.name, groupBy);
    const scopedRows = scopeToGroups ? rows.filter((r) => scopeToGroups.includes(r.group ?? "")) : rows;
    const deleteIds = groupBy ? idsBeyondRetentionPerGroup(scopedRows, keep) : scopedRows.slice(keep).map((r) => r.id);

    const label = groupBy ? `${keep} per ${groupBy}${scopeToGroups ? ` (scoped to ${scopeToGroups.join(", ")})` : ""}` : `${keep}`;
    console.log(`[${JOB_NAME}] ${table.name}: keeping newest ${label}, deleting ${deleteIds.length}`);

    await deleteRowsByIds(table.name, deleteIds);
  }
}

// `rows` is newest-first; grouping preserves that order within each group,
// so slicing past `keep` within a group gives exactly the excess to delete.
function idsBeyondRetentionPerGroup(rows: RetentionRow[], keep: number): string[] {
  const byGroup = new Map<string, RetentionRow[]>();
  for (const row of rows) {
    const key = row.group ?? "";
    if (!byGroup.has(key)) byGroup.set(key, []);
    byGroup.get(key)!.push(row);
  }

  return [...byGroup.values()].flatMap((groupRows) => groupRows.slice(keep).map((r) => r.id));
}

run().catch(async (err) => {
  console.error(err);
  await notifyFailure("archive-prune", err);
  process.exit(1);
});
