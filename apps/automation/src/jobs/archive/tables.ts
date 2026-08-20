export interface TableConfig {
  name: string; // Supabase table name — also used as the archive filename
  idColumn: string;
  retention: {
    keep: number; // groupBy: keep `keep` newest per distinct value of this column
    groupBy?: string;
    // If set, only rows whose groupBy value is in this list are eligible for
    // pruning at all — every other group is left untouched, however large it
    // gets. Used to exempt curated/complete playlists from auto-deletion.
    scopeToGroups?: string[];
  };
}

export const tables: TableConfig[] = [
  // Only the rolling `top-news` playlist is auto-pruned by recency. Any
  // other playlist (e.g. a future curated/complete one) is exempt — add it
  // to scopeToGroups only if it's meant to be a trimmed rolling feed too.
  { name: "videos", idColumn: "id", retention: { keep: 50, groupBy: "playlist", scopeToGroups: ["top-news"] } },
  { name: "headlines", idColumn: "id", retention: { keep: 5, groupBy: "category" } },
];
