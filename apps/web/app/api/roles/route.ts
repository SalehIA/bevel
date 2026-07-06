import {
  bootstrapData,
  canAccessAdminTab,
  canAccessTab,
  forbidden,
  getSession,
  unauthorized,
} from "@/lib/auth";
import { createRole, deleteRole, listPublicRoles, updateRole } from "@/lib/roles";
import { countUsersWithRole } from "@/lib/users";

export async function GET() {
  await bootstrapData();
  const session = await getSession();
  if (!session.userId) return unauthorized();
  if (!canAccessTab(session, "admin")) return forbidden();
  if (!canAccessAdminTab(session, "roles")) return forbidden();

  return Response.json({ roles: listPublicRoles() });
}

export async function POST(request: Request) {
  await bootstrapData();
  const session = await getSession();
  if (!session.userId) return unauthorized();
  if (!canAccessTab(session, "admin")) return forbidden();
  if (!canAccessAdminTab(session, "roles")) return forbidden();

  const body = await request.json().catch(() => ({}));
  try {
    const role = createRole(String(body.name || ""), body.permissions || {});
    return Response.json({ ok: true, role });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Request failed" },
      { status: 400 }
    );
  }
}

export async function PUT(request: Request) {
  await bootstrapData();
  const session = await getSession();
  if (!session.userId) return unauthorized();
  if (!canAccessTab(session, "admin")) return forbidden();
  if (!canAccessAdminTab(session, "roles")) return forbidden();

  const body = await request.json().catch(() => ({}));
  const roleId = String(body.id || "");
  if (!roleId) return Response.json({ error: "Role id required" }, { status: 400 });

  try {
    const role = updateRole(roleId, {
      name: body.name,
      permissions: body.permissions,
    });
    return Response.json({ ok: true, role });
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
  if (!canAccessAdminTab(session, "roles")) return forbidden();

  const { searchParams } = new URL(request.url);
  const roleId = searchParams.get("id");
  if (!roleId) return Response.json({ error: "Role id required" }, { status: 400 });
  if (countUsersWithRole(roleId)) {
    return Response.json({ error: "Role is assigned to users" }, { status: 400 });
  }

  try {
    deleteRole(roleId);
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Request failed" },
      { status: 400 }
    );
  }
}
