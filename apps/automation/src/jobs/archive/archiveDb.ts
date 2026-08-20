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

// Newest-first, optionally with a grouping column read alongside — used to
// decide what to keep vs. delete without pulling full row data.
export async function fetchIdsForRetention(table: string, groupBy?: string): Promise<RetentionRow[]> {
  const columns = groupBy ? `id, created_at, ${groupBy}` : "id, created_at";
  const { data, error } = await supabase
    .from(table)
    .select(columns)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return ((data ?? []) as unknown as Array<Record<string, string>>).map((row) => ({
    id: row.id,
    created_at: row.created_at,
    group: groupBy ? row[groupBy] : undefined,
  }));
}

export async function deleteRowsByIds(table: string, ids: string[]): Promise<void> {
  if (ids.length === 0) return;

  const { error } = await supabase.from(table).delete().in("id", ids);
  if (error) throw error;
}
