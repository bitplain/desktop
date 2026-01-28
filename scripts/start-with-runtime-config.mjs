import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createRequire } from "node:module";

const dataDir = process.env.DATA_DIR?.trim() || "/data";
const configPath = resolve(dataDir, "config.json");

if (existsSync(configPath)) {
  try {
    const raw = readFileSync(configPath, "utf-8");
    const config = JSON.parse(raw);
    if (config?.databaseUrl && !process.env.DATABASE_URL) {
      process.env.DATABASE_URL = String(config.databaseUrl);
    }
    if (config?.databaseSsl !== undefined && !process.env.DATABASE_SSL) {
      process.env.DATABASE_SSL = config.databaseSsl ? "true" : "false";
    }
    if (config?.nextAuthSecret && !process.env.NEXTAUTH_SECRET) {
      process.env.NEXTAUTH_SECRET = String(config.nextAuthSecret);
    }
    if (config?.keysEncryptionSecret && !process.env.KEYS_ENCRYPTION_SECRET) {
      process.env.KEYS_ENCRYPTION_SECRET = String(config.keysEncryptionSecret);
    }
  } catch (error) {
    console.error(`[runtime-config] Failed to read ${configPath}`, error);
  }
}

if (!process.env.NEXTAUTH_SECRET) {
  console.warn("[runtime-config] NEXTAUTH_SECRET is not set.");
}

const require = createRequire(import.meta.url);
const nextBin = require.resolve("next/dist/bin/next");
const child = spawn(process.execPath, [nextBin, "start"], {
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code, signal) => {
  if (typeof code === "number") {
    process.exit(code);
  }
  process.exit(signal ? 1 : 0);
});
