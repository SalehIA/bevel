export type SendOtpResult = { ok: true } | { ok: false; error: string };

export async function sendWhatsAppOtp(phone: string, code: string): Promise<SendOtpResult> {
  const mock = process.env.WHATSAPP_MOCK !== "false";

  if (mock) {
    console.log(`[WhatsApp Mock OTP] ${phone}: ${code}`);
    return { ok: true };
  }

  const apiUrl = process.env.WHATSAPP_API_URL;
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const templateName = process.env.WHATSAPP_OTP_TEMPLATE_NAME || "bevel_otp";

  if (!apiUrl || !token || !phoneNumberId) {
    return { ok: false, error: "إعدادات واتساب غير مكتملة" };
  }

  const e164Digits = phone.replace(/\D/g, "");

  try {
    const response = await fetch(`${apiUrl}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: e164Digits,
        type: "template",
        template: {
          name: templateName,
          language: { code: "ar" },
          components: [
            {
              type: "body",
              parameters: [{ type: "text", text: code }],
            },
            {
              type: "button",
              sub_type: "url",
              index: "0",
              parameters: [{ type: "text", text: code }],
            },
          ],
        },
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error("[WhatsApp OTP] send failed:", body);
      return { ok: false, error: "تعذر إرسال رمز التحقق عبر واتساب" };
    }

    return { ok: true };
  } catch (error) {
    console.error("[WhatsApp OTP] error:", error);
    return { ok: false, error: "تعذر إرسال رمز التحقق" };
  }
}
