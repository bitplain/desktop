import { execFile } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdir, readdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { hash } from "bcryptjs";
import { getPrisma } from "./db";
import { ensureDatabaseExists } from "./ensureDatabaseExists";
import { loadRuntimeConfig, resolveConfigPath, type RuntimeConfig } from "./runtimeConfig";
import { pickMigrationMode } from "./setupMigrations";
import { validateDatabaseUrl } from "./setupValidation";
import { validateEmail, validatePassword } from "./validation";

export type SetupCompletionInput = {
  databaseUrl?: string;
  databaseSsl?: boolean;
  email: string;
  password: string;
  allowDatabaseUrlOverride?: boolean;
};

export type SetupCompletionResult =
  | { status: "ok" }
  | { status: "invalid"; error: string }
  | { status: "alreadySetup" }
  | { status: "dbError"; error: string };

export type SetupCompletionDeps = {
  loadConfig: () => RuntimeConfig | null;
  writeConfig: (config: RuntimeConfig) => Promise<void>;
  applyConfig: (config: RuntimeConfig) => void;
  ensureDatabaseExists: (databaseUrl: string) => Promise<void>;
  runMigrations: () => Promise<void>;
  getUserCount: () => Promise<number>;
  createAdmin: (input: { email: string; password: string }) => Promise<void>;
  generateSecret: () => string;
  validateDatabaseUrl: (value: string) => { ok: boolean; error?: string };
  validateEmail: (value: string) => { ok: boolean; value?: string; error?: string };
  validatePassword: (value: string) => { ok: boolean; value?: string; error?: string };
};

const execFileAsync = promisify(execFile);

export async function completeSetup(
  input: SetupCompletionInput,
  deps: SetupCompletionDeps
): Promise<SetupCompletionResult> {
  const emailCheck = deps.validateEmail(input.email);
  if (!emailCheck.ok) {
    return { status: "invalid", error: emailCheck.error ?? "Invalid email" };
  }
  const passwordCheck = deps.validatePassword(input.password);
  if (!passwordCheck.ok) {
    return { status: "invalid", error: passwordCheck.error ?? "Invalid password" };
  }

  let config = deps.loadConfig();
  const databaseSsl = Boolean(input.databaseSsl);
  if (!config) {
    const dbCheck = deps.validateDatabaseUrl(input.databaseUrl ?? "");
    if (!dbCheck.ok) {
      return { status: "invalid", error: dbCheck.error ?? "Invalid database url" };
    }
    config = {
      databaseUrl: input.databaseUrl ?? "",
      databaseSsl,
      nextAuthSecret: deps.generateSecret(),
      keysEncryptionSecret: deps.generateSecret(),
    };
    await deps.writeConfig(config);
  } else if (input.allowDatabaseUrlOverride && input.databaseUrl) {
    const dbCheck = deps.validateDatabaseUrl(input.databaseUrl);
    if (!dbCheck.ok) {
      return { status: "invalid", error: dbCheck.error ?? "Invalid database url" };
    }
    config = {
      ...config,
      databaseUrl: input.databaseUrl,
      databaseSsl,
    };
    await deps.writeConfig(config);
  }

  deps.applyConfig(config);

  try {
    await deps.runMigrations();
    const count = await deps.getUserCount();
    if (count > 0) {
      return { status: "alreadySetup" };
    }
    await deps.createAdmin({
      email: emailCheck.value ?? "",
      password: passwordCheck.value ?? "",
    });
    return { status: "ok" };
  } catch (error) {
    return {
      status: "dbError",
      error: error instanceof Error ? error.message : "Database error",
    };
  }
}

export function createDefaultSetupDeps(): SetupCompletionDeps {
  return {
    loadConfig: () => loadRuntimeConfig(),
    writeConfig: async (config) => {
      const path = resolveConfigPath();
      await mkdir(path.replace("/config.json", ""), { recursive: true });
      await writeFile(path, JSON.stringify(config, null, 2), { mode: 0o600 });
    },
    applyConfig: (config) => {
      process.env.DATABASE_URL = config.databaseUrl;
      if (config.databaseSsl !== undefined) {
        process.env.DATABASE_SSL = config.databaseSsl ? "true" : "false";
      }
      process.env.NEXTAUTH_SECRET = config.nextAuthSecret;
      process.env.KEYS_ENCRYPTION_SECRET = config.keysEncryptionSecret;
    },
    ensureDatabaseExists: async (databaseUrl) => {
      await ensureDatabaseExists(databaseUrl);
    },
    runMigrations: async () => {
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
    },
    getUserCount: async () => {
      const prisma = getPrisma();
      return prisma.user.count();
    },
    createAdmin: async ({ email, password }) => {
      const prisma = getPrisma();
      const passwordHash = await hash(password, 12);
      await prisma.user.create({
        data: { email, passwordHash, role: "ADMIN" },
      });
    },
    generateSecret: () => randomBytes(32).toString("hex"),
    validateDatabaseUrl,
    validateEmail,
    validatePassword,
  };
}
