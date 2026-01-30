import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { extname } from "node:path";
import { getAuthOptions } from "@/lib/auth";
import { getDataDir, getStorageContext } from "@/lib/filemanager/api";
import { normalizeRelativePath } from "@/lib/filemanager/paths";
import { parseRange } from "@/lib/filemanager/stream";

const ALLOWED_EXTENSIONS = new Set([".mp4"]);

export async function GET(request: Request) {
  const session = await getServerSession(getAuthOptions());
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
    const context = await getStorageContext({ dataDir, userId: session.user.id });
    const mappedPath = context.mapPath(normalized);
    const info = await context.provider.stat(mappedPath);
    const rangeHeader = request.headers.get("range");
    const range = parseRange(rangeHeader, info.size);

    if (range) {
      const { start, end } = range;
      const stream = context.provider.createReadStream(mappedPath, { start, end });
      return new NextResponse(stream as unknown as ReadableStream, {
        status: 206,
        headers: {
          "Content-Type": "video/mp4",
          "Content-Length": String(end - start + 1),
          "Content-Range": `bytes ${start}-${end}/${info.size}`,
          "Accept-Ranges": "bytes",
        },
      });
    }

    const stream = context.provider.createReadStream(mappedPath);
    return new NextResponse(stream as unknown as ReadableStream, {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Length": String(info.size),
        "Accept-Ranges": "bytes",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Not found";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
