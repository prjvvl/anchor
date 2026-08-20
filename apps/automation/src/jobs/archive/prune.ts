import "dotenv/config";
import { tables } from "./tables.js";
import { fetchIdsForRetention, deleteRowsByIds, type RetentionRow } from "./archiveDb.js";

const JOB_NAME = "archive-prune";

async function run() {
  for (const table of tables) {
    const rows = await fetchIdsForRetention(table.name, table.retention.groupBy);
    const deleteIds = table.retention.groupBy ? idsBeyondRetentionPerGroup(rows, table.retention.keep) : rows.slice(table.retention.keep).map((r) => r.id);

    const label = table.retention.groupBy ? `${table.retention.keep} per ${table.retention.groupBy}` : `${table.retention.keep}`;
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

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
