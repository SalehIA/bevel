"use client";

import { useEffect, useRef } from "react";
import ScrollReveal from "./ScrollReveal";
import { CTA_LABEL, LANDING_CONTAINER } from "@/lib/landing/layout";

const HERO_VIDEO = "/assets/herobg.mp4";

export default function HeroSection() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      video.removeAttribute("src");
      return;
    }

    void video.play().catch(() => {});
  }, []);

  return (
    <section
      data-header-theme="onDark"
      className="relative flex min-h-dvh flex-col overflow-hidden bg-brand text-white"
    >
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 h-full w-full object-cover object-left lg:object-center"
          poster="/assets/menubg.png"
        >
          <source src={HERO_VIDEO} type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-brand/55" />
        <div className="absolute inset-0 bg-gradient-to-t from-brand via-brand/20 to-brand/40" />
      </div>

      <div className={`relative z-10 ${LANDING_CONTAINER} mt-auto pb-10 pt-32 lg:pb-12`}>
        <div className="flex flex-col-reverse gap-8 lg:flex-row lg:items-start lg:justify-between lg:gap-10 lg:[direction:ltr]">
          <ScrollReveal delay={120} className="w-full shrink-0 lg:w-1/4">
            <div className="flex flex-col gap-6" dir="rtl">
              <p className="order-1 text-right text-sm leading-relaxed text-white/70 lg:order-2 lg:text-base">
                نصمّم وننفّذ بيئات تعيش معك، وتكبر مع احتياجاتك.
              </p>
              <div className="order-2 flex flex-col gap-3 lg:order-1 lg:flex-row lg:gap-3">
                <a
                  href="#register"
                  className="rounded-none bg-accent px-6 py-3 text-center text-sm font-semibold tracking-wide text-brand-dark transition hover:brightness-110 lg:flex-1"
                >
                  {CTA_LABEL}
                </a>
                <a
                  href="#projects"
                  className="rounded-none border border-white/30 px-6 py-3 text-center text-sm tracking-wide text-white/90 transition hover:border-white hover:bg-white/5 lg:flex-1"
                >
                  استكشف المشاريع
                </a>
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal className="min-w-0 flex-1">
            <h1 className="w-full text-right text-[clamp(1.5rem,3.2vw,2.5rem)] leading-snug font-bold text-white">
              حيث يلتقي التصميم بدقة التنفيذ حيث تتحول الأفكار إلى واقع
            </h1>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
