export const LOGO_SRC = "/assets/bevel_red_white_png_fit.png";
export const LOGO_SRC_ON_LIGHT = "/assets/bevel_red_black_png_fit.png";

/** Intrinsic pixel size of logo PNG assets (used for Next/Image layout ratio). */
export const LOGO_INTRINSIC_WIDTH = 1863;
export const LOGO_INTRINSIC_HEIGHT = 2054;

/** Responsive logo sizes — smaller on mobile, full size from sm/lg up */
export const LOGO_CLASS = {
  admin: "h-auto w-20 object-contain sm:w-28 lg:w-[140px]",
  header: "h-auto w-16 object-contain sm:w-24",
  landingHeader: "h-auto w-[70px] object-contain lg:w-[90px]",
  home: "h-auto w-20 object-contain sm:w-28",
  login: "h-auto w-28 object-contain sm:w-44",
  landing: "h-auto w-[min(120px,38vw)] object-contain sm:w-[min(240px,70vw)]",
} as const;
