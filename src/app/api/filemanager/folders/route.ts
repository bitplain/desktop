import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { getAuthOptions } from "@/lib/auth";
import {
  createFolderHandler,
  deleteFolderHandler,
  getDataDir,
} from "@/lib/filemanager/api";

export async function POST(request: Request) {
  const session = await getServerSession(getAuthOptions());
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parentPath = String(body?.parentPath ?? "");
  const name = String(body?.name ?? "");
  const dataDir = getDataDir();

  try {
    const data = await createFolderHandler({
      dataDir,
      userId: session.user.id,
      parentPath,
      name,
    });
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Create failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const session = await getServerSession(getAuthOptions());
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const path = String(body?.path ?? "");
  const dataDir = getDataDir();

  try {
    const data = await deleteFolderHandler({ dataDir, userId: session.user.id, path });
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Delete failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
