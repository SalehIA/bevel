"use client";

import { useMemo, useState } from "react";
import { buildMediaPath } from "@/lib/media";

type Tab = "photos" | "videos";

type Props = {
  category: string;
  slug: string;
  name: string;
  photos: string[];
  videos: string[];
};

export default function ProjectMediaTabs({ category, slug, name, photos, videos }: Props) {
  const defaultTab: Tab = photos.length ? "photos" : "videos";
  const [tab, setTab] = useState<Tab>(defaultTab);

  const showTabs = photos.length > 0 && videos.length > 0;

  const items = useMemo(() => (tab === "photos" ? photos : videos), [tab, photos, videos]);

  if (!photos.length && !videos.length) {
    return (
      <p className="rounded-2xl border border-dashed border-white/15 px-4 py-8 text-center text-sm text-white/60">
        لا توجد صور أو فيديو
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {showTabs ? (
        <div className="flex gap-2 rounded-xl border border-white/10 bg-white/5 p-1">
          <button
            type="button"
            onClick={() => setTab("photos")}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition ${
              tab === "photos" ? "bg-accent text-brand-dark" : "text-white/80 hover:bg-white/5"
            }`}
          >
            صور ({photos.length})
          </button>
          <button
            type="button"
            onClick={() => setTab("videos")}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition ${
              tab === "videos" ? "bg-accent text-brand-dark" : "text-white/80 hover:bg-white/5"
            }`}
          >
            فيديو ({videos.length})
          </button>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        {tab === "photos"
          ? items.map((photo) => (
              <img
                key={photo}
                src={buildMediaPath(category, slug, photo)}
                alt={name}
                className="w-full rounded-xl object-cover"
              />
            ))
          : items.map((video) => (
              <video
                key={video}
                controls
                playsInline
                className="w-full rounded-xl object-cover"
                src={buildMediaPath(category, slug, video)}
              />
            ))}
      </div>
    </div>
  );
}
