import type { SessionOptions } from "iron-session";
import type { Permissions } from "./types";

export type SessionData = {
  userId?: string;
  username?: string;
  name?: string;
  roleId?: string;
  roleName?: string;
  permissions?: Permissions;
  isLoggedIn?: boolean;
};

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET || "bevel-dev-secret-change-me-in-production",
  cookieName: "bevel_session",
  cookieOptions: {
    // VPS currently serves over HTTP — secure cookies are dropped by the browser
    secure: process.env.COOKIE_SECURE === "true",
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  },
};
