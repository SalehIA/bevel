import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import {
  DEFAULT_SECTIONS,
  PROJECTS_DIR,
} from "./constants";
import { readJson, writeJson } from "./storage";
import type { Section, Subsection } from "./types";

type SectionsStore = { sections: Section[] };

function emptyStore(): SectionsStore {
  return { sections: [] };
}

export function loadSectionsStore(): SectionsStore {
  return readJson("sections.json", emptyStore());
}

export function saveSectionsStore(store: SectionsStore) {
  writeJson("sections.json", store);
}

function validateSlug(slug: string) {
  const value = slug.trim();
  if (!value || value.includes("..") || value.includes("/") || value.includes("\\")) {
    throw new Error("Invalid slug");
  }
  return value;
}

function readProjectMeta(dir: string): Subsection {
  const metaPath = path.join(dir, "project.json");
  if (!fs.existsSync(metaPath)) {
    return { slug: path.basename(dir), name: path.basename(dir) };
  }
  const meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
  return {
    slug: path.basename(dir),
    name: meta.name || path.basename(dir),
    description: meta.description,
    locationLink: meta.locationLink,
    siteEngineer: meta.siteEngineer,
    tags: Array.isArray(meta.tags) ? meta.tags : [],
    thumbnail: meta.thumbnail ?? null,
    mediaOrder: Array.isArray(meta.mediaOrder) ? meta.mediaOrder : [],
  };
}

export function listSubsections(sectionSlug: string): Subsection[] {
  const dir = path.join(PROJECTS_DIR, sectionSlug);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith("."))
    .map((e) => readProjectMeta(path.join(dir, e.name)))
    .sort((a, b) => a.name.localeCompare(b.name, "ar"));
}

export function listSections() {
  return loadSectionsStore().sections.map((section) => ({
    ...section,
    subsections: listSubsections(section.slug),
  }));
}

export function findSection(sectionId: string) {
  return loadSectionsStore().sections.find((s) => s.id === sectionId) || null;
}

export function getSectionBySlug(slug: string) {
  return loadSectionsStore().sections.find((s) => s.slug === slug) || null;
}

export function updateSection(
  sectionId: string,
  data: { name?: string; description?: string }
) {
  const store = loadSectionsStore();
  const section = store.sections.find((s) => s.id === sectionId);
  if (!section) throw new Error("Section not found");

  if (data.name !== undefined) {
    const trimmed = data.name.trim();
    if (!trimmed) throw new Error("Section name is required");
    section.name = trimmed;
  }
  if (data.description !== undefined) {
    section.description = data.description.trim();
  }

  saveSectionsStore(store);
  return section;
}

export function readSubsectionMeta(sectionSlug: string, subsectionSlug: string) {
  const dir = subsectionDir(sectionSlug, subsectionSlug);
  if (!fs.existsSync(dir)) throw new Error("Subsection not found");
  return readProjectMeta(dir);
}

export function writeSubsectionMeta(
  sectionSlug: string,
  subsectionSlug: string,
  patch: Record<string, unknown>
) {
  const dir = subsectionDir(sectionSlug, subsectionSlug);
  if (!fs.existsSync(dir)) throw new Error("Subsection not found");

  const metaPath = path.join(dir, "project.json");
  const meta = fs.existsSync(metaPath)
    ? JSON.parse(fs.readFileSync(metaPath, "utf-8"))
    : {};
  Object.assign(meta, patch);
  fs.writeFileSync(metaPath, `${JSON.stringify(meta, null, 2)}\n`, "utf-8");
  return meta;
}

export function getSectionSlugs() {
  return loadSectionsStore().sections.map((s) => s.slug);
}

export function ensureDefaultSections() {
  const store = loadSectionsStore();
  if (store.sections.length) {
    for (const section of store.sections) {
      fs.mkdirSync(path.join(PROJECTS_DIR, section.slug), { recursive: true });
    }
    return store;
  }

  store.sections = DEFAULT_SECTIONS.map((item) => ({
    id: `sec-${randomUUID().slice(0, 8)}`,
    name: item.name,
    slug: item.slug,
  }));
  saveSectionsStore(store);
  for (const section of store.sections) {
    fs.mkdirSync(path.join(PROJECTS_DIR, section.slug), { recursive: true });
  }
  return store;
}

export function createSection(name: string, slug: string) {
  const trimmedName = name.trim();
  const validSlug = validateSlug(slug);
  if (!trimmedName) throw new Error("Section name is required");

  const store = loadSectionsStore();
  if (store.sections.some((s) => s.slug === validSlug)) {
    throw new Error("Section slug already exists");
  }

  const section: Section = {
    id: `sec-${randomUUID().slice(0, 8)}`,
    name: trimmedName,
    slug: validSlug,
  };
  store.sections.push(section);
  saveSectionsStore(store);
  fs.mkdirSync(path.join(PROJECTS_DIR, validSlug), { recursive: true });
  return { ...section, subsections: [] };
}

export function deleteSection(sectionId: string) {
  const store = loadSectionsStore();
  const section = store.sections.find((s) => s.id === sectionId);
  if (!section) throw new Error("Section not found");

  const dir = path.join(PROJECTS_DIR, section.slug);
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });

  store.sections = store.sections.filter((s) => s.id !== sectionId);
  saveSectionsStore(store);
}

export function subsectionDir(sectionSlug: string, subsectionSlug: string) {
  const slug = validateSlug(sectionSlug);
  const sub = validateSlug(subsectionSlug);
  if (!getSectionSlugs().includes(slug)) throw new Error("Invalid section");
  return path.join(PROJECTS_DIR, slug, sub);
}

export function createSubsection(sectionId: string, slug: string, name: string) {
  const section = findSection(sectionId);
  if (!section) throw new Error("Section not found");

  const validSlug = validateSlug(slug);
  const dir = subsectionDir(section.slug, validSlug);
  if (fs.existsSync(dir)) throw new Error("Subsection already exists");

  fs.mkdirSync(dir, { recursive: true });
  const meta = { name: name.trim() || validSlug };
  fs.writeFileSync(
    path.join(dir, "project.json"),
    `${JSON.stringify(meta, null, 2)}\n`,
    "utf-8"
  );
  return { slug: validSlug, ...meta };
}

export function updateSubsection(
  sectionSlug: string,
  subsectionSlug: string,
  data: Partial<Subsection>
) {
  const dir = subsectionDir(sectionSlug, subsectionSlug);
  if (!fs.existsSync(dir)) throw new Error("Subsection not found");

  const metaPath = path.join(dir, "project.json");
  const meta = fs.existsSync(metaPath)
    ? JSON.parse(fs.readFileSync(metaPath, "utf-8"))
    : {};

  if (data.name !== undefined) meta.name = data.name;
  if (data.description !== undefined) meta.description = data.description;
  if (data.locationLink !== undefined) meta.locationLink = data.locationLink;
  if (data.siteEngineer !== undefined) meta.siteEngineer = data.siteEngineer;
  if (data.tags !== undefined) meta.tags = data.tags;
  if (data.thumbnail !== undefined) meta.thumbnail = data.thumbnail;
  if (data.mediaOrder !== undefined) meta.mediaOrder = data.mediaOrder;

  fs.writeFileSync(metaPath, `${JSON.stringify(meta, null, 2)}\n`, "utf-8");
  return readProjectMeta(dir);
}

export function deleteSubsection(sectionSlug: string, subsectionSlug: string) {
  const dir = subsectionDir(sectionSlug, subsectionSlug);
  if (!fs.existsSync(dir)) throw new Error("Subsection not found");
  fs.rmSync(dir, { recursive: true, force: true });
}
