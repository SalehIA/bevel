"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { FeaturedProjectItem } from "@/lib/landing/featured-projects";

function easeOutCubic(t: number) {
  return 1 - (1 - t) ** 3;
}

/** Slow at the start, then returns to normal scroll-driven speed. */
function easeSlowStart(t: number) {
  const split = 0.32;
  if (t < split) {
    return (t / split) ** 2 * 0.18;
  }
  const u = (t - split) / (1 - split);
  return 0.18 + easeOutCubic(u) * 0.82;
}

type BlockProps = {
  project: FeaturedProjectItem;
  reversed: boolean;
};

function ProjectScrollBlock({ project, reversed }: BlockProps) {
  const articleRef = useRef<HTMLElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const introRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<HTMLDivElement>(null);
  const linkRef = useRef<HTMLDivElement>(null);
  const photoRefs = useRef<(HTMLDivElement | null)[]>([]);
  const rafRef = useRef(0);

  const photos = project.photos.length ? project.photos : project.thumbnail ? [project.thumbnail] : [];
  const photoCount = Math.max(photos.length, 1);
  const totalVh = 1.2 + photoCount * 0.55;

  const [mediaPhoto, setMediaPhoto] = useState<string | null>(photos[0] ?? null);
  const projectHref = `/portfolio/${encodeURIComponent(project.category)}/${encodeURIComponent(project.slug)}`;

  const update = useCallback(() => {
    if (!window.matchMedia("(min-width: 1024px)").matches) return;

    const article = articleRef.current;
    const pinEl = pinRef.current;
    const titleEl = titleRef.current;
    const introEl = introRef.current;
    const streamEl = streamRef.current;
    const linkEl = linkRef.current;
    if (!article || !titleEl || !introEl || !streamEl || !linkEl) return;

    const vh = window.innerHeight;
    const rect = article.getBoundingClientRect();
    const scrolled = Math.max(0, -rect.top);
    const panelEl = streamEl.parentElement;
    if (!panelEl) return;

    // Same gap as title → description (intro padding-top)
    const introPaddingTop = parseFloat(getComputedStyle(introEl).paddingTop);
    const titleBottom = titleEl.offsetTop + titleEl.offsetHeight;
    const descTop = introEl.offsetTop + introPaddingTop;
    const blockGap = Math.max(0, descTop - titleBottom);
    const descBottom = introEl.offsetTop + introEl.offsetHeight;

    // Stack photos with uniform gaps — no overlap
    let cursorTop = descBottom + blockGap;
    const photoCenters: number[] = [];

    photos.forEach((_, i) => {
      const el = photoRefs.current[i];
      if (!el) return;

      el.style.top = `${cursorTop}px`;
      const height = el.offsetHeight;
      photoCenters.push(cursorTop + height * 0.5);
      cursorTop += height + blockGap;
    });

    // Extra space before link so the last photo clears above the title when link sticks
    const titleHeight = titleEl.offsetHeight;
    const lastPhotoHeight = photoRefs.current[photos.length - 1]?.offsetHeight ?? 0;
    const linkLeadGap = titleHeight + blockGap * 2 + lastPhotoHeight * 0.45;

    linkEl.style.top = `${cursorTop + linkLeadGap}px`;
    const linkTopStream = cursorTop + linkLeadGap;

    const linkStickTop = titleBottom + blockGap;
    const scrollToStick = Math.max(0, linkTopStream - linkStickTop);
    const linkHoldPx = Math.max(vh * 0.24, blockGap * 3);
    const totalScrollPx = scrollToStick + linkHoldPx;
    article.style.height = `${totalScrollPx + vh}px`;

    // Fixed viewport pin (sticky breaks when ancestors use overflow-x: hidden)
    if (pinEl) {
      if (rect.top > 0) {
        pinEl.style.position = "relative";
        pinEl.style.top = "";
        pinEl.style.bottom = "";
        pinEl.style.left = "";
        pinEl.style.right = "";
        pinEl.style.width = "";
        pinEl.style.zIndex = "";
      } else if (rect.bottom > vh) {
        pinEl.style.position = "fixed";
        pinEl.style.top = "0";
        pinEl.style.left = "0";
        pinEl.style.right = "0";
        pinEl.style.width = "100%";
        pinEl.style.zIndex = "10";
      } else {
        pinEl.style.position = "absolute";
        pinEl.style.top = "auto";
        pinEl.style.bottom = "0";
        pinEl.style.left = "0";
        pinEl.style.right = "0";
        pinEl.style.width = "100%";
        pinEl.style.zIndex = "";
      }
    }

    const introScrollPx = Math.max(vh * 0.32, blockGap * 5);
    const introT = Math.min(1, scrolled / introScrollPx);
    const introEase = easeSlowStart(introT);

    // Title stays centered — only enable inversion as content scrolls
    const linkStuck = scrolled >= scrollToStick && scrolled < scrollToStick + linkHoldPx;
    titleEl.style.mixBlendMode = introT > 0.08 || linkStuck ? "difference" : "normal";

    // Intro (description) scrolls up and fades — slow start
    introEl.style.opacity = String(Math.max(0, 1 - introEase * 1.15));
    introEl.style.transform = `translate3d(0, ${-introEase * vh * 0.38}px, 0)`;
    introEl.style.pointerEvents = introT > 0.9 ? "none" : "auto";

    // Stream moves until link reaches its slot under the title, then holds
    const streamScroll = Math.min(scrolled, scrollToStick);
    const streamY = -streamScroll;
    streamEl.style.transform = `translate3d(0, ${streamY}px, 0)`;

    const linkApproach =
      scrollToStick > 0
        ? Math.min(1, Math.max(0, (scrolled - scrollToStick * 0.82) / (scrollToStick * 0.18 + 1)))
        : 1;
    linkEl.style.opacity = linkStuck ? "1" : String(0.35 + linkApproach * 0.65);
    linkEl.style.pointerEvents = linkApproach > 0.55 || linkStuck ? "auto" : "none";
    linkEl.style.zIndex = linkStuck ? "25" : "";

    let nearestPhoto = 0;
    let nearestDist = Infinity;

    const photoMetrics = photos.map((_, i) => {
      const el = photoRefs.current[i];
      if (!el) return null;

      const elCenter = streamY + photoCenters[i];
      const panelCenter = vh * 0.5;
      const dist = Math.abs(elCenter - panelCenter);
      const neighborGap =
        i < photos.length - 1
          ? photoCenters[i + 1] - photoCenters[i]
          : el.offsetHeight + blockGap;

      return { el, i, dist, neighborGap };
    });

    photoMetrics.forEach((m) => {
      if (!m) return;
      if (m.dist < nearestDist) {
        nearestDist = m.dist;
        nearestPhoto = m.i;
      }
    });

    photoMetrics.forEach((m) => {
      if (!m) return;
      const { el, i, dist, neighborGap } = m;
      const scaleWindow = neighborGap * 0.55;
      const t = Math.max(0, 1 - dist / scaleWindow);
      const scale = 0.58 + t * 0.42;
      const opacity = i === nearestPhoto ? 0.3 + t * 0.7 : 0.08 + t * 0.12;
      const inner = el.firstElementChild as HTMLElement | null;
      if (inner) {
        inner.style.transform = `scale(${scale})`;
        inner.style.opacity = String(opacity);
      }
    });

    const nextPhoto =
      linkStuck || scrolled >= scrollToStick
        ? (photos[photos.length - 1] ?? photos[0] ?? null)
        : (photos[nearestPhoto] ?? photos[0] ?? null);
    setMediaPhoto((prev) => (prev === nextPhoto ? prev : nextPhoto));
  }, [photos]);

  const scheduleUpdate = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(update);
  }, [update]);

  useEffect(() => {
    scheduleUpdate();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    const article = articleRef.current;
    const ro = article ? new ResizeObserver(scheduleUpdate) : null;
    if (article && ro) ro.observe(article);

    return () => {
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      if (article && ro) ro.unobserve(article);
      cancelAnimationFrame(rafRef.current);
    };
  }, [scheduleUpdate]);

  const firstPhoto = photos[0];

  const mediaColumn = (
    <div className="relative h-full bg-brand-dark">
      {mediaPhoto ? (
        <Image
          key={mediaPhoto}
          src={mediaPhoto}
          alt={project.name}
          fill
          className="object-cover transition-opacity duration-700"
          sizes="50vw"
          priority={project.index === 1}
        />
      ) : null}
      <div
        className={`absolute inset-0 ${
          reversed ? "bg-gradient-to-r from-brand/30" : "bg-gradient-to-l from-brand/30"
        }`}
      />
    </div>
  );

  return (
    <>
      {/* Mobile */}
      <article className="border-t border-white/10 lg:hidden">
        {firstPhoto && (
          <div className="relative aspect-[4/3] w-full bg-brand-dark">
            <Image src={firstPhoto} alt={project.name} fill className="object-cover" sizes="100vw" />
          </div>
        )}
        <div className="space-y-6 px-6 py-10">
          <h3 className="text-2xl leading-tight font-bold">{project.name}</h3>
          {project.description ? (
            <p className="text-sm leading-relaxed text-white/75">{project.description}</p>
          ) : null}
          {photos.slice(1).map((photo, i) => (
            <div key={photo} className="relative aspect-[4/3] w-full">
              <Image src={photo} alt={`${project.name} — ${i + 2}`} fill className="object-cover" sizes="100vw" />
            </div>
          ))}
          <Link href={projectHref} className="inline-block text-sm text-accent">
            المزيد عن المشروع ←
          </Link>
        </div>
      </article>

      {/* Desktop — tall article + fixed viewport pin while scrolling */}
      <article
        ref={articleRef}
        className="relative hidden border-t border-white/10 lg:block"
        style={{ height: `${totalVh * 100}vh` }}
      >
        <div ref={pinRef} className="h-dvh w-full">
          <div className={`grid h-dvh grid-cols-2 ${reversed ? "[direction:ltr]" : ""}`}>
            {/* Content panel */}
            <div className="relative col-start-1 isolate h-dvh bg-brand">
              {/* Title — fixed center horizontal + vertical */}
              <h3
                ref={titleRef}
                className="pointer-events-none absolute top-1/2 left-1/2 z-30 max-w-md -translate-x-1/2 -translate-y-1/2 px-8 text-center text-3xl leading-tight font-bold text-white lg:text-4xl xl:text-5xl"
              >
                {project.name}
              </h3>

              {/* Description below centered title */}
              <div
                ref={introRef}
                className="absolute inset-x-0 top-1/2 z-10 flex flex-col items-center px-5 pt-[6.5rem] xl:px-7 xl:pt-[8rem]"
              >
                {project.description ? (
                  <p className="max-w-md text-center text-base leading-relaxed text-white/80">
                    {project.description}
                  </p>
                ) : null}
              </div>

              {/* Photo stream passes under centered title */}
              <div
                ref={streamRef}
                className="absolute inset-0 z-20 will-change-transform"
                aria-hidden={false}
              >
                {photos.map((photo, i) => (
                  <div
                    key={photo}
                    ref={(el) => {
                      photoRefs.current[i] = el;
                    }}
                    className="absolute inset-x-0 flex justify-center px-5 xl:px-7"
                  >
                    <div
                      className="relative aspect-[4/3] w-full max-w-xl origin-center will-change-transform"
                      style={{ transform: "scale(0.58)", opacity: 0.3 }}
                    >
                      <Image
                        src={photo}
                        alt={`${project.name} — ${i + 1}`}
                        fill
                        className="object-cover"
                        sizes="400px"
                      />
                    </div>
                  </div>
                ))}

                <div
                  ref={linkRef}
                  data-project-link
                  className="absolute inset-x-0 flex justify-center px-5 xl:px-7"
                >
                  <Link href={projectHref} className="text-sm text-accent transition hover:text-white">
                    المزيد عن المشروع ←
                  </Link>
                </div>
              </div>
            </div>

            <div className="relative col-start-2 h-dvh">{mediaColumn}</div>
          </div>
        </div>
      </article>
    </>
  );
}

type Props = {
  projects: FeaturedProjectItem[];
};

export default function ProjectShowcase({ projects }: Props) {
  if (projects.length === 0) {
    return (
      <section id="projects" data-header-theme="onDark" className="bg-brand px-5 py-24 text-white">
        <p className="text-center text-white/60">لا توجد مشاريع معروضة حالياً.</p>
      </section>
    );
  }

  return (
    <section id="projects" data-header-theme="onDark" className="bg-brand text-white">
      {projects.map((project, i) => (
        <ProjectScrollBlock
          key={`${project.category}-${project.slug}`}
          project={project}
          reversed={i % 2 === 1}
        />
      ))}

      <div className="flex justify-center px-4 py-16 sm:px-6 lg:px-10">
        <Link
          href="/portfolio"
          className="group inline-flex items-center gap-3 border border-white/30 px-8 py-3 text-sm tracking-widest uppercase transition hover:border-accent hover:bg-white/5"
        >
          عرض كل المشاريع
          <span className="transition-transform group-hover:-translate-x-1">←</span>
        </Link>
      </div>
    </section>
  );
}
