import { NextResponse } from "next/server";
import { buildDatabaseUrl } from "@/lib/buildDatabaseUrl";
import { completeSetup, createDefaultSetupDeps } from "@/lib/setupCompletion";
import { consumeRateLimit } from "@/lib/rateLimit";
import { getRequestIp } from "@/lib/requestIp";
import { getCookieValue, validateCsrf } from "@/lib/csrf";

type SetupHandlerDeps = {
  completeSetup: typeof completeSetup;
  createDefaultSetupDeps: typeof createDefaultSetupDeps;
};

export async function handleSetupComplete(
  request: Request,
  deps: SetupHandlerDeps = { completeSetup, createDefaultSetupDeps }
) {
  const csrfCheck = validateCsrf(
    getCookieValue(request.headers.get("cookie"), "csrf-token"),
    request.headers.get("x-csrf-token")
  );
  if (!csrfCheck.ok) {
    return NextResponse.json({ error: csrfCheck.error }, { status: 403 });
  }
  const body = await request.json().catch(() => ({}));
  const ip = getRequestIp(request.headers);
  const rateLimitKey = `setup|${ip}`;
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
