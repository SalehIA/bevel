"use client";

import Image from "next/image";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  LOGO_INTRINSIC_HEIGHT,
  LOGO_INTRINSIC_WIDTH,
  LOGO_SRC,
  LOGO_SRC_ON_LIGHT,
} from "@/lib/branding";

type Range = { top: number; bottom: number };
type Theme = "dark" | "light";

const STRIP_COUNT = 40;

function rangesFromStrips(strips: Theme[]): { dark: Range[]; light: Range[] } {
  const dark: Range[] = [];
  const light: Range[] = [];
  if (!strips.length) return { dark: [{ top: 0, bottom: 100 }], light: [] };

  let runStart = 0;
  let runTheme = strips[0];

  const flush = (end: number) => {
    if (end <= runStart) return;
    const top = (runStart / strips.length) * 100;
    const bottom = (end / strips.length) * 100;
    const range = { top, bottom };
    if (runTheme === "light") light.push(range);
    else dark.push(range);
  };

  for (let i = 1; i <= strips.length; i++) {
    if (i === strips.length || strips[i] !== runTheme) {
      flush(i);
      runStart = i;
      runTheme = strips[i];
    }
  }

  return {
    dark: dark.length ? dark : [{ top: 0, bottom: 100 }],
    light,
  };
}

function themeAtPoint(x: number, y: number): Theme {
  let best: { area: number; theme: Theme } | null = null;

  for (const section of document.querySelectorAll<HTMLElement>("[data-header-theme]")) {
    const rect = section.getBoundingClientRect();
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) continue;

    const area = rect.width * rect.height;
    const theme: Theme = section.dataset.headerTheme === "onLight" ? "light" : "dark";

    if (!best || area < best.area) {
      best = { area, theme };
    }
  }

  return best?.theme ?? "dark";
}

function computeThemeRanges(logoRect: DOMRect): { dark: Range[]; light: Range[] } {
  if (logoRect.height < 1 || logoRect.width < 1) {
    return { dark: [{ top: 0, bottom: 100 }], light: [] };
  }

  const cx = logoRect.left + logoRect.width / 2;
  const strips: Theme[] = [];

  for (let i = 0; i < STRIP_COUNT; i++) {
    const y = logoRect.top + ((i + 0.5) / STRIP_COUNT) * logoRect.height;
    strips.push(themeAtPoint(cx, y));
  }

  return rangesFromStrips(strips);
}

function rangesEqual(a: Range[], b: Range[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((r, i) => r.top === b[i].top && r.bottom === b[i].bottom);
}

type Props = {
  priority?: boolean;
};

export default function AdaptiveBevelLogo({ priority }: Props) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const rafRef = useRef<number>(0);
  const id = useId().replace(/:/g, "");
  const darkClipId = `bevel-dark-${id}`;
  const lightClipId = `bevel-light-${id}`;
  const [darkRanges, setDarkRanges] = useState<Range[]>([{ top: 0, bottom: 100 }]);
  const [lightRanges, setLightRanges] = useState<Range[]>([]);

  const update = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const logoRect = el.getBoundingClientRect();
    if (logoRect.height < 1) return;

    const { dark, light } = computeThemeRanges(logoRect);

    setDarkRanges((prev) => (rangesEqual(prev, dark) ? prev : dark));
    setLightRanges((prev) => (rangesEqual(prev, light) ? prev : light));
  }, []);

  const scheduleUpdate = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(update);
  }, [update]);

  useEffect(() => {
    scheduleUpdate();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    return () => {
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      cancelAnimationFrame(rafRef.current);
    };
  }, [scheduleUpdate]);

  return (
    <span
      ref={containerRef}
      className="relative inline-block w-[70px] shrink-0 mix-blend-difference lg:w-[90px]"
      style={{ aspectRatio: `${LOGO_INTRINSIC_WIDTH} / ${LOGO_INTRINSIC_HEIGHT}` }}
    >
      <svg aria-hidden className="absolute h-0 w-0 overflow-hidden" focusable="false">
        <defs>
          <clipPath id={darkClipId} clipPathUnits="objectBoundingBox">
            {darkRanges.map((r, i) => (
              <rect
                key={`d${i}`}
                x="0"
                y={r.top / 100}
                width="1"
                height={(r.bottom - r.top) / 100}
              />
            ))}
          </clipPath>
          <clipPath id={lightClipId} clipPathUnits="objectBoundingBox">
            {lightRanges.length === 0 ? (
              <rect x="0" y="0" width="1" height="0" />
            ) : (
              lightRanges.map((r, i) => (
                <rect
                  key={`l${i}`}
                  x="0"
                  y={r.top / 100}
                  width="1"
                  height={(r.bottom - r.top) / 100}
                />
              ))
            )}
          </clipPath>
        </defs>
      </svg>

      {/* Red + white — strips over dark / green sections */}
      <Image
        src={LOGO_SRC}
        alt="Bevel"
        fill
        sizes="(min-width: 1024px) 90px, 70px"
        priority={priority}
        className="object-contain"
        style={{ clipPath: `url(#${darkClipId})` }}
      />

      {/* Red + black — strips over bright sections */}
      <Image
        src={LOGO_SRC_ON_LIGHT}
        alt=""
        aria-hidden
        fill
        sizes="(min-width: 1024px) 90px, 70px"
        priority={priority}
        className="object-contain"
        style={{ clipPath: `url(#${lightClipId})` }}
      />
    </span>
  );
}
