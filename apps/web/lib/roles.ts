import { randomUUID } from "crypto";
import {
  ADMIN_ROLE_ID,
  EDITOR_ROLE_ID,
} from "./constants";
import { fullPermissions, normalizePermissions } from "./permissions";
import { readJson, writeJson } from "./storage";
import type { Permissions, Role } from "./types";

type RoleRecord = Role & { permissions: Permissions };

type RolesStore = { roles: RoleRecord[] };

function emptyStore(): RolesStore {
  return { roles: [] };
}

export function loadRoles(): RolesStore {
  return readJson("roles.json", emptyStore());
}

export function saveRoles(store: RolesStore) {
  writeJson("roles.json", store);
}

export function ensureDefaultRoles() {
  const store = loadRoles();
  if (!store.roles.length) {
    store.roles = [
      { id: ADMIN_ROLE_ID, name: "مدير", permissions: fullPermissions() },
      {
        id: EDITOR_ROLE_ID,
        name: "محرر",
        permissions: { tabs: ["gallery"], sections: ["*"], admin_tabs: [] },
      },
    ];
    saveRoles(store);
    return store;
  }
  syncAdminPermissions();
  return store;
}

export function syncAdminPermissions() {
  const store = loadRoles();
  const admin = store.roles.find((r) => r.id === ADMIN_ROLE_ID);
  if (admin) {
    admin.permissions = fullPermissions();
    saveRoles(store);
  }
}

export function findRole(roleId: string) {
  return loadRoles().roles.find((r) => r.id === roleId) || null;
}

export function listPublicRoles(): Role[] {
  return loadRoles().roles.map((r) => ({
    id: r.id,
    name: r.name,
    permissions: normalizePermissions(r.permissions),
  }));
}

export function getPermissions(roleId: string): Permissions {
  if (roleId === ADMIN_ROLE_ID) return fullPermissions();
  const role = findRole(roleId);
  return normalizePermissions(role?.permissions);
}

export function createRole(name: string, permissions: Partial<Permissions>) {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Role name is required");
  const store = loadRoles();
  if (store.roles.some((r) => r.name === trimmed)) {
    throw new Error("Role name already exists");
  }
  const role: RoleRecord = {
    id: `role-${randomUUID().slice(0, 8)}`,
    name: trimmed,
    permissions: normalizePermissions(permissions),
  };
  store.roles.push(role);
  saveRoles(store);
  return { id: role.id, name: role.name, permissions: role.permissions };
}

export function updateRole(
  roleId: string,
  data: { name?: string; permissions?: Partial<Permissions> }
) {
  const store = loadRoles();
  const role = store.roles.find((r) => r.id === roleId);
  if (!role) throw new Error("Role not found");
  if (data.name !== undefined) role.name = data.name.trim() || role.name;
  if (data.permissions !== undefined) {
    role.permissions = normalizePermissions(data.permissions);
  }
  saveRoles(store);
  return { id: role.id, name: role.name, permissions: role.permissions };
}

export function deleteRole(roleId: string) {
  if (roleId === ADMIN_ROLE_ID || roleId === EDITOR_ROLE_ID) {
    throw new Error("Cannot delete built-in role");
  }
  const store = loadRoles();
  if (!store.roles.some((r) => r.id === roleId)) throw new Error("Role not found");
  store.roles = store.roles.filter((r) => r.id !== roleId);
  saveRoles(store);
}

export function migrateLegacyRoleName(name: string) {
  return name === "admin" ? ADMIN_ROLE_ID : EDITOR_ROLE_ID;
}
