import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { readFile } from "node:fs/promises";
import { extname } from "node:path";
import { authOptions } from "@/lib/auth";
import { getDataDir } from "@/lib/filemanager/api";
import { normalizeRelativePath, resolveUserPath } from "@/lib/filemanager/paths";

const ALLOWED_EXTENSIONS = new Set([".mp4"]);

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const rawPath = url.searchParams.get("path") ?? "";
  const normalized = normalizeRelativePath(rawPath);
  if (!normalized || !normalized.startsWith("video/")) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  const ext = extname(normalized).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
  }

  const dataDir = getDataDir();
  try {
    const { target } = resolveUserPath(dataDir, session.user.id, normalized);
    const file = await readFile(target);
    return new NextResponse(file, {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Length": String(file.length),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Not found";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
