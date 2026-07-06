import { NextResponse } from "next/server";
import { validateSaudiPhone } from "@bevel/shared";
import { createOtp } from "@/lib/otp";
import { sendWhatsAppOtp } from "@/lib/whatsapp";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const name = String(body.name || "").trim();
    const phoneInput = String(body.phone || "").trim();

    if (!name || name.length < 2) {
      return NextResponse.json({ error: "الاسم مطلوب (حرفان على الأقل)" }, { status: 400 });
    }

    const phoneResult = validateSaudiPhone(phoneInput);
    if (!phoneResult.ok) {
      return NextResponse.json({ error: phoneResult.error }, { status: 400 });
    }

    const otpResult = createOtp(name, phoneResult.e164);
    if (!otpResult.ok) {
      return NextResponse.json(
        { error: otpResult.error, retryAfterSeconds: otpResult.retryAfterSeconds },
        { status: 429 }
      );
    }

    const sendResult = await sendWhatsAppOtp(phoneResult.e164, otpResult.code);
    if (!sendResult.ok) {
      return NextResponse.json({ error: sendResult.error }, { status: 502 });
    }

    const mock = process.env.WHATSAPP_MOCK !== "false";
    return NextResponse.json({
      ok: true,
      phone: phoneResult.e164,
      ...(mock ? { mockOtp: otpResult.code } : {}),
    });
  } catch (error) {
    console.error("Customer register failed:", error);
    return NextResponse.json({ error: "تعذر إرسال رمز التحقق" }, { status: 500 });
  }
}
