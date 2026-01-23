import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { extname } from "node:path";
import { authOptions } from "@/lib/auth";
import { getDataDir } from "@/lib/filemanager/api";
import { normalizeRelativePath, resolveUserPath } from "@/lib/filemanager/paths";
import { parseRange } from "@/lib/filemanager/stream";

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
    const info = await stat(target);
    const rangeHeader = request.headers.get("range");
    const range = parseRange(rangeHeader, info.size);

    if (range) {
      const { start, end } = range;
      const stream = createReadStream(target, { start, end });
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

    const stream = createReadStream(target);
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
