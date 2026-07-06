import type { SessionOptions } from "iron-session";

export type CustomerSessionData = {
  customerId?: string;
  name?: string;
  phone?: string;
  isVerified?: boolean;
  isLoggedIn?: boolean;
};

export const customerSessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET || "bevel-dev-secret-change-me-in-production",
  cookieName: "bevel_customer_session",
  cookieOptions: {
    secure: process.env.COOKIE_SECURE === "true",
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  },
};
