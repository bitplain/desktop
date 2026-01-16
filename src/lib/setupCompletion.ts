import type { RuntimeConfig } from "./runtimeConfig";

export type SetupCompletionInput = {
  databaseUrl?: string;
  email: string;
  password: string;
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
  runMigrations: () => Promise<void>;
  getUserCount: () => Promise<number>;
  createAdmin: (input: { email: string; password: string }) => Promise<void>;
  generateSecret: () => string;
  validateDatabaseUrl: (value: string) => { ok: boolean; error?: string };
  validateEmail: (value: string) => { ok: boolean; value?: string; error?: string };
  validatePassword: (value: string) => { ok: boolean; value?: string; error?: string };
};

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
  if (!config) {
    const dbCheck = deps.validateDatabaseUrl(input.databaseUrl ?? "");
    if (!dbCheck.ok) {
      return { status: "invalid", error: dbCheck.error ?? "Invalid database url" };
    }
    config = {
      databaseUrl: input.databaseUrl ?? "",
      nextAuthSecret: deps.generateSecret(),
      keysEncryptionSecret: deps.generateSecret(),
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
