import fs from "fs";
import path from "path";
import {
  bootstrapData,
  canAccessSection,
  canAccessTab,
  forbidden,
  getSession,
  unauthorized,
} from "@/lib/auth";
import { IMAGE_EXT, VIDEO_EXT } from "@/lib/constants";
import { writeManifest } from "@/lib/manifest";
import {
  findSection,
  readSubsectionMeta,
  subsectionDir,
  writeSubsectionMeta,
} from "@/lib/sections";

type Params = { params: Promise<{ id: string; slug: string }> };

function listFiles(dir: string, prefix = "") {
  const files: { name: string; size: number; kind: string }[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || entry.name === "project.json") continue;
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFiles(full, rel));
      continue;
    }
    const ext = path.extname(entry.name).toLowerCase();
    files.push({
      name: rel,
      size: fs.statSync(full).size,
      kind: VIDEO_EXT.has(ext) ? "video" : "image",
    });
  }
  return files;
}

function sortFilesByOrder(
  files: { name: string; size: number; kind: string }[],
  order: string[] | undefined
) {
  if (!order?.length) return files.sort((a, b) => a.name.localeCompare(b.name));
  const map = new Map(files.map((f) => [f.name, f]));
  const sorted: typeof files = [];
  for (const name of order) {
    const file = map.get(name);
    if (file) sorted.push(file);
  }
  for (const file of files) {
    if (!sorted.includes(file)) sorted.push(file);
  }
  return sorted;
}

export async function PATCH(request: Request, { params }: Params) {
  await bootstrapData();
  const session = await getSession();
  const { id, slug } = await params;
  if (!session.userId) return unauthorized();
  if (!canAccessTab(session, "gallery")) return forbidden();
  if (!canAccessSection(session, id)) return forbidden();

  const section = findSection(id);
  if (!section) return Response.json({ error: "Section not found" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const action = String(body.action || "");

  try {
    const dir = subsectionDir(section.slug, slug);
    if (!fs.existsSync(dir)) return Response.json({ error: "Subsection not found" }, { status: 404 });

    const meta = readSubsectionMeta(section.slug, slug);
    const files = listFiles(dir);

    if (action === "reorder") {
      const order = Array.isArray(body.order) ? body.order.map(String) : [];
      const names = new Set(files.map((f) => f.name));
      if (!order.every((name: string) => names.has(name))) {
        return Response.json({ error: "Invalid order" }, { status: 400 });
      }
      writeSubsectionMeta(section.slug, slug, { mediaOrder: order });
    } else if (action === "setThumbnail") {
      const name = String(body.name || "").trim();
      const file = files.find((f) => f.name === name);
      if (!file || file.kind !== "image") {
        return Response.json({ error: "Invalid thumbnail" }, { status: 400 });
      }
      writeSubsectionMeta(section.slug, slug, { thumbnail: name });
    } else {
      return Response.json({ error: "Unknown action" }, { status: 400 });
    }

    writeManifest();
    const updated = readSubsectionMeta(section.slug, slug);
    return Response.json({
      ok: true,
      thumbnail: updated.thumbnail,
      mediaOrder: updated.mediaOrder,
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Request failed" },
      { status: 400 }
    );
  }
}

export async function DELETE(request: Request, { params }: Params) {
  await bootstrapData();
  const session = await getSession();
  const { id, slug } = await params;
  if (!session.userId) return unauthorized();
  if (!canAccessTab(session, "gallery")) return forbidden();
  if (!canAccessSection(session, id)) return forbidden();

  const section = findSection(id);
  if (!section) return Response.json({ error: "Section not found" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const name = String(body.name || "").trim();
  if (!name || name.includes("..")) {
    return Response.json({ error: "Invalid file name" }, { status: 400 });
  }

  try {
    const dir = subsectionDir(section.slug, slug);
    const target = path.resolve(dir, name);
    if (!target.startsWith(path.resolve(dir)) || !fs.existsSync(target)) {
      return Response.json({ error: "File not found" }, { status: 404 });
    }
    fs.unlinkSync(target);

    const meta = readSubsectionMeta(section.slug, slug);
    const mediaOrder = (meta.mediaOrder || []).filter((item: string) => item !== name);
    const patch: Record<string, unknown> = { mediaOrder };
    if (meta.thumbnail === name) patch.thumbnail = null;
    writeSubsectionMeta(section.slug, slug, patch);

    writeManifest();
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Request failed" },
      { status: 400 }
    );
  }
}
