export interface RetentionRule {
  keep: number; // keep `keep` newest per distinct value of `groupBy`
  groupBy: string;
  // Only rows whose `filterColumn` value is one of `filterValues` are
  // eligible under this rule. Omit both to make every row eligible.
  filterColumn?: string;
  filterValues?: string[];
}

export interface TableConfig {
  name: string; // Supabase table name — also used as the archive filename
  idColumn: string;
  // A row not matched by any rule (its filterColumn value isn't in any
  // rule's filterValues) is never pruned — e.g. curated/complete course
  // playlists. Rules are independent and their delete-sets are unioned.
  retentionRules: RetentionRule[];
}

export const tables: TableConfig[] = [
  {
    name: "videos",
    idColumn: "id",
    retentionRules: [
      // top-news is split into one homepage shelf per region (see
      // regionShelfKey in apps/web/index.html) — a flat playlist-wide cap
      // starves low-volume regions/channels sharing the pool with
      // high-volume ones. Confirmed live: WION+NDTV alone were 70% of all
      // top-news rows, Africa had zero. Grouping by channel instead gives
      // every channel its own floor, which is a reasonable proxy for
      // per-region fairness since most channels map 1:1 to a region.
      // keep:12 matches the frontend's hard max of 12 videos per shelf
      // (index.html's data-cap-state="expanded" nth-child(n+13) rule).
      { keep: 12, groupBy: "channel_name", filterColumn: "playlist", filterValues: ["top-news"] },
      // The 4 daily single-shelf rolling jobs: each is one shelf (not
      // region-split), so a flat per-playlist cap is fine, no per-channel
      // fairness concern. keep:30 gives headroom above the frontend's
      // 12-item fetch per shelf (fetchPlaylistVideos(playlist, 12)). This
      // list mirrors SINGLE_SHELF_PLAYLISTS in apps/web/index.html, not
      // shared, so a new rolling job needs updating in both places.
      {
        keep: 30,
        groupBy: "playlist",
        filterColumn: "playlist",
        filterValues: ["explainers", "business", "talks", "podcasts"],
      },
      // Curated/complete playlists (Academy courses, Entertainment/Misc,
      // etc.) are deliberately not matched by any rule above, so they're
      // never pruned.
    ],
  },
  {
    name: "headlines",
    idColumn: "id",
    // No filter — every category is eligible. keep:5 matches the
    // frontend's MAX_PER_CATEGORY (index.html) exactly.
    retentionRules: [{ keep: 5, groupBy: "category" }],
  },
];
