import { mkdir, writeFile } from "node:fs/promises";
import { ensureDatabaseReady } from "./databaseReady";
import { loadRuntimeConfig, resolveConfigPath, RuntimeConfig } from "./runtimeConfig";

export type SetupStatus = "needsSetup" | "needsAdmin" | "ready" | "dbUnavailable";

type SetupStatusOptions = {
  mockConfig?: RuntimeConfig | null;
  allowAutoSslFix?: boolean;
  saveConfig?: (config: RuntimeConfig) => Promise<void>;
};

function isSelfSignedError(error: unknown) {
  if (!error) {
    return false;
  }
  const message = error instanceof Error ? error.message : String(error);
  if (/self[-\s]?signed certificate/i.test(message)) {
    return true;
  }
  const code = (error as { code?: string }).code;
  return code === "DEPTH_ZERO_SELF_SIGNED_CERT" || code === "SELF_SIGNED_CERT_IN_CHAIN";
}

function withSslParams(databaseUrl: string) {
  try {
    const url = new URL(databaseUrl);
    if (!url.searchParams.get("sslmode")) {
      url.searchParams.set("sslmode", "require");
    }
    if (!url.searchParams.get("sslaccept")) {
      url.searchParams.set("sslaccept", "accept_invalid_certs");
    }
    return url.toString();
  } catch {
    return databaseUrl;
  }
}

async function defaultSaveConfig(config: RuntimeConfig) {
  const path = resolveConfigPath();
  await mkdir(path.replace("/config.json", ""), { recursive: true });
  await writeFile(path, JSON.stringify(config, null, 2), { mode: 0o600 });
}

export async function getSetupStatus(options?: SetupStatusOptions) {
  const config = loadRuntimeConfig(
    options?.mockConfig !== undefined ? { mockConfig: options.mockConfig } : undefined
  );
  if (!config) {
    return "needsSetup" as const;
  }
  try {
    await ensureDatabaseReady(config.databaseUrl);
    const { getPrisma } = await import("./db");
    const prisma = getPrisma();
    const count = await prisma.user.count();
    return count === 0 ? "needsAdmin" : "ready";
  } catch (error) {
    if (options?.allowAutoSslFix && isSelfSignedError(error)) {
      const updatedUrl = withSslParams(config.databaseUrl);
      const updatedConfig = {
        ...config,
        databaseUrl: updatedUrl,
        databaseSsl: true,
      };
      if (
        updatedConfig.databaseSsl !== config.databaseSsl ||
        updatedConfig.databaseUrl !== config.databaseUrl
      ) {
        const saveConfig = options.saveConfig ?? defaultSaveConfig;
        await saveConfig(updatedConfig);
        process.env.DATABASE_URL = updatedConfig.databaseUrl;
        process.env.DATABASE_SSL = "true";
        try {
          await ensureDatabaseReady(updatedConfig.databaseUrl);
          const { getPrisma } = await import("./db");
          const prisma = getPrisma();
          const count = await prisma.user.count();
          return count === 0 ? "needsAdmin" : "ready";
        } catch {
          return "dbUnavailable";
        }
      }
    }
    return "dbUnavailable";
  }
}
