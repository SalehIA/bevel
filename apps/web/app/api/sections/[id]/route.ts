import {
  bootstrapData,
  canAccessSection,
  canAccessTab,
  forbidden,
  getSession,
  unauthorized,
} from "@/lib/auth";
import { writeManifest } from "@/lib/manifest";
import { createSubsection, deleteSection, findSection, updateSection } from "@/lib/sections";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Params) {
  await bootstrapData();
  const session = await getSession();
  const { id } = await params;
  if (!session.userId) return unauthorized();
  if (!canAccessTab(session, "gallery")) return forbidden();
  if (!canAccessSection(session, id)) return forbidden();

  const body = await request.json().catch(() => ({}));
  try {
    const section = updateSection(id, {
      name: body.name !== undefined ? String(body.name) : undefined,
      description: body.description !== undefined ? String(body.description) : undefined,
    });
    writeManifest();
    return Response.json({ ok: true, section });
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
  const { id } = await params;
  if (!session.userId) return unauthorized();
  if (!canAccessTab(session, "gallery")) return forbidden();
  if (!canAccessSection(session, id)) return forbidden();

  try {
    deleteSection(id);
    writeManifest();
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Request failed" },
      { status: 400 }
    );
  }
}

export async function POST(request: Request, { params }: Params) {
  await bootstrapData();
  const session = await getSession();
  const { id } = await params;
  if (!session.userId) return unauthorized();
  if (!canAccessTab(session, "gallery")) return forbidden();
  if (!canAccessSection(session, id)) return forbidden();

  const section = findSection(id);
  if (!section) return Response.json({ error: "Section not found" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  try {
    const subsection = createSubsection(
      id,
      String(body.slug || ""),
      String(body.name || "")
    );
    writeManifest();
    return Response.json({ ok: true, subsection });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Request failed" },
      { status: 400 }
    );
  }
}
