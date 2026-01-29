import { NextResponse } from "next/server";
import { getSetupStatus } from "@/lib/setupStatus";

export async function GET() {
  const status = await getSetupStatus({ allowAutoSslFix: true });
  return NextResponse.json({ status });
}
