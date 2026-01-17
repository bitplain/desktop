import { NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import { resolveConfigPath } from "@/lib/runtimeConfig";
import { validateSecrets, validateDatabaseUrl } from "@/lib/setupValidation";
import { encryptConfigPayload } from "@/lib/configCrypto";
import { consumeRateLimit } from "@/lib/rateLimit";
import { getRequestIp } from "@/lib/requestIp";

export async function POST(request: Request) {
  const body = await request.json();
  const nextAuth = String(body?.nextAuthSecret || "");
  const keys = String(body?.keysEncryptionSecret || "");
  const databaseUrl = String(body?.databaseUrl || "");
  if (!validateSecrets(nextAuth, keys).ok || !validateDatabaseUrl(databaseUrl).ok) {
    return NextResponse.json({ error: "Invalid setup data." }, { status: 400 });
  }
  const ip = getRequestIp(request.headers);
  const rateLimitKey = `setup-config|${ip}`;
  const rateLimit = await consumeRateLimit(rateLimitKey, {
    limit: 5,
    windowMs: 60 * 60 * 1000,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Слишком много попыток настройки." },
      { status: 429 }
    );
  }
  const encryptionKey = process.env.CONFIG_ENCRYPTION_KEY?.trim() || "";
  if (!encryptionKey) {
    return NextResponse.json(
      { error: "CONFIG_ENCRYPTION_KEY is required" },
      { status: 500 }
    );
  }
  const path = resolveConfigPath();
  const encrypted = encryptConfigPayload(
    {
      databaseUrl,
      nextAuthSecret: nextAuth,
      keysEncryptionSecret: keys,
    },
    encryptionKey
  );
  await mkdir(path.replace("/config.json", ""), { recursive: true });
  await writeFile(
    path,
    JSON.stringify(encrypted, null, 2),
    { mode: 0o600 }
  );
  return NextResponse.json({ ok: true });
}
