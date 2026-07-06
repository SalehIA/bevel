import {
  ADMIN_ROLE_ID,
  ALL_ADMIN_TABS,
  ALL_TABS,
} from "./constants";
import type { Permissions } from "./types";

export function fullPermissions(): Permissions {
  return {
    tabs: [...ALL_TABS],
    sections: ["*"],
    admin_tabs: [...ALL_ADMIN_TABS],
  };
}

export function normalizePermissions(raw: Partial<Permissions> | undefined): Permissions {
  return {
    tabs: (raw?.tabs || []).filter((t) => ALL_TABS.includes(t as (typeof ALL_TABS)[number])),
    sections: raw?.sections || [],
    admin_tabs: (raw?.admin_tabs || []).filter((t) =>
      ALL_ADMIN_TABS.includes(t as (typeof ALL_ADMIN_TABS)[number])
    ),
  };
}

export function getEffectivePermissions(roleId: string, permissions: Permissions): Permissions {
  if (roleId === ADMIN_ROLE_ID) return fullPermissions();
  return normalizePermissions(permissions);
}

export function hasTab(permissions: Permissions | undefined, tab: string) {
  return (permissions?.tabs || []).includes(tab);
}

export function hasAdminTab(permissions: Permissions | undefined, tab: string) {
  return hasTab(permissions, "admin") && (permissions?.admin_tabs || []).includes(tab);
}

export function hasSection(permissions: Permissions | undefined, sectionId: string) {
  const sections = permissions?.sections || [];
  if (sections.includes("*")) return true;
  return sections.includes(sectionId);
}
