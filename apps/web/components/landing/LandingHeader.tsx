"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import AdaptiveBevelLogo from "./AdaptiveBevelLogo";
import BevelLogo from "./BevelLogo";
import { CTA_LABEL, LANDING_CONTAINER, NAV_LINKS } from "@/lib/landing/layout";

const MENU_BG = "/assets/menubg.png";
const MENU_ROWS = 5;
const ROW_STAGGER_MS = 120;
const ROW_SHADOW_LAG_MS = 50;
const ROW_SLIDE_MS = 620;
const LINKS_DELAY_MS = ROW_STAGGER_MS * (MENU_ROWS - 1) + ROW_SLIDE_MS + ROW_SHADOW_LAG_MS + 30;
const LINK_STAGGER_MS = 70;
const CLOSE_MS = ROW_STAGGER_MS * (MENU_ROWS - 1) + ROW_SLIDE_MS + ROW_SHADOW_LAG_MS + 80;

type HeaderTheme = "onDark" | "onLight";

function MenuIcon({ open, theme }: { open: boolean; theme: HeaderTheme }) {
  const stroke = theme === "onDark" ? "stroke-white" : "stroke-brand";
  return (
    <svg
      className={`h-5 w-5 ${stroke}`}
      viewBox="0 0 24 24"
      fill="none"
      strokeWidth="1.5"
      aria-hidden
    >
      {open ? (
        <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
      ) : (
        <>
          <path strokeLinecap="round" d="M4 7h16" />
          <path strokeLinecap="round" d="M4 12h16" />
          <path strokeLinecap="round" d="M4 17h16" />
        </>
      )}
    </svg>
  );
}

function MenuRowBg({ index }: { index: number }) {
  return (
    <div className="absolute inset-0 flex [direction:ltr]">
      <div className="h-full w-full bg-brand lg:w-1/4" />
      <div className="relative hidden h-full overflow-hidden lg:block lg:w-3/4">
        <div className="absolute inset-x-0" style={{ height: "500%", top: `${-index * 100}%` }}>
          <Image src={MENU_BG} alt="" fill className="object-cover" sizes="75vw" priority />
        </div>
      </div>
    </div>
  );
}

function MenuRows({ open }: { open: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex h-dvh flex-col" aria-hidden>
      {Array.from({ length: MENU_ROWS }, (_, i) => {
        const rowDelay = open ? i * ROW_STAGGER_MS : (MENU_ROWS - 1 - i) * ROW_STAGGER_MS;
        const accentDelay = open ? rowDelay : rowDelay + ROW_SHADOW_LAG_MS;
        const contentDelay = open ? rowDelay + ROW_SHADOW_LAG_MS : rowDelay;

        return (
          <div key={i} className="relative min-h-0 flex-1 overflow-hidden">
            <div
              className={`menu-row-accent-lead ${open ? "is-in" : ""}`}
              style={{ transitionDelay: `${accentDelay}ms` }}
            />
            <div
              className={`menu-row-content-follow ${open ? "is-in" : ""}`}
              style={{ transitionDelay: `${contentDelay}ms` }}
            >
              <MenuRowBg index={i} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function LandingHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuMounted, setMenuMounted] = useState(false);
  const [linksVisible, setLinksVisible] = useState(false);
  const [theme, setTheme] = useState<HeaderTheme>("onDark");

  useEffect(() => {
    const sections = document.querySelectorAll<HTMLElement>("[data-header-theme]");
    if (!sections.length) return;

    const pickTheme = () => {
      const probeY = 72;
      let active: HeaderTheme = "onDark";
      for (const section of sections) {
        const rect = section.getBoundingClientRect();
        if (rect.top <= probeY && rect.bottom > probeY) {
          active = (section.dataset.headerTheme as HeaderTheme) || "onDark";
          break;
        }
      }
      setTheme(active);
    };

    pickTheme();
    window.addEventListener("scroll", pickTheme, { passive: true });
    window.addEventListener("resize", pickTheme);
    return () => {
      window.removeEventListener("scroll", pickTheme);
      window.removeEventListener("resize", pickTheme);
    };
  }, []);

  useEffect(() => {
    if (!menuMounted) return;

    const scrollY = window.scrollY;
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      document.body.style.overflow = "";
      window.scrollTo(0, scrollY);
    };
  }, [menuMounted]);

  useEffect(() => {
    if (!menuOpen) {
      setLinksVisible(false);
      return;
    }

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const delay = reduced ? 0 : LINKS_DELAY_MS;
    const timer = window.setTimeout(() => setLinksVisible(true), delay);
    return () => window.clearTimeout(timer);
  }, [menuOpen]);

  const closeMenu = useCallback(() => {
    setLinksVisible(false);
    setMenuOpen(false);
    window.setTimeout(() => setMenuMounted(false), CLOSE_MS);
  }, []);

  const toggleMenu = useCallback(() => {
    if (menuOpen) {
      closeMenu();
      return;
    }

    setMenuMounted(true);
    setMenuOpen(false);
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => setMenuOpen(true));
    });
  }, [menuOpen, closeMenu]);

  const onDark = theme === "onDark";
  const menuControlsTheme: HeaderTheme = menuOpen ? "onDark" : theme;
  const btnClass = onDark
    ? "border-white/40 text-white hover:border-white hover:bg-white hover:text-brand"
    : "border-brand/40 text-brand hover:border-brand hover:bg-brand hover:text-white";
  const iconBtnClass =
    menuControlsTheme === "onDark"
      ? "border-white/40 text-white hover:border-white"
      : "border-brand/40 text-brand hover:border-brand";

  const showLinks = menuOpen && linksVisible;

  return (
    <>
      <header
        className={`pointer-events-none fixed inset-x-0 top-0 bg-transparent ${menuOpen ? "z-[70]" : "z-50"}`}
      >
        <div
          className={`${LANDING_CONTAINER} pointer-events-auto flex items-start justify-between gap-3 pt-4 pb-3 lg:items-center lg:py-5`}
        >
          <Link href="/" className={`relative z-10 shrink-0 leading-none ${menuOpen ? "invisible" : ""}`}>
            <AdaptiveBevelLogo priority />
          </Link>

          <div className="relative z-10 flex shrink-0 items-start gap-3">
            <a
              href="#register"
              className={`hidden h-9 items-center justify-center border px-4 text-[10px] tracking-[0.12em] uppercase transition sm:inline-flex md:text-xs lg:h-10 ${btnClass} ${menuOpen ? "!hidden" : ""}`}
            >
              {CTA_LABEL}
            </a>

            <button
              type="button"
              aria-label={menuOpen ? "إغلاق القائمة" : "فتح القائمة"}
              aria-expanded={menuOpen}
              onClick={toggleMenu}
              className={`flex h-9 w-9 shrink-0 items-center justify-center border transition lg:h-10 lg:w-10 ${iconBtnClass}`}
            >
              <MenuIcon open={menuOpen} theme={menuControlsTheme} />
            </button>
          </div>
        </div>
      </header>

      {menuMounted ? (
        <div className="fixed inset-0 z-[60] overflow-hidden" aria-hidden={!menuOpen && !menuMounted}>
          <MenuRows open={menuOpen} />

          <div className="relative z-20 flex h-dvh flex-col overflow-hidden lg:grid lg:grid-cols-[1fr_3fr] lg:[direction:ltr]">
            <div className="flex min-h-0 flex-1 flex-col bg-transparent" dir="rtl">
              <div
                className={`${LANDING_CONTAINER} flex shrink-0 items-center justify-between pt-4 pb-3 lg:hidden ${showLinks ? "opacity-100" : "opacity-0"}`}
              >
                <BevelLogo variant="onDark" blend={false} />
              </div>

              <div
                className={`${LANDING_CONTAINER} mt-auto flex min-h-0 w-full flex-col lg:max-w-none lg:pb-10 ${showLinks ? "pointer-events-auto" : "pointer-events-none invisible"}`}
              >
                <nav className="min-h-0 overflow-y-auto overscroll-contain">
                  <ul className="flex flex-col">
                    {NAV_LINKS.map((link, i) => {
                      const isRoute = link.href.startsWith("/");
                      const linkClass =
                        "block py-4 text-lg font-semibold text-white transition hover:text-accent sm:py-5 sm:text-xl md:text-2xl lg:py-3 lg:text-lg xl:text-xl";

                      return (
                        <li key={link.href} className="overflow-hidden">
                          <div
                            className={`menu-link-reveal ${i > 0 ? "border-t border-white/10" : ""} ${showLinks ? "is-visible" : ""}`}
                            style={{
                              transitionDelay: showLinks ? `${i * LINK_STAGGER_MS}ms` : "0ms",
                            }}
                          >
                            {isRoute ? (
                              <Link href={link.href} className={linkClass} onClick={closeMenu}>
                                {link.label}
                              </Link>
                            ) : (
                              <a href={link.href} className={linkClass} onClick={closeMenu}>
                                {link.label}
                              </a>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </nav>

                <div className="shrink-0 overflow-hidden">
                  <div
                    className={`menu-link-reveal pb-6 pt-6 ${showLinks ? "is-visible" : ""}`}
                    style={{
                      transitionDelay: showLinks ? `${NAV_LINKS.length * LINK_STAGGER_MS}ms` : "0ms",
                    }}
                  >
                    <a
                      href="#register"
                      onClick={closeMenu}
                      className="inline-block border border-white px-5 py-2.5 text-[10px] tracking-[0.15em] text-white uppercase transition hover:bg-white hover:text-brand sm:text-xs"
                    >
                      {CTA_LABEL}
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative hidden min-h-0 bg-transparent lg:block">
              <div
                className={`${LANDING_CONTAINER} pointer-events-none absolute inset-x-0 top-0 z-10 pt-4 pb-3 lg:items-center lg:py-5 ${showLinks ? "opacity-100" : "opacity-0"}`}
                dir="rtl"
              >
                <div className="overflow-hidden">
                  <div
                    className={`menu-link-reveal ${showLinks ? "is-visible" : ""}`}
                    style={{ transitionDelay: showLinks ? "90ms" : "0ms" }}
                  >
                    <Link
                      href="/"
                      className="pointer-events-auto inline-block shrink-0 leading-none"
                      onClick={closeMenu}
                    >
                      <BevelLogo variant="onLight" blend={false} />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
