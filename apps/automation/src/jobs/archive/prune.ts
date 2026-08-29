import "dotenv/config";
import { tables } from "./tables.js";
import { fetchIdsForRetention, deleteRowsByIds, deleteStaleUserProgress, type RetentionRow } from "./archiveDb.js";
import { runJob } from "../../runJob.js";

const JOB_NAME = "archive-prune";

// `completed` rows are never pruned - only abandoned in_progress ones.
const STALE_PROGRESS_DAYS = 45;

async function run() {
  for (const table of tables) {
    const deleteIds = new Set<string>();

    for (const rule of table.retentionRules) {
      const { keep, groupBy, filterColumn, filterValues } = rule;
      const rows = await fetchIdsForRetention(table.name, groupBy, filterColumn, filterValues);
      const ruleDeleteIds = idsBeyondRetentionPerGroup(rows, keep);

      const scope = filterValues ? ` (scoped to ${filterColumn}=${filterValues.join(",")})` : "";
      console.log(`[${JOB_NAME}] ${table.name}: keeping newest ${keep} per ${groupBy}${scope}, deleting ${ruleDeleteIds.length}`);

      ruleDeleteIds.forEach((id) => deleteIds.add(id));
    }

    await deleteRowsByIds(table.name, [...deleteIds]);
  }

  await deleteStaleUserProgress(STALE_PROGRESS_DAYS);
  console.log(`[${JOB_NAME}] user_progress: pruned in_progress rows older than ${STALE_PROGRESS_DAYS} days`);
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

runJob("archive-prune", run);
