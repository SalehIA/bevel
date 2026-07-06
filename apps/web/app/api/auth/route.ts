import { NextResponse } from "next/server";
import { bootstrapData, clearSession, getCurrentUser, getSession, setSessionUser } from "@/lib/auth";
import { verifyLogin } from "@/lib/users";

export async function POST(request: Request) {
  try {
    await bootstrapData();
    const body = await request.json().catch(() => ({}));
    const username = String(body.username || "").trim();
    const password = String(body.password || "");

    const user = await verifyLogin(username, password);
    if (!user) {
      return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
    }

    await setSessionUser(user);
    return NextResponse.json({ ok: true, user });
  } catch (error) {
    console.error("Login failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Login failed" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  await clearSession();
  return NextResponse.json({ ok: true });
}

export async function GET() {
  await bootstrapData();
  const session = await getSession();
  const user = await getCurrentUser();
  if (user && session.userId) {
    session.permissions = user.permissions;
    session.roleId = user.role_id;
    session.roleName = user.role_name;
    await session.save();
  }
  return NextResponse.json({ authenticated: Boolean(user), user });
}
