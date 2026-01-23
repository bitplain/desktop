import { execFile } from "node:child_process";
import { readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { ensureDatabaseExists } from "./ensureDatabaseExists";
import { pickMigrationMode } from "./setupMigrations";

const execFileAsync = promisify(execFile);
let migrationPromise: Promise<void> | null = null;

async function runMigrations() {
  const prismaBin = resolve(process.cwd(), "node_modules/.bin/prisma");
  const migrationsDir = resolve(process.cwd(), "prisma/migrations");
  let entries: string[] | null = null;
  try {
    entries = await readdir(migrationsDir);
  } catch {
    entries = null;
  }
  const mode = pickMigrationMode(entries);
  const args = mode.mode === "deploy" ? ["migrate", "deploy"] : ["db", "push"];
  await execFileAsync(prismaBin, args, { env: process.env });
}

export async function ensureDatabaseReady(databaseUrl: string) {
  if (!migrationPromise) {
    migrationPromise = (async () => {
      await ensureDatabaseExists(databaseUrl);
      await runMigrations();
    })();
  }

  try {
    await migrationPromise;
  } catch (error) {
    migrationPromise = null;
    throw error;
  }
}
