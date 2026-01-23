import { NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import { resolveConfigPath } from "@/lib/runtimeConfig";
import { validateSecrets, validateDatabaseUrl } from "@/lib/setupValidation";

export async function POST(request: Request) {
  const body = await request.json();
  console.log("[setup-config] request", {
    method: request.method,
    url: request.url,
    headers: {
      "user-agent": request.headers.get("user-agent"),
      referer: request.headers.get("referer"),
      origin: request.headers.get("origin"),
    },
    body: {
      databaseUrl: body?.databaseUrl ? "[redacted]" : undefined,
      nextAuthSecret: body?.nextAuthSecret ? "[redacted]" : undefined,
      keysEncryptionSecret: body?.keysEncryptionSecret ? "[redacted]" : undefined,
    },
  });
  const nextAuth = String(body?.nextAuthSecret || "");
  const keys = String(body?.keysEncryptionSecret || "");
  const databaseUrl = String(body?.databaseUrl || "");
  if (!validateSecrets(nextAuth, keys).ok || !validateDatabaseUrl(databaseUrl).ok) {
    return NextResponse.json({ error: "Invalid setup data." }, { status: 400 });
  }
  const path = resolveConfigPath();
  await mkdir(path.replace("/config.json", ""), { recursive: true });
  await writeFile(
    path,
    JSON.stringify(
      {
        databaseUrl,
        nextAuthSecret: nextAuth,
        keysEncryptionSecret: keys,
      },
      null,
      2
    ),
    { mode: 0o600 }
  );
  return NextResponse.json({ ok: true });
}
