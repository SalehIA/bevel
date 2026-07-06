"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import AdminPanelSettingsOutlinedIcon from "@mui/icons-material/AdminPanelSettingsOutlined";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ManageAccountsOutlinedIcon from "@mui/icons-material/ManageAccountsOutlined";
import NotificationsOutlinedIcon from "@mui/icons-material/NotificationsOutlined";
import PeopleOutlinedIcon from "@mui/icons-material/PeopleOutlined";
import PhotoLibraryOutlinedIcon from "@mui/icons-material/PhotoLibraryOutlined";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import CloseIcon from "@mui/icons-material/Close";
import MenuIcon from "@mui/icons-material/Menu";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import UploadFileOutlinedIcon from "@mui/icons-material/UploadFileOutlined";
import DataGrid from "@/components/admin/DataGrid";
import { LOGO_CLASS, LOGO_SRC } from "@/lib/branding";
import { buildMediaPath } from "@/lib/media";
import type { Permissions, PublicUser, Role, Section, Subsection } from "@/lib/types";

const navIconClass = "shrink-0 text-[1.25rem]";

type SectionWithSubs = Section & { subsections: Subsection[] };

type SubRow = {
  key: string;
  sectionId: string;
  sectionName: string;
  sectionSlug: string;
  slug: string;
  name: string;
};

async function api(path: string, options: RequestInit = {}) {
  const headers: Record<string, string> = {};
  if (options.body && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  const res = await fetch(path, { credentials: "same-origin", headers, ...options });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

function canTab(user: PublicUser, tab: string) {
  return user.permissions.tabs.includes(tab) || user.role_id === "role-admin";
}

function canAdminTab(user: PublicUser, tab: string) {
  return canTab(user, "admin") && (user.permissions.admin_tabs.includes(tab) || user.role_id === "role-admin");
}

export default function AdminDashboard({ user }: { user: PublicUser }) {
  const [view, setView] = useState<"gallery" | "users" | "roles">("gallery");
  const [sections, setSections] = useState<SectionWithSubs[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");
  const [adminOpen, setAdminOpen] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [selectedSubKey, setSelectedSubKey] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);

  const [showSectionModal, setShowSectionModal] = useState(false);
  const [showSubModal, setShowSubModal] = useState(false);
  const [sectionName, setSectionName] = useState("");
  const [sectionSlug, setSectionSlug] = useState("");
  const [subSectionId, setSubSectionId] = useState("");
  const [subName, setSubName] = useState("");
  const [subSlug, setSubSlug] = useState("");

  const [files, setFiles] = useState<{ name: string; kind: string }[]>([]);
  const [mediaThumbnail, setMediaThumbnail] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editSection, setEditSection] = useState({ name: "", description: "" });
  const [editSub, setEditSub] = useState({
    name: "",
    description: "",
    locationLink: "",
    engineer: "",
    phone: "",
    tags: "",
  });

  const [roleForm, setRoleForm] = useState({
    id: "",
    name: "",
    tabs: { gallery: true, admin: false },
    adminTabs: { users: false, roles: false },
    allSections: true,
    sectionIds: [] as string[],
  });

  const notify = (msg: string, isError = false) => {
    setToast(msg);
    setError(isError ? msg : "");
    setTimeout(() => setToast(""), 3000);
  };

  const loadSections = async () => {
    const data = await api("/api/sections");
    setSections(data.sections || []);
  };

  const loadUsers = async () => {
    const data = await api("/api/users");
    setUsers(data.users || []);
    setRoles(data.roles || []);
  };

  const loadRoles = async () => {
    const data = await api("/api/roles");
    setRoles(data.roles || []);
  };

  const subRows: SubRow[] = useMemo(
    () =>
      sections.flatMap((section) =>
        section.subsections.map((sub) => ({
          key: `${section.id}:${sub.slug}`,
          sectionId: section.id,
          sectionName: section.name,
          sectionSlug: section.slug,
          slug: sub.slug,
          name: sub.name,
        }))
      ),
    [sections]
  );

  const filteredSubRows = selectedSectionId
    ? subRows.filter((row) => row.sectionId === selectedSectionId)
    : subRows;

  const selectedSubRow = subRows.find((row) => row.key === selectedSubKey) || null;
  const selectedSection = sections.find((s) => s.id === selectedSectionId) || null;
  const selectedUser = users.find((u) => u.id === selectedUserId) || null;
  const selectedRole = roles.find((r) => r.id === selectedRoleId) || null;

  const loadSubsectionDetail = async (row: SubRow) => {
    setSelectedSubKey(row.key);
    const section = sections.find((s) => s.id === row.sectionId);
    const sub = section?.subsections.find((s) => s.slug === row.slug);
    if (!sub) return;
    setEditSub({
      name: sub.name || "",
      description: sub.description || "",
      locationLink: sub.locationLink || "",
      engineer: sub.siteEngineer?.name || "",
      phone: sub.siteEngineer?.phone || "",
      tags: (sub.tags || []).join("، "),
    });
    const data = await api(
      `/api/sections/${encodeURIComponent(row.sectionId)}/subsections/${encodeURIComponent(row.slug)}`
    );
    setFiles(data.files || []);
    setMediaThumbnail(data.thumbnail || null);
  };

  const mediaApi = (row: SubRow, path: string, options: RequestInit = {}) =>
    api(
      `/api/sections/${encodeURIComponent(row.sectionId)}/subsections/${encodeURIComponent(row.slug)}/files${path}`,
      options
    );

  const deleteMediaFile = async (fileName: string) => {
    const row = subRows.find((r) => r.key === selectedSubKey);
    if (!row || !confirm("حذف هذا الملف؟")) return;
    try {
      await mediaApi(row, "", { method: "DELETE", body: JSON.stringify({ name: fileName }) });
      notify("تم الحذف");
      await loadSubsectionDetail(row);
    } catch (err) {
      notify(err instanceof Error ? err.message : "فشل", true);
    }
  };

  const moveMediaFile = async (fileName: string, direction: "up" | "down") => {
    const row = subRows.find((r) => r.key === selectedSubKey);
    if (!row) return;
    const index = files.findIndex((f) => f.name === fileName);
    if (index < 0) return;
    const next = direction === "up" ? index - 1 : index + 1;
    if (next < 0 || next >= files.length) return;
    const order = files.map((f) => f.name);
    [order[index], order[next]] = [order[next], order[index]];
    try {
      await mediaApi(row, "", {
        method: "PATCH",
        body: JSON.stringify({ action: "reorder", order }),
      });
      await loadSubsectionDetail(row);
    } catch (err) {
      notify(err instanceof Error ? err.message : "فشل", true);
    }
  };

  const setAsThumbnail = async (fileName: string) => {
    const row = subRows.find((r) => r.key === selectedSubKey);
    if (!row) return;
    try {
      await mediaApi(row, "", {
        method: "PATCH",
        body: JSON.stringify({ action: "setThumbnail", name: fileName }),
      });
      notify("تم تعيين الصورة المصغرة");
      await loadSubsectionDetail(row);
    } catch (err) {
      notify(err instanceof Error ? err.message : "فشل", true);
    }
  };

  const saveSelectedSection = async () => {
    if (!selectedSectionId) return;
    try {
      await api(`/api/sections/${encodeURIComponent(selectedSectionId)}`, {
        method: "PUT",
        body: JSON.stringify({
          name: editSection.name,
          description: editSection.description,
        }),
      });
      notify("تم حفظ القسم");
      await loadSections();
    } catch (err) {
      notify(err instanceof Error ? err.message : "فشل", true);
    }
  };

  const uploadFiles = async (fileList: FileList | null) => {
    const row = subRows.find((r) => r.key === selectedSubKey);
    if (!row || !fileList?.length) return;
    setUploading(true);
    const fd = new FormData();
    [...fileList].forEach((f) => fd.append("files", f));
    try {
      await api(
        `/api/sections/${encodeURIComponent(row.sectionId)}/subsections/${encodeURIComponent(row.slug)}`,
        { method: "POST", body: fd }
      );
      notify("تم الرفع");
      await loadSubsectionDetail(row);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      notify(err instanceof Error ? err.message : "فشل الرفع", true);
    } finally {
      setUploading(false);
    }
  };

  const deleteSelectedSection = async () => {
    if (!selectedSectionId) return;
    const section = sections.find((s) => s.id === selectedSectionId);
    if (!section) return;
    if (!confirm(`حذف القسم «${section.name}» وجميع فروعه؟`)) return;
    try {
      await api(`/api/sections/${encodeURIComponent(selectedSectionId)}`, { method: "DELETE" });
      setSelectedSectionId(null);
      setSelectedSubKey(null);
      notify("تم حذف القسم");
      await loadSections();
    } catch (err) {
      notify(err instanceof Error ? err.message : "فشل الحذف", true);
    }
  };

  const fillRoleForm = (role: Role | null) => {
    if (!role) {
      setRoleForm({
        id: "",
        name: "",
        tabs: { gallery: true, admin: false },
        adminTabs: { users: false, roles: false },
        allSections: true,
        sectionIds: [],
      });
      return;
    }
    setRoleForm({
      id: role.id,
      name: role.name,
      tabs: {
        gallery: role.permissions.tabs.includes("gallery"),
        admin: role.permissions.tabs.includes("admin"),
      },
      adminTabs: {
        users: role.permissions.admin_tabs.includes("users"),
        roles: role.permissions.admin_tabs.includes("roles"),
      },
      allSections: role.permissions.sections.includes("*"),
      sectionIds: role.permissions.sections.filter((s) => s !== "*"),
    });
  };

  useEffect(() => {
    if (canTab(user, "gallery")) loadSections();
    if (canAdminTab(user, "users")) loadUsers();
    if (canAdminTab(user, "roles")) loadRoles();
  }, [user]);

  useEffect(() => {
    if (selectedRole) fillRoleForm(selectedRole);
  }, [selectedRoleId, roles]);

  useEffect(() => {
    if (!selectedSection) {
      setEditSection({ name: "", description: "" });
      return;
    }
    setEditSection({
      name: selectedSection.name,
      description: selectedSection.description || "",
    });
  }, [selectedSectionId, sections]);

  const navigate = (next: typeof view) => {
    setView(next);
    setSidebarOpen(false);
  };

  const handleAddSection = async (e: FormEvent) => {
    e.preventDefault();
    if (!sectionName.trim() || !sectionSlug.trim()) {
      notify("اسم القسم والمعرّف مطلوبان", true);
      return;
    }
    try {
      await api("/api/sections", {
        method: "POST",
        body: JSON.stringify({ name: sectionName.trim(), slug: sectionSlug.trim() }),
      });
      setShowSectionModal(false);
      setSectionName("");
      setSectionSlug("");
      notify("تم إنشاء القسم");
      await loadSections();
    } catch (err) {
      notify(err instanceof Error ? err.message : "فشل الحفظ", true);
    }
  };

  const handleAddSub = async (e: FormEvent) => {
    e.preventDefault();
    const sectionId = subSectionId || selectedSectionId;
    if (!sectionId) {
      notify("اختر قسمًا", true);
      return;
    }
    if (!subName.trim() || !subSlug.trim()) {
      notify("اسم الفرع والمعرّف مطلوبان", true);
      return;
    }
    try {
      await api(`/api/sections/${encodeURIComponent(sectionId)}`, {
        method: "POST",
        body: JSON.stringify({ name: subName.trim(), slug: subSlug.trim() }),
      });
      setShowSubModal(false);
      setSubName("");
      setSubSlug("");
      notify("تم إنشاء الفرع");
      await loadSections();
    } catch (err) {
      notify(err instanceof Error ? err.message : "فشل الحفظ", true);
    }
  };

  const galleryActive = view === "gallery";

  return (
    <div className="min-h-dvh min-w-0 lg:grid lg:grid-cols-[280px_1fr]">
      {sidebarOpen ? (
        <button
          type="button"
          aria-label="إغلاق القائمة"
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <aside
        className={[
          "flex flex-col bg-brand-dark text-white",
          "fixed inset-y-0 start-0 z-50 w-[min(100vw,280px)] transition-transform duration-200",
          "lg:static lg:z-auto lg:w-auto lg:translate-x-0 lg:transform-none",
          sidebarOpen ? "translate-x-0" : "max-lg:-translate-x-full max-lg:rtl:translate-x-full",
        ].join(" ")}
      >
        <div className="flex items-center justify-end border-b border-white/10 px-3 py-2 lg:hidden">
          <button
            type="button"
            aria-label="إغلاق القائمة"
            className="rounded-lg p-2 hover:bg-white/10"
            onClick={() => setSidebarOpen(false)}
          >
            <CloseIcon className={navIconClass} />
          </button>
        </div>
        <div className="flex justify-center border-b border-white/10 px-5 py-6">
          <Image src={LOGO_SRC} alt="Bevel" width={140} height={70} className={LOGO_CLASS.admin} />
        </div>

        <div className="grid grid-cols-[44px_1fr_auto] items-center gap-3 border-b border-white/10 px-5 py-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-accent font-bold text-brand-dark">
            {(user.name || "B").slice(0, 2)}
          </div>
          <div>
            <strong className="block text-sm">{user.name}</strong>
            <span className="text-xs text-white/70">{user.role_name}</span>
          </div>
          <button type="button" className="relative rounded-lg bg-white/10 p-2 text-white/90" aria-label="الإشعارات">
            <NotificationsOutlinedIcon className={navIconClass} />
            <span className="absolute -top-1 -right-1 rounded-full bg-accent px-1 text-[10px] font-semibold text-brand-dark">
              0
            </span>
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-1 p-3 content-start">
          {canTab(user, "gallery") ? (
            <button
              type="button"
              onClick={() => navigate("gallery")}
              className={`flex items-center gap-2 rounded-xl px-3 py-3 text-start ${galleryActive ? "bg-white/10" : "hover:bg-white/5"}`}
            >
              <PhotoLibraryOutlinedIcon className={navIconClass} />
              <span>المعرض</span>
            </button>
          ) : null}

          {canTab(user, "admin") ? (
            <div>
              <button
                type="button"
                onClick={() => setAdminOpen((v) => !v)}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-3 text-start hover:bg-white/5"
              >
                <AdminPanelSettingsOutlinedIcon className={navIconClass} />
                <span>الإدارة</span>
                <span className="ms-auto">
                  {adminOpen ? (
                    <ExpandLessIcon className={navIconClass} />
                  ) : (
                    <ExpandMoreIcon className={navIconClass} />
                  )}
                </span>
              </button>
              {adminOpen ? (
                <div className="mt-1 space-y-1 pe-2">
                  {canAdminTab(user, "users") ? (
                    <button
                      type="button"
                      onClick={() => navigate("users")}
                      className={`flex w-full items-center gap-2 rounded-xl px-4 py-2 text-start text-sm ${view === "users" ? "bg-white/10" : "hover:bg-white/5"}`}
                    >
                      <PeopleOutlinedIcon className={navIconClass} />
                      <span>المستخدمون</span>
                    </button>
                  ) : null}
                  {canAdminTab(user, "roles") ? (
                    <button
                      type="button"
                      onClick={() => navigate("roles")}
                      className={`flex w-full items-center gap-2 rounded-xl px-4 py-2 text-start text-sm ${view === "roles" ? "bg-white/10" : "hover:bg-white/5"}`}
                    >
                      <ManageAccountsOutlinedIcon className={navIconClass} />
                      <span>الأدوار</span>
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </nav>

        <div className="border-t border-white/10 p-4">
          <button
            type="button"
            onClick={async () => {
              await api("/api/auth", { method: "DELETE" });
              location.href = "/bevel-admin/login";
            }}
            className="w-full rounded-xl border border-white/15 px-4 py-2 text-sm"
          >
            تسجيل الخروج
          </button>
        </div>
      </aside>

      <div className="min-w-0 lg:col-start-2">
        <header className="flex min-w-0 items-center gap-4 border-b border-black/10 bg-white px-4 py-4 sm:px-6 sm:py-5">
          <button
            type="button"
            aria-label="القائمة"
            className="rounded-xl border border-black/10 p-2 text-brand lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <MenuIcon />
          </button>
          <h1 className="flex-1 text-xl font-bold text-brand">Bevel Admin</h1>
          {canTab(user, "gallery") ? (
            <button
              type="button"
              onClick={async () => {
                await api("/api/rebuild-manifest", { method: "POST" });
                notify("تم تحديث المعرض");
              }}
              className="rounded-xl border border-black/10 px-4 py-2 text-sm"
            >
              تحديث المعرض
            </button>
          ) : null}
        </header>

        <main className="min-w-0 space-y-6 overflow-x-hidden p-4 sm:p-6">
          {view === "gallery" ? (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowSectionModal(true)}
                  className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-brand-dark"
                >
                  + قسم
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSubSectionId(selectedSectionId || sections[0]?.id || "");
                    setShowSubModal(true);
                  }}
                  className="rounded-xl border border-black/10 px-4 py-2 text-sm"
                >
                  + فرع
                </button>
                {selectedSectionId ? (
                  <button
                    type="button"
                    onClick={() => setSelectedSectionId(null)}
                    className="text-sm text-brand"
                  >
                    عرض كل الفروع
                  </button>
                ) : null}
              </div>

              <section className="min-w-0 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="font-bold text-brand">الأقسام</h2>
                  {selectedSectionId ? (
                    <button
                      type="button"
                      onClick={deleteSelectedSection}
                      className="flex items-center gap-1 rounded-xl border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                    >
                      <DeleteOutlinedIcon sx={{ fontSize: 18 }} />
                      حذف القسم المحدد
                    </button>
                  ) : null}
                </div>
                <DataGrid
                  columns={[
                    { key: "name", header: "الاسم" },
                    { key: "slug", header: "المعرّف" },
                    {
                      key: "count",
                      header: "الفروع",
                      render: (row) => row.subsections.length,
                    },
                  ]}
                  rows={sections}
                  rowKey={(row) => row.id}
                  selectedKey={selectedSectionId}
                  onRowClick={(row) => {
                    setSelectedSectionId((prev) => (prev === row.id ? null : row.id));
                    setSelectedSubKey(null);
                  }}
                />
              </section>

              {selectedSection ? (
                <section className="min-w-0 space-y-3 rounded-2xl border border-black/10 bg-white p-4 shadow-sm sm:p-5">
                  <h2 className="font-bold text-brand">تعديل القسم: {selectedSection.name}</h2>
                  <label className="block space-y-1">
                    <span className="text-sm font-semibold">اسم القسم</span>
                    <input
                      value={editSection.name}
                      onChange={(e) => setEditSection({ ...editSection, name: e.target.value })}
                      className="w-full rounded-xl border border-black/10 px-3 py-2"
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-sm font-semibold">وصف القسم</span>
                    <textarea
                      value={editSection.description}
                      onChange={(e) => setEditSection({ ...editSection, description: e.target.value })}
                      className="w-full rounded-xl border border-black/10 px-3 py-2"
                      rows={3}
                      placeholder="يظهر في صفحة المعرض تحت عنوان القسم"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={saveSelectedSection}
                    className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-brand-dark"
                  >
                    حفظ القسم
                  </button>
                </section>
              ) : null}

              <section className="min-w-0 space-y-3">
                <h2 className="font-bold text-brand">
                  {selectedSectionId
                    ? `فروع ${sections.find((s) => s.id === selectedSectionId)?.name}`
                    : "جميع الفروع"}
                </h2>
                <DataGrid
                  columns={[
                    { key: "sectionName", header: "القسم" },
                    { key: "name", header: "اسم الفرع" },
                    { key: "slug", header: "المعرّف" },
                  ]}
                  rows={filteredSubRows}
                  rowKey={(row) => row.key}
                  selectedKey={selectedSubKey}
                  onRowClick={loadSubsectionDetail}
                  emptyText="لا توجد فروع — أنشئ فرعًا جديدًا"
                />
              </section>

              {selectedSubRow ? (
                <section className="grid min-w-0 gap-6 overflow-hidden rounded-2xl border border-black/10 bg-white p-4 shadow-sm sm:p-5 lg:grid-cols-2">
                  <form
                    className="min-w-0 space-y-3"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      try {
                        await api(
                          `/api/sections/${encodeURIComponent(selectedSubRow.sectionId)}/subsections/${encodeURIComponent(selectedSubRow.slug)}`,
                          {
                            method: "PUT",
                            body: JSON.stringify({
                              name: editSub.name,
                              description: editSub.description,
                              locationLink: editSub.locationLink,
                              siteEngineer: { name: editSub.engineer, phone: editSub.phone },
                              tags: editSub.tags
                                .split(/[,،]/)
                                .map((t) => t.trim())
                                .filter(Boolean),
                            }),
                          }
                        );
                        notify("تم الحفظ");
                        await loadSections();
                      } catch (err) {
                        notify(err instanceof Error ? err.message : "فشل", true);
                      }
                    }}
                  >
                    <h3 className="font-bold text-brand">{selectedSubRow.name}</h3>
                    {(
                      [
                        ["name", "الاسم"],
                        ["description", "الوصف"],
                        ["locationLink", "رابط الموقع"],
                        ["engineer", "مهندس المشروع"],
                        ["phone", "الهاتف"],
                        ["tags", "الوسوم (افصل بفاصلة)"],
                      ] as const
                    ).map(([field, label]) => (
                      <label key={field} className="block space-y-1">
                        <span className="text-sm font-semibold">{label}</span>
                        {field === "description" ? (
                          <textarea
                            value={editSub.description}
                            onChange={(e) => setEditSub({ ...editSub, description: e.target.value })}
                            className="w-full rounded-xl border border-black/10 px-3 py-2"
                            rows={3}
                          />
                        ) : (
                          <input
                            value={
                              field === "engineer"
                                ? editSub.engineer
                                : field === "phone"
                                  ? editSub.phone
                                  : field === "tags"
                                    ? editSub.tags
                                    : editSub[field]
                            }
                            onChange={(e) =>
                              setEditSub({
                                ...editSub,
                                [field === "engineer"
                                  ? "engineer"
                                  : field === "phone"
                                    ? "phone"
                                    : field === "tags"
                                      ? "tags"
                                      : field]: e.target.value,
                              })
                            }
                            className="w-full rounded-xl border border-black/10 px-3 py-2"
                          />
                        )}
                      </label>
                    ))}
                    <div className="flex gap-2">
                      <button type="submit" className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-brand-dark">
                        حفظ
                      </button>
                      <button
                        type="button"
                        className="rounded-xl border border-red-200 px-4 py-2 text-sm text-red-600"
                        onClick={async () => {
                          if (!confirm("حذف هذا الفرع؟")) return;
                          try {
                            await api(
                              `/api/sections/${encodeURIComponent(selectedSubRow.sectionId)}/subsections/${encodeURIComponent(selectedSubRow.slug)}`,
                              { method: "DELETE" }
                            );
                            setSelectedSubKey(null);
                            notify("تم الحذف");
                            await loadSections();
                          } catch (err) {
                            notify(err instanceof Error ? err.message : "فشل", true);
                          }
                        }}
                      >
                        حذف الفرع
                      </button>
                    </div>
                  </form>

                  <div className="min-w-0 space-y-3">
                    <h3 className="font-bold text-brand">الصور والفيديو</h3>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*,video/*"
                      className="hidden"
                      onChange={(e) => uploadFiles(e.target.files)}
                    />
                    <button
                      type="button"
                      disabled={uploading}
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-brand-dark disabled:opacity-60"
                    >
                      <UploadFileOutlinedIcon sx={{ fontSize: 20 }} />
                      {uploading ? "جاري الرفع..." : "رفع صور أو فيديو"}
                    </button>

                    <DataGrid
                      columns={[
                        {
                          key: "preview",
                          header: "معاينة",
                          render: (file) => (
                            <div className="relative">
                              {file.kind === "video" ? (
                                <video
                                  src={buildMediaPath(selectedSubRow.sectionSlug, selectedSubRow.slug, file.name)}
                                  className="h-16 w-24 rounded object-cover"
                                />
                              ) : (
                                <img
                                  src={buildMediaPath(selectedSubRow.sectionSlug, selectedSubRow.slug, file.name)}
                                  alt={file.name}
                                  className="h-16 w-24 rounded object-cover"
                                />
                              )}
                              {mediaThumbnail === file.name ? (
                                <span className="absolute bottom-0 start-0 rounded-tr bg-accent px-1 text-[10px] text-brand-dark">
                                  مصغرة
                                </span>
                              ) : null}
                            </div>
                          ),
                        },
                        { key: "name", header: "الملف" },
                        { key: "kind", header: "النوع" },
                        {
                          key: "actions",
                          header: "إجراءات",
                          className: "whitespace-nowrap",
                          render: (file) => (
                            <div className="flex flex-wrap gap-1">
                              {file.kind === "image" ? (
                                <button
                                  type="button"
                                  title="تعيين كصورة مصغرة"
                                  className="rounded border border-black/10 p-1 hover:bg-surface"
                                  onClick={() => setAsThumbnail(file.name)}
                                >
                                  {mediaThumbnail === file.name ? (
                                    <StarIcon sx={{ fontSize: 18 }} className="text-accent" />
                                  ) : (
                                    <StarBorderIcon sx={{ fontSize: 18 }} />
                                  )}
                                </button>
                              ) : null}
                              <button
                                type="button"
                                title="تحريك لأعلى"
                                className="rounded border border-black/10 p-1 hover:bg-surface"
                                onClick={() => moveMediaFile(file.name, "up")}
                              >
                                <ArrowUpwardIcon sx={{ fontSize: 18 }} />
                              </button>
                              <button
                                type="button"
                                title="تحريك لأسفل"
                                className="rounded border border-black/10 p-1 hover:bg-surface"
                                onClick={() => moveMediaFile(file.name, "down")}
                              >
                                <ArrowDownwardIcon sx={{ fontSize: 18 }} />
                              </button>
                              <button
                                type="button"
                                title="حذف"
                                className="rounded border border-red-200 p-1 text-red-600 hover:bg-red-50"
                                onClick={() => deleteMediaFile(file.name)}
                              >
                                <DeleteOutlinedIcon sx={{ fontSize: 18 }} />
                              </button>
                            </div>
                          ),
                        },
                      ]}
                      rows={files.map((f) => ({ ...f, id: f.name }))}
                      rowKey={(file) => file.name}
                      emptyText="لا توجد ملفات — ارفع صورًا أو فيديو"
                    />
                  </div>
                </section>
              ) : null}
            </>
          ) : null}

          {view === "users" ? (
            <>
              <form
                className="grid gap-3 rounded-2xl border border-black/10 bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-5"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  const role = roles.find((r) => r.id === String(fd.get("roleId")));
                  if (!role) return notify("اختر دورًا صالحًا", true);
                  try {
                    await api("/api/users", {
                      method: "POST",
                      body: JSON.stringify({
                        username: fd.get("username"),
                        name: fd.get("name"),
                        password: fd.get("password"),
                        role_id: role.id,
                      }),
                    });
                    e.currentTarget.reset();
                    notify("تمت الإضافة");
                    loadUsers();
                  } catch (err) {
                    notify(err instanceof Error ? err.message : "فشل", true);
                  }
                }}
              >
                <input name="username" required placeholder="اسم المستخدم" className="rounded-xl border px-3 py-2" />
                <input name="name" required placeholder="الاسم" className="rounded-xl border px-3 py-2" />
                <input name="password" type="password" required placeholder="كلمة المرور" className="rounded-xl border px-3 py-2" />
                <select name="roleId" required className="rounded-xl border px-3 py-2">
                  <option value="">الدور</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
                <button type="submit" className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-brand-dark">
                  إضافة
                </button>
              </form>

              <DataGrid
                columns={[
                  { key: "name", header: "الاسم" },
                  { key: "username", header: "اسم المستخدم" },
                  { key: "role_name", header: "الدور" },
                ]}
                rows={users}
                rowKey={(row) => row.id}
                selectedKey={selectedUserId}
                onRowClick={(row) => setSelectedUserId(row.id)}
              />

              {selectedUser && selectedUser.id !== user.id ? (
                <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
                  <p className="mb-3 text-sm">
                    {selectedUser.name} · {selectedUser.username}
                  </p>
                  <button
                    type="button"
                    className="rounded-xl bg-red-600 px-4 py-2 text-sm text-white"
                    onClick={async () => {
                      if (!confirm("حذف هذا المستخدم؟")) return;
                      await api(`/api/users?id=${encodeURIComponent(selectedUser.id)}`, { method: "DELETE" });
                      setSelectedUserId(null);
                      notify("تم الحذف");
                      loadUsers();
                    }}
                  >
                    حذف المستخدم
                  </button>
                </div>
              ) : null}
            </>
          ) : null}

          {view === "roles" ? (
            <>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRoleId(null);
                    fillRoleForm(null);
                  }}
                  className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-brand-dark"
                >
                  + دور جديد
                </button>
              </div>

              <DataGrid
                columns={[
                  { key: "name", header: "الاسم" },
                  {
                    key: "tabs",
                    header: "التبويبات",
                    render: (row) => row.permissions.tabs.join("، ") || "—",
                  },
                  {
                    key: "sections",
                    header: "الأقسام",
                    render: (row) =>
                      row.permissions.sections.includes("*") ? "الكل" : row.permissions.sections.join("، "),
                  },
                ]}
                rows={roles}
                rowKey={(row) => row.id}
                selectedKey={selectedRoleId}
                onRowClick={(row) => setSelectedRoleId(row.id)}
              />

              <form
                className="space-y-3 rounded-2xl border border-black/10 bg-white p-5 shadow-sm"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const permissions: Permissions = {
                    tabs: [
                      ...(roleForm.tabs.gallery ? ["gallery"] : []),
                      ...(roleForm.tabs.admin ? ["admin"] : []),
                    ],
                    admin_tabs: [
                      ...(roleForm.adminTabs.users ? ["users"] : []),
                      ...(roleForm.adminTabs.roles ? ["roles"] : []),
                    ],
                    sections: roleForm.allSections ? ["*"] : roleForm.sectionIds,
                  };
                  try {
                    if (roleForm.id) {
                      await api("/api/roles", {
                        method: "PUT",
                        body: JSON.stringify({ id: roleForm.id, name: roleForm.name, permissions }),
                      });
                    } else {
                      await api("/api/roles", {
                        method: "POST",
                        body: JSON.stringify({ name: roleForm.name, permissions }),
                      });
                    }
                    notify("تم الحفظ");
                    loadRoles();
                  } catch (err) {
                    notify(err instanceof Error ? err.message : "فشل", true);
                  }
                }}
              >
                <h3 className="font-bold text-brand">{roleForm.id ? "تعديل الدور" : "دور جديد"}</h3>
                <input
                  value={roleForm.name}
                  onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                  required
                  placeholder="اسم الدور"
                  className="w-full rounded-xl border px-3 py-2"
                />
                <label className="flex gap-2">
                  <input
                    type="checkbox"
                    checked={roleForm.tabs.gallery}
                    onChange={(e) => setRoleForm({ ...roleForm, tabs: { ...roleForm.tabs, gallery: e.target.checked } })}
                  />
                  المعرض
                </label>
                <label className="flex gap-2">
                  <input
                    type="checkbox"
                    checked={roleForm.tabs.admin}
                    onChange={(e) => setRoleForm({ ...roleForm, tabs: { ...roleForm.tabs, admin: e.target.checked } })}
                  />
                  الإدارة
                </label>
                <label className="flex gap-2">
                  <input
                    type="checkbox"
                    checked={roleForm.adminTabs.users}
                    onChange={(e) =>
                      setRoleForm({ ...roleForm, adminTabs: { ...roleForm.adminTabs, users: e.target.checked } })
                    }
                  />
                  المستخدمون
                </label>
                <label className="flex gap-2">
                  <input
                    type="checkbox"
                    checked={roleForm.adminTabs.roles}
                    onChange={(e) =>
                      setRoleForm({ ...roleForm, adminTabs: { ...roleForm.adminTabs, roles: e.target.checked } })
                    }
                  />
                  الأدوار
                </label>
                <label className="flex gap-2">
                  <input
                    type="checkbox"
                    checked={roleForm.allSections}
                    onChange={(e) => setRoleForm({ ...roleForm, allSections: e.target.checked })}
                  />
                  جميع الأقسام
                </label>
                <button type="submit" className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-brand-dark">
                  حفظ الدور
                </button>
              </form>
            </>
          ) : null}
        </main>
      </div>

      {showSectionModal ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <form onSubmit={handleAddSection} className="w-full max-w-md space-y-3 rounded-2xl bg-white p-6">
            <h3 className="font-bold text-brand">قسم جديد</h3>
            <input
              value={sectionName}
              onChange={(e) => {
                setSectionName(e.target.value);
                if (!sectionSlug) setSectionSlug(e.target.value);
              }}
              required
              placeholder="اسم القسم"
              className="w-full rounded-xl border px-3 py-2"
            />
            <input
              value={sectionSlug}
              onChange={(e) => setSectionSlug(e.target.value)}
              required
              placeholder="المعرّف"
              className="w-full rounded-xl border px-3 py-2"
            />
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowSectionModal(false)} className="rounded-xl border px-4 py-2">
                إلغاء
              </button>
              <button type="submit" className="rounded-xl bg-accent px-4 py-2 font-semibold text-brand-dark">
                حفظ
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {showSubModal ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <form onSubmit={handleAddSub} className="w-full max-w-md space-y-3 rounded-2xl bg-white p-6">
            <h3 className="font-bold text-brand">فرع جديد</h3>
            <select
              value={subSectionId}
              onChange={(e) => setSubSectionId(e.target.value)}
              required
              className="w-full rounded-xl border px-3 py-2"
            >
              <option value="">اختر القسم</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <input
              value={subName}
              onChange={(e) => {
                setSubName(e.target.value);
                if (!subSlug) setSubSlug(e.target.value);
              }}
              required
              placeholder="اسم الفرع"
              className="w-full rounded-xl border px-3 py-2"
            />
            <input
              value={subSlug}
              onChange={(e) => setSubSlug(e.target.value)}
              required
              placeholder="المعرّف"
              className="w-full rounded-xl border px-3 py-2"
            />
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowSubModal(false)} className="rounded-xl border px-4 py-2">
                إلغاء
              </button>
              <button type="submit" className="rounded-xl bg-accent px-4 py-2 font-semibold text-brand-dark">
                إنشاء
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {toast ? (
        <div
          className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full px-5 py-2 text-white shadow-lg ${error ? "bg-red-600" : "bg-brand"}`}
        >
          {toast}
        </div>
      ) : null}
    </div>
  );
}
