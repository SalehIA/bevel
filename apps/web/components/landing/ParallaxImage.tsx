"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef } from "react";

const MIN_OFFSET_PERCENT = -25;
const MAX_OFFSET_PERCENT = 25;
const MIN_SCALE = 1.05;
const MAX_SCALE = 1.1;

type Props = {
  src: string;
  alt: string;
  width: number;
  height: number;
  priority?: boolean;
  /** Element whose scroll position drives the parallax (usually the parent section). */
  scopeRef: React.RefObject<HTMLElement | null>;
};

export default function ParallaxImage({
  src,
  alt,
  width,
  height,
  priority,
  scopeRef,
}: Props) {
  const innerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef(0);
  const reduceMotionRef = useRef(false);

  const applyTransform = useCallback(() => {
    const section = scopeRef.current;
    const inner = innerRef.current;
    if (!section || !inner) return;

    if (reduceMotionRef.current) {
      inner.style.transform = `translate3d(0, ${MIN_OFFSET_PERCENT}%, 0) scale(${MIN_SCALE})`;
      return;
    }

    const rect = section.getBoundingClientRect();
    const viewport = window.innerHeight;
    const progress = Math.max(0, Math.min(1, (viewport - rect.top) / (viewport + rect.height)));
    const translate =
      MIN_OFFSET_PERCENT + progress * (MAX_OFFSET_PERCENT - MIN_OFFSET_PERCENT);
    const scale = MIN_SCALE + progress * (MAX_SCALE - MIN_SCALE);

    inner.style.transform = `translate3d(0, ${translate}%, 0) scale(${scale})`;
  }, [scopeRef]);

  const scheduleUpdate = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(applyTransform);
  }, [applyTransform]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    reduceMotionRef.current = mq.matches;
    const onMotionChange = () => {
      reduceMotionRef.current = mq.matches;
      scheduleUpdate();
    };
    mq.addEventListener("change", onMotionChange);

    scheduleUpdate();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);

    const section = scopeRef.current;
    const ro = section ? new ResizeObserver(scheduleUpdate) : null;
    if (section && ro) ro.observe(section);

    return () => {
      mq.removeEventListener("change", onMotionChange);
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      if (section && ro) ro.unobserve(section);
      cancelAnimationFrame(rafRef.current);
    };
  }, [scheduleUpdate, scopeRef]);

  return (
    <div className="relative h-full w-full overflow-hidden" aria-hidden>
      <div
        ref={innerRef}
        className="relative h-full w-full will-change-transform"
        style={{
          transform: `translate3d(0, ${MIN_OFFSET_PERCENT}%, 0) scale(${MIN_SCALE})`,
        }}
      >
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          priority={priority}
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="h-full w-full object-cover"
        />
      </div>
    </div>
  );
}
