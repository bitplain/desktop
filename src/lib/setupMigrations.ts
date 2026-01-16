export type MigrationMode = "deploy" | "push";

export function pickMigrationMode(entries: string[] | null) {
  if (!entries || entries.length === 0) {
    return { mode: "push" as const };
  }
  return { mode: "deploy" as const };
}
