import { NextResponse } from "next/server";
import { buildDatabaseUrl } from "@/lib/buildDatabaseUrl";
import { completeSetup, createDefaultSetupDeps } from "@/lib/setupCompletion";

type SetupHandlerDeps = {
  completeSetup: typeof completeSetup;
  createDefaultSetupDeps: typeof createDefaultSetupDeps;
};

export async function handleSetupComplete(
  request: Request,
  deps: SetupHandlerDeps = { completeSetup, createDefaultSetupDeps }
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
  const builtDatabaseUrl = buildDatabaseUrl({
    host: String(body?.dbHost ?? ""),
    port: String(body?.dbPort ?? ""),
    user: String(body?.dbUser ?? ""),
    password: String(body?.dbPassword ?? ""),
    database: "desktop",
  });
  const databaseUrl = rawDatabaseUrl || (builtDatabaseUrl.ok ? builtDatabaseUrl.value : "");
  const result = await deps.completeSetup({
    databaseUrl,
    email: String(body?.email ?? ""),
    password: String(body?.password ?? ""),
  }, deps.createDefaultSetupDeps());

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
