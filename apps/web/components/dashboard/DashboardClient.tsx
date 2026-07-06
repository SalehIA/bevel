"use client";

import { CUSTOMER_PROJECT_STATUS_LABELS, type CustomerProject } from "@bevel/shared";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LANDING_SERVICES } from "@/lib/landing/services";

type Props = {
  initialProjects: CustomerProject[];
};

export default function DashboardClient({ initialProjects }: Props) {
  const router = useRouter();
  const [projects, setProjects] = useState(initialProjects);
  const [showForm, setShowForm] = useState(initialProjects.length === 0);
  const [title, setTitle] = useState("");
  const [serviceType, setServiceType] = useState<string>(LANDING_SERVICES[0].id);
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/customer/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, serviceType, description, location }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "تعذر إضافة المشروع");
        return;
      }

      setProjects((prev) => [data.project, ...prev]);
      setTitle("");
      setDescription("");
      setLocation("");
      setShowForm(false);
      router.refresh();
    } catch {
      setError("حدث خطأ. يرجى المحاولة مجدداً");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/customer/session", { method: "DELETE" });
    router.push("/");
    router.refresh();
  }

  function getServiceTitle(id: string) {
    return LANDING_SERVICES.find((s) => s.id === id)?.title || id;
  }

  return (
    <div className="mt-8 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl font-semibold text-brand">مشاريعك</h2>
        <div className="flex gap-3">
          {!showForm ? (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-brand-dark transition hover:brightness-110"
            >
              + إضافة مشروع
            </button>
          ) : null}
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-xl border border-brand/20 px-4 py-2 text-sm text-muted transition hover:text-brand"
          >
            تسجيل الخروج
          </button>
        </div>
      </div>

      {showForm ? (
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-brand/10 bg-white p-6 shadow-sm"
        >
          <h3 className="mb-4 text-lg font-semibold text-brand">مشروع جديد</h3>

          <div className="space-y-4">
            <div>
              <label htmlFor="proj-title" className="mb-1.5 block text-sm font-medium text-brand">
                عنوان المشروع *
              </label>
              <input
                id="proj-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                minLength={2}
                className="w-full rounded-xl border border-brand/20 px-4 py-3 outline-none focus:border-accent"
              />
            </div>

            <div>
              <label htmlFor="proj-service" className="mb-1.5 block text-sm font-medium text-brand">
                نوع الخدمة *
              </label>
              <select
                id="proj-service"
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value)}
                className="w-full rounded-xl border border-brand/20 px-4 py-3 outline-none focus:border-accent"
              >
                {LANDING_SERVICES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="proj-desc" className="mb-1.5 block text-sm font-medium text-brand">
                وصف مختصر
              </label>
              <textarea
                id="proj-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-brand/20 px-4 py-3 outline-none focus:border-accent"
              />
            </div>

            <div>
              <label htmlFor="proj-loc" className="mb-1.5 block text-sm font-medium text-brand">
                المدينة / الموقع
              </label>
              <input
                id="proj-loc"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="مثال: الرياض"
                className="w-full rounded-xl border border-brand/20 px-4 py-3 outline-none focus:border-accent"
              />
            </div>
          </div>

          {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

          <div className="mt-6 flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-brand-dark transition hover:brightness-110 disabled:opacity-60"
            >
              {loading ? "جاري الحفظ..." : "إرسال المشروع"}
            </button>
            {projects.length > 0 ? (
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-xl border border-brand/20 px-5 py-2.5 text-sm text-muted"
              >
                إلغاء
              </button>
            ) : null}
          </div>
        </form>
      ) : null}

      {projects.length === 0 && !showForm ? (
        <div className="rounded-2xl border border-dashed border-brand/20 bg-white p-10 text-center">
          <p className="text-muted">لم تضف أي مشروع بعد</p>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="mt-4 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-brand-dark"
          >
            أضف مشروعك الأول
          </button>
        </div>
      ) : null}

      {projects.length > 0 ? (
        <ul className="space-y-4">
          {projects.map((project) => (
            <li
              key={project.id}
              className="rounded-2xl border border-brand/10 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-brand">{project.title}</h3>
                  <p className="mt-1 text-sm text-muted">{getServiceTitle(project.serviceType)}</p>
                </div>
                <span className="rounded-full bg-accent/20 px-3 py-1 text-xs font-medium text-brand-dark">
                  {CUSTOMER_PROJECT_STATUS_LABELS[project.status]}
                </span>
              </div>
              {project.description ? (
                <p className="mt-3 text-sm text-muted">{project.description}</p>
              ) : null}
              {project.location ? (
                <p className="mt-2 text-xs text-muted">📍 {project.location}</p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
