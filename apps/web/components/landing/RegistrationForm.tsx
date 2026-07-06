"use client";

import { useState } from "react";

type Props = {
  onSuccess: (phone: string, mockOtp?: string) => void;
  embedded?: boolean;
};

export default function RegistrationForm({ onSuccess, embedded }: Props) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/customer/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "تعذر إرسال رمز التحقق");
        return;
      }

      onSuccess(data.phone, data.mockOtp);
    } catch {
      setError("حدث خطأ. يرجى المحاولة مجدداً");
    } finally {
      setLoading(false);
    }
  }

  const labelClass = embedded ? "text-white/80" : "text-brand";
  const hintClass = embedded ? "text-white/50" : "text-muted";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="reg-name" className={`mb-1.5 block text-sm font-medium ${labelClass}`}>
          الاسم
        </label>
        <input
          id="reg-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="اسمك الكامل"
          required
          minLength={2}
          className="w-full rounded-xl border border-brand/20 bg-white px-4 py-3 text-brand outline-none focus:border-accent"
        />
      </div>

      <div>
        <label htmlFor="reg-phone" className={`mb-1.5 block text-sm font-medium ${labelClass}`}>
          رقم الجوال (السعودية فقط)
        </label>
        <input
          id="reg-phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="05XXXXXXXX"
          required
          dir="ltr"
          className="w-full rounded-xl border border-brand/20 bg-white px-4 py-3 text-brand outline-none focus:border-accent"
        />
        <p className={`mt-1 text-xs ${hintClass}`}>سيتم إرسال رمز التحقق عبر واتساب</p>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-none bg-accent py-3.5 text-sm font-semibold tracking-wide text-brand-dark transition hover:brightness-110 disabled:opacity-60"
      >
        {loading ? "جاري الإرسال..." : "إرسال رمز التحقق"}
      </button>
    </form>
  );
}
