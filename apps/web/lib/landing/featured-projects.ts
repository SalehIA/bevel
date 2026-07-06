import { buildMediaPath } from "@/lib/media";
import { readManifest } from "@/lib/manifest";
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

export function getFeaturedProjects(limit = 4): FeaturedProjectItem[] {
  const manifest = readManifest();
  const candidates: { category: string; project: ProjectMedia }[] = [];

  for (const [category, projects] of Object.entries(manifest.categories)) {
    for (const project of projects) {
      if (project.photos.length > 0 || project.thumbnail) {
        candidates.push({ category, project });
      }
    }
  }

  const sorted = candidates.sort(
    (a, b) => b.project.photos.length - a.project.photos.length
  );

  const picked = sorted.slice(0, limit);

  return picked.map(({ category, project }, i) => {
    const photoFiles =
      project.photos.length > 0
        ? project.photos.slice(0, 10)
        : project.thumbnail
          ? [project.thumbnail]
          : [];

    return {
      category,
      slug: project.slug,
      name: project.name,
      description: project.description,
      locationLink: project.locationLink,
      thumbnail: project.thumbnail
        ? buildMediaPath(category, project.slug, project.thumbnail)
        : photoFiles[0] || null,
      photos: photoFiles.map((file) =>
        buildMediaPath(category, project.slug, file)
      ),
      index: i + 1,
      total: picked.length,
    };
  });
}
