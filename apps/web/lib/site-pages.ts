/** Site pages that can display gallery subcategories and curated photos. */
export const SITE_PAGES = [
  { id: "landing", label: "الصفحة الرئيسية" },
] as const;

export type SitePageId = (typeof SITE_PAGES)[number]["id"];

export const LANDING_PAGE_ID: SitePageId = "landing";

export function isSitePageId(value: string): value is SitePageId {
  return SITE_PAGES.some((page) => page.id === value);
}
