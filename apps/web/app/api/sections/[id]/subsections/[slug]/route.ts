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
import { safeStorageFilename } from "@/lib/media";
import { writeManifest } from "@/lib/manifest";
import {
  deleteSubsection,
  findSection,
  readSubsectionMeta,
  subsectionDir,
  updateSubsection,
  writeSubsectionMeta,
} from "@/lib/sections";

type Params = { params: Promise<{ id: string; slug: string }> };

export async function PUT(request: Request, { params }: Params) {
  await bootstrapData();
  const session = await getSession();
  const { id, slug } = await params;
  if (!session.userId) return unauthorized();
  if (!canAccessTab(session, "gallery")) return forbidden();
  if (!canAccessSection(session, id)) return forbidden();

  const section = findSection(id);
  if (!section) return Response.json({ error: "Section not found" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  try {
    const subsection = updateSubsection(section.slug, slug, body);
    writeManifest();
    return Response.json({ ok: true, subsection });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Request failed" },
      { status: 400 }
    );
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  await bootstrapData();
  const session = await getSession();
  const { id, slug } = await params;
  if (!session.userId) return unauthorized();
  if (!canAccessTab(session, "gallery")) return forbidden();
  if (!canAccessSection(session, id)) return forbidden();

  const section = findSection(id);
  if (!section) return Response.json({ error: "Section not found" }, { status: 404 });

  try {
    deleteSubsection(section.slug, slug);
    writeManifest();
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Request failed" },
      { status: 400 }
    );
  }
}

export async function GET(_request: Request, { params }: Params) {
  await bootstrapData();
  const session = await getSession();
  const { id, slug } = await params;
  if (!session.userId) return unauthorized();
  if (!canAccessTab(session, "gallery")) return forbidden();
  if (!canAccessSection(session, id)) return forbidden();

  const section = findSection(id);
  if (!section) return Response.json({ error: "Section not found" }, { status: 404 });

  try {
    const dir = subsectionDir(section.slug, slug);
    if (!fs.existsSync(dir)) return Response.json({ error: "Subsection not found" }, { status: 404 });

    const meta = readSubsectionMeta(section.slug, slug);
    const files = sortFilesByOrder(listFiles(dir), meta.mediaOrder);
    return Response.json({
      files,
      thumbnail: meta.thumbnail,
      mediaOrder: meta.mediaOrder,
      tags: meta.tags,
      visibleOnPages: meta.visibleOnPages || [],
      photosByPage: meta.photosByPage || {},
      pageOrder: meta.pageOrder || {},
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Request failed" },
      { status: 400 }
    );
  }
}

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
  return files.sort((a, b) => a.name.localeCompare(b.name));
}

function sortFilesByOrder(
  files: { name: string; size: number; kind: string }[],
  order: string[] | undefined
) {
  if (!order?.length) return files;
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

export async function POST(request: Request, { params }: Params) {
  await bootstrapData();
  const session = await getSession();
  const { id, slug } = await params;
  if (!session.userId) return unauthorized();
  if (!canAccessTab(session, "gallery")) return forbidden();
  if (!canAccessSection(session, id)) return forbidden();

  const section = findSection(id);
  if (!section) return Response.json({ error: "Section not found" }, { status: 404 });

  try {
    const dir = subsectionDir(section.slug, slug);
    if (!fs.existsSync(dir)) return Response.json({ error: "Subsection not found" }, { status: 404 });

    const formData = await request.formData();
    const saved: string[] = [];

    for (const entry of formData.getAll("files")) {
      if (!(entry instanceof File) || !entry.name) continue;
      const original = path.basename(entry.name);
      if (!original || original.startsWith(".")) continue;
      const ext = path.extname(original).toLowerCase();
      if (!IMAGE_EXT.has(ext) && !VIDEO_EXT.has(ext)) continue;

      const filename = safeStorageFilename(original);
      const buffer = Buffer.from(await entry.arrayBuffer());
      fs.writeFileSync(path.join(dir, filename), buffer);
      saved.push(filename);
    }

    if (saved.length) {
      const meta = readSubsectionMeta(section.slug, slug);
      const mediaOrder = [...(meta.mediaOrder || []), ...saved];
      const patch: Record<string, unknown> = { mediaOrder };
      if (!meta.thumbnail && saved.some((f) => IMAGE_EXT.has(path.extname(f).toLowerCase()))) {
        patch.thumbnail = saved.find((f) => IMAGE_EXT.has(path.extname(f).toLowerCase()));
      }
      writeSubsectionMeta(section.slug, slug, patch);
    }

    writeManifest();
    return Response.json({ ok: true, saved });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Request failed" },
      { status: 400 }
    );
  }
}
