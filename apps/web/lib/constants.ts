import path from "path";

export const ADMIN_ROLE_ID = "role-admin";
export const EDITOR_ROLE_ID = "role-editor";

export const ALL_TABS = ["gallery", "admin"] as const;
export const ALL_ADMIN_TABS = ["users", "roles"] as const;

export const IMAGE_EXT = new Set([
  ".jpg", ".jpeg", ".png", ".webp", ".gif", ".heic", ".svg",
]);
export const VIDEO_EXT = new Set([".mp4", ".webm", ".mov", ".m4v"]);

/**
 * Runtime data lives outside the app directory in production.
 * Set BEVEL_DATA_DIR and BEVEL_PROJECTS_DIR in .env.local on the VPS.
 * Defaults keep local dev working without extra config.
 */
export const DATA_DIR = process.env.BEVEL_DATA_DIR
  ? path.resolve(process.env.BEVEL_DATA_DIR)
  : path.join(process.cwd(), "data");

export const PROJECTS_DIR = process.env.BEVEL_PROJECTS_DIR
  ? path.resolve(process.env.BEVEL_PROJECTS_DIR)
  : path.join(process.cwd(), "public", "projects");

export const MANIFEST_PATH = path.join(DATA_DIR, "manifest.json");

export const DEFAULT_SECTIONS = [
  { name: "التصميم", slug: "التصميم" },
  { name: "التنفيذ", slug: "التنفيذ" },
];
