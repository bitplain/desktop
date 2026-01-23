import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { deleteFileHandler, getDataDir } from "@/lib/filemanager/api";

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const path = String(body?.path ?? "");
  const dataDir = getDataDir();

  try {
    const data = await deleteFileHandler({ dataDir, userId: session.user.id, path });
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Delete failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
