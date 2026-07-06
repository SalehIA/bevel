import {
  bootstrapData,
  canAccessTab,
  forbidden,
  getSession,
  unauthorized,
} from "@/lib/auth";
import { writeManifest } from "@/lib/manifest";

export async function POST() {
  await bootstrapData();
  const session = await getSession();
  if (!session.userId) return unauthorized();
  if (!canAccessTab(session, "gallery")) return forbidden();

  const manifest = writeManifest();
  return Response.json({ ok: true, manifest });
}
