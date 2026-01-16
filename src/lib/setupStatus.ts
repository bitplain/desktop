import { loadRuntimeConfig, RuntimeConfig } from "./runtimeConfig";

export type SetupStatus = "needsSetup" | "needsAdmin" | "ready" | "dbUnavailable";

export async function getSetupStatus(options?: { mockConfig?: RuntimeConfig | null }) {
  const config = loadRuntimeConfig(
    options?.mockConfig !== undefined ? { mockConfig: options.mockConfig } : undefined
  );
  if (!config) {
    return "needsSetup" as const;
  }
  try {
    const { prisma } = await import("./db");
    const count = await prisma.user.count();
    return count === 0 ? "needsAdmin" : "ready";
  } catch {
    return "dbUnavailable";
  }
}
