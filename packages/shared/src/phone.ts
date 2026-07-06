function saudiNationalDigits(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;

  if (digits.startsWith("966")) {
    const national = digits.slice(3);
    return national.length >= 9 ? national.slice(0, 9) : null;
  }

  if (digits.startsWith("0")) {
    const national = digits.slice(1);
    return national.length >= 9 ? national.slice(0, 9) : null;
  }

  if (digits.length === 9 && digits.startsWith("5")) {
    return digits;
  }

  return null;
}

/** Display format: +966-56-326-4726 */
export function formatSaudiPhoneDisplay(phone: string): string {
  const national = saudiNationalDigits(phone);
  if (!national) return phone.trim();

  return `+966-${national.slice(0, 2)}-${national.slice(2, 5)}-${national.slice(5)}`;
}

/** E.164 for tel: links, e.g. +966563264726 */
export function formatSaudiPhoneTel(phone: string): string {
  const national = saudiNationalDigits(phone);
  if (!national) {
    const trimmed = phone.trim();
    return trimmed.startsWith("+") ? trimmed.replace(/[\s-]/g, "") : `+${phone.replace(/\D/g, "")}`;
  }

  return `+966${national}`;
}

export type SaudiPhoneValidation =
  | { ok: true; e164: string; national: string }
  | { ok: false; error: string };

/** Validate and normalize Saudi mobile numbers (+966 5X XXX XXXX). */
export function validateSaudiPhone(input: string): SaudiPhoneValidation {
  const trimmed = input.trim();
  if (!trimmed) {
    return { ok: false, error: "رقم الجوال مطلوب" };
  }

  const national = saudiNationalDigits(trimmed);
  if (!national || national.length !== 9) {
    return { ok: false, error: "أدخل رقم جوال سعودي صحيح (مثال: 05XXXXXXXX)" };
  }

  if (!national.startsWith("5")) {
    return { ok: false, error: "رقم الجوال السعودي يجب أن يبدأ بـ 5" };
  }

  return { ok: true, e164: `+966${national}`, national };
}
