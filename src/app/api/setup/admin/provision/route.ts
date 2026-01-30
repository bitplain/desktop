import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { resolveConfigPath } from "@/lib/runtimeConfig";
import { NextResponse } from "next/server";
import { buildDatabaseUrl } from "@/lib/buildDatabaseUrl";
import { provisionDatabaseWithAdmin } from "@/lib/adminRepair";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const admin = {
    host: String(body?.adminHost ?? ""),
    port: String(body?.adminPort ?? ""),
    user: String(body?.adminUser ?? ""),
    password: String(body?.adminPassword ?? ""),
    ssl: Boolean(body?.adminSsl),
  };
  const app = {
    database: String(body?.dbName ?? ""),
    user: String(body?.dbUser ?? ""),
    password: String(body?.dbPassword ?? ""),
    ssl: Boolean(body?.dbSsl),
  };

  if (!admin.host || !admin.port || !admin.user || !admin.password) {
    return NextResponse.json({ error: "Missing admin connection fields" }, { status: 400 });
  }
  if (!app.database || !app.user || !app.password) {
    return NextResponse.json({ error: "Missing database fields" }, { status: 400 });
  }

  const dbUrlResult = buildDatabaseUrl({
    host: admin.host,
    port: admin.port,
    user: app.user,
    password: app.password,
    database: app.database,
    ssl: app.ssl,
  });
  if (!dbUrlResult.ok) {
    return NextResponse.json({ error: dbUrlResult.error }, { status: 400 });
  }

  try {
    await provisionDatabaseWithAdmin({
      admin,
      app: { database: app.database, user: app.user, password: app.password },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Provision failed" },
      { status: 400 }
    );
  }

  const nextAuthUrl = request.headers.get("origin") || undefined;
  const config = {
    databaseUrl: dbUrlResult.value,
    databaseSsl: app.ssl,
    nextAuthUrl,
    nextAuthSecret: randomBytes(32).toString("hex"),
    keysEncryptionSecret: randomBytes(32).toString("hex"),
  };

  const configPath = resolveConfigPath();
  if (existsSync(configPath)) {
    return NextResponse.json({ error: "Setup already completed" }, { status: 409 });
  }
  await mkdir(configPath.replace("/config.json", ""), { recursive: true });
  await writeFile(configPath, JSON.stringify(config, null, 2), { mode: 0o600 });

  process.env.DATABASE_URL = config.databaseUrl;
  process.env.DATABASE_SSL = config.databaseSsl ? "true" : "false";
  process.env.NEXTAUTH_SECRET = config.nextAuthSecret;
  process.env.KEYS_ENCRYPTION_SECRET = config.keysEncryptionSecret;

  return NextResponse.json({
    ok: true,
    database: {
      host: admin.host,
      port: admin.port,
      name: app.database,
      user: app.user,
      password: app.password,
      ssl: app.ssl,
    },
  });
}
