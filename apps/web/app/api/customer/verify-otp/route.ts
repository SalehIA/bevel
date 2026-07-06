import { NextResponse } from "next/server";
import { validateSaudiPhone } from "@bevel/shared";
import { setCustomerSession } from "@/lib/customer-auth";
import { upsertCustomer } from "@/lib/customers";
import { verifyOtp } from "@/lib/otp";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const phoneInput = String(body.phone || "").trim();
    const code = String(body.code || "").trim();

    if (!code) {
      return NextResponse.json({ error: "رمز التحقق مطلوب" }, { status: 400 });
    }

    const phoneResult = validateSaudiPhone(phoneInput);
    if (!phoneResult.ok) {
      return NextResponse.json({ error: phoneResult.error }, { status: 400 });
    }

    const verifyResult = verifyOtp(phoneResult.e164, code);
    if (!verifyResult.ok) {
      return NextResponse.json({ error: verifyResult.error }, { status: 400 });
    }

    const customer = upsertCustomer({
      name: verifyResult.name,
      phone: verifyResult.phone,
    });

    await setCustomerSession({
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
    });

    return NextResponse.json({
      ok: true,
      customer: { id: customer.id, name: customer.name, phone: customer.phone },
    });
  } catch (error) {
    console.error("OTP verify failed:", error);
    return NextResponse.json({ error: "تعذر التحقق من الرمز" }, { status: 500 });
  }
}
