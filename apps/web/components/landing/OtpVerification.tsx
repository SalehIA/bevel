"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  phone: string;
  mockOtp?: string;
  onBack: () => void;
  embedded?: boolean;
};

export default function OtpVerification({ phone, mockOtp, onBack, embedded }: Props) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/customer/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "رمز التحقق غير صحيح");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("حدث خطأ. يرجى المحاولة مجدداً");
    } finally {
      setLoading(false);
    }
  }

  const mutedClass = embedded ? "text-white/60" : "text-muted";
  const labelClass = embedded ? "text-white/80" : "text-brand";

  return (
    <div>
      <p className={`mb-4 text-sm ${mutedClass}`}>
        أرسلنا رمز التحقق إلى واتساب{" "}
        <span dir="ltr" className={`font-medium ${embedded ? "text-white" : "text-brand"}`}>
          {phone}
        </span>
      </p>

      {mockOtp ? (
        <p className="mb-4 rounded-lg bg-accent/20 px-3 py-2 text-sm text-brand-dark">
          وضع التطوير — الرمز: <strong dir="ltr">{mockOtp}</strong>
        </p>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="otp-code" className={`mb-1.5 block text-sm font-medium ${labelClass}`}>
            رمز التحقق
          </label>
          <input
            id="otp-code"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="000000"
            required
            dir="ltr"
            className="w-full rounded-xl border border-brand/20 bg-white px-4 py-3 text-center text-2xl tracking-[0.5em] text-brand outline-none focus:border-accent"
          />
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <button
          type="submit"
          disabled={loading || code.length < 6}
          className="w-full rounded-none bg-accent py-3.5 text-sm font-semibold tracking-wide text-brand-dark transition hover:brightness-110 disabled:opacity-60"
        >
          {loading ? "جاري التحقق..." : "تأكيد والدخول"}
        </button>

        <button
          type="button"
          onClick={onBack}
          className={`w-full text-sm ${mutedClass} transition hover:text-accent`}
        >
          ← تعديل البيانات
        </button>
      </form>
    </div>
  );
}
