import { NextResponse } from "next/server";
import { getSetupStatus } from "@/lib/setupStatus";

export async function GET() {
  const status = await getSetupStatus({ allowAutoDbFix: true, allowAutoSslFix: true });
  return NextResponse.json({ status });
}
