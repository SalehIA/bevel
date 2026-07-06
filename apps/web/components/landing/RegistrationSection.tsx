"use client";

import { useEffect, useRef, useState } from "react";
import OtpVerification from "./OtpVerification";
import RegistrationForm from "./RegistrationForm";

type Props = {
  autoOpen?: boolean;
  embedded?: boolean;
};

export default function RegistrationSection({ autoOpen, embedded }: Props) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState<"register" | "otp">("register");
  const [phone, setPhone] = useState("");
  const [mockOtp, setMockOtp] = useState<string | undefined>();

  useEffect(() => {
    if (autoOpen && sectionRef.current) {
      sectionRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [autoOpen]);

  function handleRegisterSuccess(nextPhone: string, nextMockOtp?: string) {
    setPhone(nextPhone);
    setMockOtp(nextMockOtp);
    setStep("otp");
  }

  const inner = (
    <>
      {!embedded ? (
        <div className="text-center">
          <p className="text-sm font-semibold tracking-widest text-accent uppercase">ابدأ الآن</p>
          <h2 className="mt-3 text-3xl font-bold text-brand">سجّل وابدأ مشروعك</h2>
          <p className="mt-3 text-sm text-muted">
            أدخل اسمك ورقم جوالك السعودي وسنرسل لك رمز التحقق عبر واتساب
          </p>
        </div>
      ) : null}

      <div
        className={
          embedded
            ? "mt-0"
            : "mt-8 rounded-2xl border border-brand/10 bg-surface p-6 shadow-sm"
        }
      >
        {step === "register" ? (
          <RegistrationForm embedded={embedded} onSuccess={handleRegisterSuccess} />
        ) : (
          <OtpVerification
            embedded={embedded}
            phone={phone}
            mockOtp={mockOtp}
            onBack={() => setStep("register")}
          />
        )}
      </div>
    </>
  );

  if (embedded) {
    return <div ref={sectionRef}>{inner}</div>;
  }

  return (
    <section id="register" ref={sectionRef} className="bg-white px-5 py-20">
      <div className="mx-auto max-w-md">{inner}</div>
    </section>
  );
}
