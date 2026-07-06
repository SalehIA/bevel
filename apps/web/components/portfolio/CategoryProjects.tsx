"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { buildMediaPath } from "@/lib/media";
import type { ProjectMedia } from "@/lib/types";

type Props = {
  category: string;
  projects: ProjectMedia[];
};

export default function CategoryProjects({ category, projects }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTag = searchParams.get("tag") || "";

  const allTags = [...new Set(projects.flatMap((p) => p.tags || []))].sort((a, b) =>
    a.localeCompare(b, "ar")
  );

  const visible = activeTag
    ? projects.filter((p) => p.tags?.includes(activeTag))
    : projects;

  const setTag = (tag: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (tag) params.set("tag", tag);
    else params.delete("tag");
    const query = params.toString();
    router.push(
      `/portfolio/${encodeURIComponent(category)}${query ? `?${query}` : ""}`,
      { scroll: false }
    );
  };

  return (
    <>
      {allTags.length > 0 ? (
        <div className="mb-6 -mx-5 overflow-x-auto px-5">
          <div className="flex w-max min-w-full gap-2 pb-1">
            <button
              type="button"
              onClick={() => setTag(null)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm transition ${
                !activeTag ? "bg-accent text-brand-dark" : "bg-white/10 text-white hover:bg-white/15"
              }`}
            >
              الكل
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setTag(tag)}
                className={`shrink-0 rounded-full px-4 py-2 text-sm transition ${
                  activeTag === tag ? "bg-accent text-brand-dark" : "bg-white/10 text-white hover:bg-white/15"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {visible.length === 0 ? (
        <p className="rounded-2xl border border-white/10 bg-white/5 px-5 py-8 text-center text-white/70">
          لا توجد مشاريع{activeTag ? ` لهذا الوسم` : ""}.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {visible.map((project) => (
            <Link
              key={project.slug}
              href={`/portfolio/${encodeURIComponent(category)}/${encodeURIComponent(project.slug)}`}
              className="overflow-hidden rounded-2xl border border-white/10 bg-white/5"
            >
              {project.thumbnail ? (
                <img
                  src={buildMediaPath(category, project.slug, project.thumbnail)}
                  alt={project.name}
                  className="aspect-[4/3] w-full object-cover"
                />
              ) : (
                <div className="flex aspect-[4/3] items-center justify-center bg-white/5 text-white/50">
                  بدون صورة
                </div>
              )}
              <div className="p-4">
                <h2 className="font-semibold">{project.name}</h2>
                {project.tags?.length ? (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {project.tags.map((tag) => (
                      <span key={tag} className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/80">
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
