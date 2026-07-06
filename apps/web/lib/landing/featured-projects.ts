import { buildMediaPath } from "@/lib/media";
import { readManifest } from "@/lib/manifest";
import { LANDING_PAGE_ID } from "@/lib/site-pages";
import type { ProjectMedia } from "@/lib/types";

export type FeaturedProjectItem = {
  category: string;
  slug: string;
  name: string;
  description?: string;
  locationLink?: string;
  thumbnail: string | null;
  photos: string[];
  index: number;
  total: number;
};

function landingPhotoFiles(project: ProjectMedia): string[] {
  const curated = project.photosByPage?.[LANDING_PAGE_ID];
  if (curated?.length) {
    return curated.filter((file) => project.photos.includes(file));
  }
  if (project.photos.length > 0) return project.photos.slice(0, 10);
  return project.thumbnail ? [project.thumbnail] : [];
}

function toFeaturedItem(
  category: string,
  project: ProjectMedia,
  index: number,
  total: number
): FeaturedProjectItem {
  const photoFiles = landingPhotoFiles(project);

  return {
    category,
    slug: project.slug,
    name: project.name,
    description: project.description,
    locationLink: project.locationLink,
    thumbnail: project.thumbnail
      ? buildMediaPath(category, project.slug, project.thumbnail)
      : photoFiles[0]
        ? buildMediaPath(category, project.slug, photoFiles[0])
        : null,
    photos: photoFiles.map((file) => buildMediaPath(category, project.slug, file)),
    index,
    total,
  };
}

function pickLandingProjects(limit: number) {
  const manifest = readManifest();
  const curated: { category: string; project: ProjectMedia; order: number }[] = [];

  for (const [category, projects] of Object.entries(manifest.categories)) {
    for (const project of projects) {
      if (!project.visibleOnPages?.includes(LANDING_PAGE_ID)) continue;
      const photoFiles = landingPhotoFiles(project);
      if (!photoFiles.length) continue;

      curated.push({
        category,
        project,
        order: project.pageOrder?.[LANDING_PAGE_ID] ?? 999,
      });
    }
  }

  if (curated.length) {
    curated.sort(
      (a, b) =>
        a.order - b.order || a.project.name.localeCompare(b.project.name, "ar")
    );
    return curated.slice(0, limit);
  }

  const fallback: { category: string; project: ProjectMedia }[] = [];
  for (const [category, projects] of Object.entries(manifest.categories)) {
    for (const project of projects) {
      if (project.photos.length > 0 || project.thumbnail) {
        fallback.push({ category, project });
      }
    }
  }

  fallback.sort((a, b) => b.project.photos.length - a.project.photos.length);
  return fallback.slice(0, limit).map(({ category, project }) => ({
    category,
    project,
    order: 999,
  }));
}

export function getFeaturedProjects(limit = 4): FeaturedProjectItem[] {
  const picked = pickLandingProjects(limit);
  return picked.map(({ category, project }, i) =>
    toFeaturedItem(category, project, i + 1, picked.length)
  );
}
