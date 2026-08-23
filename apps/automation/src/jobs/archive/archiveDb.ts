import { supabase } from "../../supabaseClient.js";

export interface ArchivableRow {
  id: string;
  created_at: string;
  [key: string]: unknown;
}

export async function fetchRowsSince(table: string, since: string): Promise<ArchivableRow[]> {
  const { data, error } = await supabase.from(table).select("*").gt("created_at", since).order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as ArchivableRow[];
}

export interface RetentionRow {
  id: string;
  created_at: string;
  group?: string;
}

// Newest-first, grouping column read alongside — used to decide what to
// keep vs. delete without pulling full row data. filterColumn/filterValues
// scope which rows are even eligible (e.g. only playlist=top-news), pushed
// server-side rather than filtered after the fetch.
export async function fetchIdsForRetention(
  table: string,
  groupBy: string,
  filterColumn?: string,
  filterValues?: string[]
): Promise<RetentionRow[]> {
  let query = supabase
    .from(table)
    .select(`id, created_at, ${groupBy}`)
    .order("created_at", { ascending: false });

  if (filterColumn && filterValues) {
    query = query.in(filterColumn, filterValues);
  }

  const { data, error } = await query;

  if (error) throw error;
  return ((data ?? []) as unknown as Array<Record<string, string>>).map((row) => ({
    id: row.id,
    created_at: row.created_at,
    group: row[groupBy],
  }));
}

export async function deleteRowsByIds(table: string, ids: string[]): Promise<void> {
  if (ids.length === 0) return;

  const { error } = await supabase.from(table).delete().in("id", ids);
  if (error) throw error;
}
