import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import {
  ADMIN_ROLE_ID,
  EDITOR_ROLE_ID,
} from "./constants";
import { getEffectivePermissions } from "./permissions";
import {
  ensureDefaultRoles,
  findRole,
  getPermissions,
  migrateLegacyRoleName,
} from "./roles";
import { readJson, writeJson } from "./storage";
import type { PublicUser } from "./types";

type UserRecord = {
  id: string;
  username: string;
  name: string;
  role_id: string;
  password_hash: string;
  role?: string;
};

type UsersStore = { users: UserRecord[] };

function emptyStore(): UsersStore {
  return { users: [] };
}

function defaultUsername() {
  return process.env.BEVEL_DEFAULT_USERNAME || "admin";
}

function defaultName() {
  return process.env.BEVEL_DEFAULT_NAME || "مدير Bevel";
}

function defaultPassword() {
  return process.env.BEVEL_DEFAULT_PASSWORD || "Bevel@2026";
}

export function loadUsers(): UsersStore {
  return readJson("users.json", emptyStore());
}

export function saveUsers(store: UsersStore) {
  writeJson("users.json", store);
}

export function migrateUsers() {
  ensureDefaultRoles();
  const store = loadUsers();
  let changed = false;

  for (const user of store.users) {
    if (!user.role_id && user.role) {
      user.role_id = migrateLegacyRoleName(user.role);
      delete user.role;
      changed = true;
    }
    if (user.role_id === "admin" || user.role_id === "editor") {
      user.role_id = migrateLegacyRoleName(user.role_id);
      changed = true;
    }
    if (user.username.toLowerCase() === defaultUsername().toLowerCase()) {
      user.role_id = ADMIN_ROLE_ID;
      changed = true;
    } else if (!findRole(user.role_id)) {
      user.role_id = EDITOR_ROLE_ID;
      changed = true;
    }
  }

  if (changed) saveUsers(store);
  return store;
}

export function ensureDefaultUser() {
  migrateUsers();
  syncDefaultAdminPassword();
  const store = loadUsers();
  if (store.users.length) return store;

  store.users.push({
    id: randomUUID(),
    username: defaultUsername(),
    name: defaultName(),
    role_id: ADMIN_ROLE_ID,
    password_hash: bcrypt.hashSync(defaultPassword(), 10),
  });
  saveUsers(store);
  return store;
}

/** Migrate Flask/werkzeug hashes and keep default admin password in sync with env. */
export function syncDefaultAdminPassword() {
  const store = loadUsers();
  const admin = store.users.find(
    (u) => u.username.toLowerCase() === defaultUsername().toLowerCase()
  );
  if (!admin) return;

  const hash = admin.password_hash || "";
  const isBcrypt = hash.startsWith("$2a$") || hash.startsWith("$2b$");
  const force = process.env.BEVEL_SYNC_ADMIN_PASSWORD === "true";

  if (force || !isBcrypt) {
    admin.password_hash = bcrypt.hashSync(defaultPassword(), 10);
    admin.role_id = ADMIN_ROLE_ID;
    admin.name = defaultName();
    saveUsers(store);
  }
}

export function findUser(username: string) {
  const needle = username.trim().toLowerCase();
  return loadUsers().users.find((u) => u.username.toLowerCase() === needle) || null;
}

export function findUserById(userId: string) {
  return loadUsers().users.find((u) => u.id === userId) || null;
}

export function countUsersWithRole(roleId: string) {
  return loadUsers().users.filter((u) => u.role_id === roleId).length;
}

export function publicUser(user: UserRecord): PublicUser {
  const role = findRole(user.role_id);
  const permissions = getPermissions(user.role_id);
  return {
    id: user.id,
    username: user.username,
    name: user.name || user.username,
    role_id: user.role_id,
    role_name: role?.name || "محرر",
    permissions: getEffectivePermissions(user.role_id, permissions),
  };
}

export async function verifyLogin(username: string, password: string) {
  const user = findUser(username);
  if (!user) return null;
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return null;
  return publicUser(user);
}

export function listPublicUsers() {
  return loadUsers().users.map(publicUser);
}

export async function createUser(input: {
  username: string;
  name: string;
  password: string;
  role_id: string;
}) {
  const username = input.username.trim().toLowerCase();
  if (!username || !input.password) throw new Error("Username and password are required");
  if (!findRole(input.role_id)) throw new Error("Invalid role");

  const store = loadUsers();
  if (store.users.some((u) => u.username.toLowerCase() === username)) {
    throw new Error("Username already exists");
  }

  const user: UserRecord = {
    id: randomUUID(),
    username,
    name: input.name.trim() || username,
    role_id: input.role_id,
    password_hash: await bcrypt.hash(input.password, 10),
  };
  store.users.push(user);
  saveUsers(store);
  return publicUser(user);
}

export function deleteUser(userId: string) {
  const store = loadUsers();
  const before = store.users.length;
  store.users = store.users.filter((u) => u.id !== userId);
  if (store.users.length === before) throw new Error("User not found");
  saveUsers(store);
}
