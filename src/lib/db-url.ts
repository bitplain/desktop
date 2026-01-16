import { loadRuntimeConfig } from "./runtimeConfig";

export function getDatabaseUrl() {
  loadRuntimeConfig();
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }
  return databaseUrl;
}
