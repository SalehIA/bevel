import path from "path";
import { randomUUID } from "crypto";

/** Strip bidi marks and odd spaces that break URLs on the web server. */
export function normalizeFilename(name: string) {
  return name
    .normalize("NFKC")
    .replace(/[\u200e\u200f\u202a-\u202e]/g, "")
    .replace(/[\u00a0\u202f]/g, " ")
    .trim();
}

export function hasUnsafeFilename(name: string) {
  const n = normalizeFilename(name);
  return n !== name || /[^\w\u0600-\u06FF.\-/ ]/.test(n) || n.includes(" ");
}

/** Safe storage name for uploads — avoids unicode URL issues. */
export function safeStorageFilename(original: string) {
  const ext = path.extname(original).toLowerCase() || ".jpg";
  return `media-${Date.now()}-${randomUUID().slice(0, 8)}${ext}`;
}

export function buildMediaPath(category: string, slug: string, filename: string) {
  const segments = [category, slug, ...filename.split("/")];
  return `/api/media/${segments.map((s) => encodeURIComponent(s)).join("/")}`;
}
