type OtpRecord = {
  phone: string;
  code: string;
  name: string;
  expiresAt: number;
  attempts: number;
  lastSentAt: number;
  sendCountHour: number;
  hourStartedAt: number;
};

type OtpStore = { records: OtpRecord[] };

import { readJson, writeJson } from "./storage";

function emptyStore(): OtpStore {
  return { records: [] };
}

function loadOtpStore(): OtpStore {
  const store = readJson("otp-pending.json", emptyStore());
  const now = Date.now();
  store.records = store.records.filter((r) => r.expiresAt > now);
  return store;
}

function saveOtpStore(store: OtpStore) {
  writeJson("otp-pending.json", store);
}

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function expiryMs() {
  return (Number(process.env.OTP_EXPIRY_SECONDS) || 300) * 1000;
}

function maxAttempts() {
  return Number(process.env.OTP_MAX_ATTEMPTS) || 5;
}

export type CreateOtpResult =
  | { ok: true; code: string }
  | { ok: false; error: string; retryAfterSeconds?: number };

export function createOtp(name: string, phone: string): CreateOtpResult {
  const store = loadOtpStore();
  const now = Date.now();
  const existing = store.records.find((r) => r.phone === phone);

  if (existing) {
    const sinceLastSend = now - existing.lastSentAt;
    if (sinceLastSend < 60_000) {
      return {
        ok: false,
        error: "يرجى الانتظار قبل طلب رمز جديد",
        retryAfterSeconds: Math.ceil((60_000 - sinceLastSend) / 1000),
      };
    }

    const hourElapsed = now - existing.hourStartedAt;
    if (hourElapsed < 3_600_000 && existing.sendCountHour >= 5) {
      return {
        ok: false,
        error: "تم تجاوز الحد الأقصى لطلبات الرمز. حاول لاحقاً",
        retryAfterSeconds: Math.ceil((3_600_000 - hourElapsed) / 1000),
      };
    }
  }

  const code = generateCode();
  const record: OtpRecord = {
    phone,
    code,
    name: name.trim(),
    expiresAt: now + expiryMs(),
    attempts: 0,
    lastSentAt: now,
    sendCountHour:
      existing && now - existing.hourStartedAt < 3_600_000
        ? existing.sendCountHour + 1
        : 1,
    hourStartedAt:
      existing && now - existing.hourStartedAt < 3_600_000
        ? existing.hourStartedAt
        : now,
  };

  store.records = store.records.filter((r) => r.phone !== phone);
  store.records.push(record);
  saveOtpStore(store);

  return { ok: true, code };
}

export type VerifyOtpResult =
  | { ok: true; name: string; phone: string }
  | { ok: false; error: string };

export function verifyOtp(phone: string, code: string): VerifyOtpResult {
  const store = loadOtpStore();
  const record = store.records.find((r) => r.phone === phone);

  if (!record) {
    return { ok: false, error: "لم يتم العثور على رمز تحقق. يرجى التسجيل مجدداً" };
  }

  if (Date.now() > record.expiresAt) {
    store.records = store.records.filter((r) => r.phone !== phone);
    saveOtpStore(store);
    return { ok: false, error: "انتهت صلاحية الرمز. يرجى طلب رمز جديد" };
  }

  record.attempts += 1;
  if (record.attempts > maxAttempts()) {
    store.records = store.records.filter((r) => r.phone !== phone);
    saveOtpStore(store);
    return { ok: false, error: "تجاوزت عدد المحاولات المسموحة" };
  }

  if (record.code !== code.trim()) {
    saveOtpStore(store);
    return { ok: false, error: "رمز التحقق غير صحيح" };
  }

  store.records = store.records.filter((r) => r.phone !== phone);
  saveOtpStore(store);

  return { ok: true, name: record.name, phone: record.phone };
}
