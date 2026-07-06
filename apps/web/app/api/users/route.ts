import {
  bootstrapData,
  canAccessAdminTab,
  canAccessTab,
  forbidden,
  getSession,
  unauthorized,
} from "@/lib/auth";
import { listPublicRoles } from "@/lib/roles";
import { createUser, deleteUser, listPublicUsers } from "@/lib/users";

export async function GET() {
  await bootstrapData();
  const session = await getSession();
  if (!session.userId) return unauthorized();
  if (!canAccessTab(session, "admin")) return forbidden();
  if (!canAccessAdminTab(session, "users")) return forbidden();

  return Response.json({ users: listPublicUsers(), roles: listPublicRoles() });
}

export async function POST(request: Request) {
  await bootstrapData();
  const session = await getSession();
  if (!session.userId) return unauthorized();
  if (!canAccessTab(session, "admin")) return forbidden();
  if (!canAccessAdminTab(session, "users")) return forbidden();

  const body = await request.json().catch(() => ({}));
  try {
    const user = await createUser({
      username: String(body.username || ""),
      name: String(body.name || ""),
      password: String(body.password || ""),
      role_id: String(body.role_id || ""),
    });
    return Response.json({ ok: true, user });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Request failed" },
      { status: 400 }
    );
  }
}

export async function DELETE(request: Request) {
  await bootstrapData();
  const session = await getSession();
  if (!session.userId) return unauthorized();
  if (!canAccessTab(session, "admin")) return forbidden();
  if (!canAccessAdminTab(session, "users")) return forbidden();

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("id");
  if (!userId) return Response.json({ error: "User id required" }, { status: 400 });
  if (userId === session.userId) {
    return Response.json({ error: "You cannot delete your own account" }, { status: 400 });
  }

  try {
    deleteUser(userId);
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Request failed" },
      { status: 404 }
    );
  }
}
