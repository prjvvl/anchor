export interface TableConfig {
  name: string; // Supabase table name — also used as the archive filename
  idColumn: string;
  retention: { keep: number; groupBy?: string }; // groupBy: keep `keep` newest per distinct value of this column
}

export const tables: TableConfig[] = [
  { name: "videos", idColumn: "id", retention: { keep: 50 } },
  { name: "headlines", idColumn: "id", retention: { keep: 10, groupBy: "category" } },
];
