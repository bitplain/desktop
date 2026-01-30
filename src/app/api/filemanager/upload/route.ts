import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { basename, extname } from "node:path";
import { getAuthOptions } from "@/lib/auth";
import { getDataDir, getStorageContext } from "@/lib/filemanager/api";

const ALLOWED_EXTENSIONS = new Set([".mp4"]);

function isAllowedFile(name: string) {
  return ALLOWED_EXTENSIONS.has(extname(name).toLowerCase());
}

function extractFiles(formData: FormData) {
  const primary = formData.getAll("files");
  const secondary = primary.length === 0 ? formData.getAll("files[]") : [];
  const combined = primary.length === 0 ? secondary : primary;
  return combined.filter((item): item is File => item instanceof File);
}

export async function POST(request: Request) {
  const session = await getServerSession(getAuthOptions());
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const path = String(formData.get("path") ?? "");
  const files = extractFiles(formData);

  if (files.length === 0) {
    return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
  }

  const dataDir = getDataDir();
  const context = await getStorageContext({ dataDir, userId: session.user.id });
  const mappedPath = context.mapPath(path);

  const uploaded: { name: string; path: string; size: number }[] = [];
  for (const file of files) {
    const name = basename(file.name);
    if (!name || !isAllowedFile(name)) {
      return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const destination = context.mapPath([path, name].filter(Boolean).join("/"));
    await context.provider.writeFile(destination, buffer);
    uploaded.push({ name, path: [path, name].filter(Boolean).join("/"), size: buffer.length });
  }

  return NextResponse.json({ ok: true, uploaded });
}
