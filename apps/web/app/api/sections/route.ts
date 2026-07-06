import {
  bootstrapData,
  canAccessTab,
  forbidden,
  getSession,
  unauthorized,
} from "@/lib/auth";
import { writeManifest } from "@/lib/manifest";
import { createSection, listSections } from "@/lib/sections";
import { hasSection } from "@/lib/permissions";

export async function GET() {
  await bootstrapData();
  const session = await getSession();
  if (!session.userId) return unauthorized();
  if (!canAccessTab(session, "gallery")) return forbidden();

  const sections = listSections().filter(
    (s) => session.roleId === "role-admin" || hasSection(session.permissions, s.id)
  );
  return Response.json({ sections });
}

export async function POST(request: Request) {
  await bootstrapData();
  const session = await getSession();
  if (!session.userId) return unauthorized();
  if (!canAccessTab(session, "gallery")) return forbidden();

  const body = await request.json().catch(() => ({}));
  try {
    const section = createSection(String(body.name || ""), String(body.slug || ""));
    writeManifest();
    return Response.json({ ok: true, section });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Request failed" },
      { status: 400 }
    );
  }
}
