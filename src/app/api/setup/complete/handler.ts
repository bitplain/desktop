import { NextResponse } from "next/server";
import { buildDatabaseUrl } from "@/lib/buildDatabaseUrl";
import { completeSetup, createDefaultSetupDeps } from "@/lib/setupCompletion";
import { getSetupStatus } from "@/lib/setupStatus";

type SetupHandlerDeps = {
  completeSetup: typeof completeSetup;
  createDefaultSetupDeps: typeof createDefaultSetupDeps;
  getSetupStatus: typeof getSetupStatus;
};

export async function handleSetupComplete(
  request: Request,
  deps: SetupHandlerDeps = { completeSetup, createDefaultSetupDeps, getSetupStatus }
) {
  const body = await request.json().catch(() => ({}));
  const maskedBody = {
    ...body,
    password: body?.password ? "[redacted]" : undefined,
  };
  console.log("[setup-complete] request", {
    method: request.method,
    url: request.url,
    headers: {
      "user-agent": request.headers.get("user-agent"),
      referer: request.headers.get("referer"),
      origin: request.headers.get("origin"),
    },
    body: maskedBody,
  });
  const rawDatabaseUrl = String(body?.databaseUrl ?? "");
  const dbSsl = Boolean(body?.dbSsl);
  const builtDatabaseUrl = buildDatabaseUrl({
    host: String(body?.dbHost ?? ""),
    port: String(body?.dbPort ?? ""),
    user: String(body?.dbUser ?? ""),
    password: String(body?.dbPassword ?? ""),
    database: String(body?.dbName ?? ""),
    ssl: dbSsl,
  });
  const databaseUrl = rawDatabaseUrl || (builtDatabaseUrl.ok ? builtDatabaseUrl.value : "");
  const status = await deps.getSetupStatus({ allowAutoDbFix: true, allowAutoSslFix: true });
  const allowDatabaseUrlOverride = status === "dbUnavailable";
  const result = await deps.completeSetup(
    {
      databaseUrl,
      email: String(body?.email ?? ""),
      password: String(body?.password ?? ""),
      allowDatabaseUrlOverride,
      databaseSsl: dbSsl,
    },
    deps.createDefaultSetupDeps()
  );

  if (result.status === "invalid") {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  if (result.status === "alreadySetup") {
    return NextResponse.json({ error: "Setup already completed" }, { status: 409 });
  }
  if (result.status === "dbError") {
    return NextResponse.json({ error: result.error }, { status: 503 });
  }
  return NextResponse.json({ ok: true });
}
