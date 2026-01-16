import { NextResponse } from "next/server";
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
  const result = await deps.completeSetup({
    databaseUrl: String(body?.databaseUrl ?? ""),
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
