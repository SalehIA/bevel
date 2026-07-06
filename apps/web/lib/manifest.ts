import fs from "fs";
import path from "path";
import {
  IMAGE_EXT,
  MANIFEST_PATH,
  PROJECTS_DIR,
  VIDEO_EXT,
} from "./constants";
import { hasUnsafeFilename, safeStorageFilename } from "./media";
import { ensureDataDir } from "./storage";
import { ensureDefaultSections, getSectionSlugs } from "./sections";
import type { Manifest, ProjectMedia } from "./types";

function normalizeProjectFilenames(projectDir: string) {
  if (!fs.existsSync(projectDir)) return;
  for (const entry of fs.readdirSync(projectDir, { withFileTypes: true })) {
    if (!entry.isFile() || entry.name === "project.json") continue;
    if (!hasUnsafeFilename(entry.name)) continue;
    const src = path.join(projectDir, entry.name);
    let dest = path.join(projectDir, safeStorageFilename(entry.name));
    while (fs.existsSync(dest)) {
      dest = path.join(projectDir, safeStorageFilename(entry.name));
    }
    fs.renameSync(src, dest);
  }
}

function iterMedia(projectDir: string) {
  let photos: string[] = [];
  let videos: string[] = [];
  let thumbnail: string | null = null;

  function walk(dir: string, prefix = "") {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith(".")) continue;
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full, rel);
        continue;
      }
      if (entry.name === "project.json") continue;
      const ext = path.extname(entry.name).toLowerCase();
      if (IMAGE_EXT.has(ext)) {
        if (path.basename(entry.name, ext).toLowerCase() === "thumbnail") {
          thumbnail = rel;
        } else {
          photos.push(rel);
        }
      } else if (VIDEO_EXT.has(ext)) {
        videos.push(rel);
      }
    }
  }

  if (fs.existsSync(projectDir)) walk(projectDir);
  photos.sort();
  videos.sort();
  return { photos, videos, thumbnail };
}

function applyMediaOrder(items: string[], order: string[] | undefined) {
  if (!order?.length) return items;
  const set = new Set(items);
  const ordered = order.filter((name) => set.has(name));
  for (const name of items) {
    if (!ordered.includes(name)) ordered.push(name);
  }
  return ordered;
}

function loadProjectMeta(projectDir: string, slug: string) {
  const metaPath = path.join(projectDir, "project.json");
  const meta = fs.existsSync(metaPath)
    ? JSON.parse(fs.readFileSync(metaPath, "utf-8"))
    : {};
  return { ...meta, slug, name: meta.name || slug };
}

export function buildManifest(): Manifest {
  ensureDefaultSections();
  const manifest: Manifest = {
    categories: {},
    generated: true,
    source: "local",
  };

  for (const category of getSectionSlugs()) {
    const catDir = path.join(PROJECTS_DIR, category);
    const projects: ProjectMedia[] = [];

    if (fs.existsSync(catDir)) {
      for (const entry of fs.readdirSync(catDir, { withFileTypes: true })) {
        if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
        const projectDir = path.join(catDir, entry.name);
        normalizeProjectFilenames(projectDir);
        const meta = loadProjectMeta(projectDir, entry.name);
        const { photos, videos, thumbnail: fileThumb } = iterMedia(projectDir);

        const orderedPhotos = applyMediaOrder(photos, meta.mediaOrder);
        const orderedVideos = applyMediaOrder(videos, meta.mediaOrder);

        const project: ProjectMedia = {
          slug: meta.slug,
          name: meta.name,
          photos: orderedPhotos,
          videos: orderedVideos,
          thumbnail:
            meta.thumbnail && orderedPhotos.includes(meta.thumbnail)
              ? meta.thumbnail
              : fileThumb || orderedPhotos[0] || null,
        };
        if (meta.description) project.description = meta.description;
        if (meta.locationLink?.trim()) project.locationLink = meta.locationLink.trim();
        if (meta.siteEngineer?.name || meta.siteEngineer?.phone) {
          project.siteEngineer = meta.siteEngineer;
        }
        if (Array.isArray(meta.tags) && meta.tags.length) {
          project.tags = meta.tags;
        }
        if (Array.isArray(meta.visibleOnPages) && meta.visibleOnPages.length) {
          project.visibleOnPages = meta.visibleOnPages;
        }
        if (meta.photosByPage && typeof meta.photosByPage === "object") {
          const photosByPage: Record<string, string[]> = {};
          for (const [pageId, names] of Object.entries(meta.photosByPage)) {
            if (!Array.isArray(names)) continue;
            const picked = names.filter(
              (name) => typeof name === "string" && orderedPhotos.includes(name)
            );
            if (picked.length) photosByPage[pageId] = picked;
          }
          if (Object.keys(photosByPage).length) project.photosByPage = photosByPage;
        }
        if (meta.pageOrder && typeof meta.pageOrder === "object") {
          project.pageOrder = meta.pageOrder;
        }
        projects.push(project);
      }
    }

    manifest.categories[category] = projects.sort((a, b) =>
      a.name.localeCompare(b.name, "ar")
    );
  }

  return manifest;
}

export function writeManifest() {
  ensureDataDir();
  const manifest = buildManifest();
  fs.writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, "utf-8");
  return manifest;
}

export function readManifest(): Manifest {
  if (fs.existsSync(MANIFEST_PATH)) {
    return JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf-8"));
  }
  return writeManifest();
}
