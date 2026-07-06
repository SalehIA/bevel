/** Shared horizontal padding — abvtek-style tight margins on large screens */
export const LANDING_CONTAINER =
  "mx-auto w-full max-w-[100%] px-4 sm:px-6 lg:px-10 xl:px-14 2xl:px-16";

export const NAV_LINKS = [
  { href: "#about", label: "من نحن" },
  { href: "#projects", label: "المشاريع" },
  { href: "#services", label: "الخدمات" },
  { href: "/portfolio", label: "المعرض", external: false },
  { href: "#register", label: "تواصل معنا" },
] as const;

export const CTA_LABEL = "ابدأ مشروعك معنا";
