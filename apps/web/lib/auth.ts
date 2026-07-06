import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { ADMIN_ROLE_ID } from "./constants";
import { hasAdminTab, hasSection, hasTab } from "./permissions";
import { sessionOptions, type SessionData } from "./session";
import {
  ensureDefaultRoles,
  syncAdminPermissions,
} from "./roles";
import {
  ensureDefaultSections,
} from "./sections";
import {
  ensureDefaultUser,
  findUserById,
  publicUser,
  syncDefaultAdminPassword,
} from "./users";

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), sessionOptions);
}

export async function bootstrapData() {
  ensureDefaultRoles();
  syncAdminPermissions();
  ensureDefaultSections();
  ensureDefaultUser();
  syncDefaultAdminPassword();
}

export async function getCurrentUser() {
  await bootstrapData();
  const session = await getSession();
  if (!session.userId) return null;
  const user = findUserById(session.userId);
  if (!user) return null;
  return publicUser(user);
}

export async function setSessionUser(user: ReturnType<typeof publicUser>) {
  const session = await getSession();
  session.userId = user.id;
  session.username = user.username;
  session.name = user.name;
  session.roleId = user.role_id;
  session.roleName = user.role_name;
  session.permissions = user.permissions;
  session.isLoggedIn = true;
  await session.save();
}

export async function clearSession() {
  const session = await getSession();
  session.destroy();
}

export function isAdmin(session: SessionData) {
  return session.roleId === ADMIN_ROLE_ID;
}

export function canAccessTab(session: SessionData, tab: string) {
  if (isAdmin(session)) return true;
  return hasTab(session.permissions, tab);
}

export function canAccessAdminTab(session: SessionData, tab: string) {
  if (isAdmin(session)) return true;
  return hasAdminTab(session.permissions, tab);
}

export function canAccessSection(session: SessionData, sectionId: string) {
  if (isAdmin(session)) return true;
  return hasSection(session.permissions, sectionId);
}

export function unauthorized() {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

export function forbidden() {
  return Response.json({ error: "Forbidden" }, { status: 403 });
}
