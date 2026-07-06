"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { LOGO_CLASS, LOGO_SRC } from "@/lib/branding";

export default function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const form = new FormData(e.currentTarget);

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: String(form.get("username") || "").trim(),
          password: String(form.get("password") || ""),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          res.status === 401
            ? "اسم المستخدم أو كلمة المرور غير صحيحة"
            : data.error || "تعذر تسجيل الدخول. حاول مرة أخرى."
        );
        return;
      }
      router.push("/bevel-admin");
      router.refresh();
    } catch {
      setError("تعذر الاتصال بالخادم. حاول مرة أخرى.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-brand px-6">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md space-y-4 rounded-2xl border border-white/10 bg-brand-dark p-8 shadow-xl"
      >
        <div className="flex justify-center">
          <Image
            src={LOGO_SRC}
            alt="Bevel"
            width={180}
            height={90}
            className={LOGO_CLASS.login}
          />
        </div>
        <h1 className="text-center text-xl font-bold text-white">Bevel Admin</h1>
        <p className="text-center text-sm text-white/70">لوحة إدارة المعرض</p>
        <label className="block space-y-1">
          <span className="text-sm font-semibold text-white/90">اسم المستخدم</span>
          <input
            name="username"
            required
            className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white placeholder:text-white/40"
            autoComplete="username"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-semibold text-white/90">كلمة المرور</span>
          <input
            name="password"
            type="password"
            required
            className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white placeholder:text-white/40"
            autoComplete="current-password"
          />
        </label>
        {error ? <p className="text-sm text-red-300">{error}</p> : null}
        <button
          disabled={loading}
          type="submit"
          className="w-full rounded-xl bg-accent py-2.5 font-semibold text-brand-dark disabled:opacity-60"
        >
          {loading ? "جاري الدخول..." : "دخول"}
        </button>
      </form>
    </main>
  );
}
