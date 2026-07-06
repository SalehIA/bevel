import fs from "fs";
import path from "path";
import { PROJECTS_DIR } from "@/lib/constants";

type Params = { params: Promise<{ path: string[] }> };

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".heic": "image/heic",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".m4v": "video/x-m4v",
};

export async function GET(_request: Request, { params }: Params) {
  const segments = (await params).path.map((s) => decodeURIComponent(s));
  if (segments.length < 3) {
    return new Response("Not found", { status: 404 });
  }

  const [category, slug, ...rest] = segments;
  const filePath = path.join(PROJECTS_DIR, category, slug, ...rest);
  const resolved = path.resolve(filePath);
  const root = path.resolve(PROJECTS_DIR, category, slug);

  if (!resolved.startsWith(root) || !fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
    return new Response("Not found", { status: 404 });
  }

  const ext = path.extname(resolved).toLowerCase();
  const body = fs.readFileSync(resolved);
  return new Response(body, {
    headers: {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "Cache-Control": "public, max-age=604800",
    },
  });
}
