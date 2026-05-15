import { createHash, timingSafeEqual } from "crypto";

export const COOKIE_NAME = "tennis-admin-session";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
const SESSION_MAX_AGE_MS = SESSION_MAX_AGE_SECONDS * 1000;

function signValue(issuedAt: string, secret: string) {
  return createHash("sha256").update(`${issuedAt}.${secret}`).digest("base64url");
}

function signaturesMatch(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function signAdminSessionValue(secret = process.env.SESSION_SECRET ?? "") {
  if (!secret) throw new Error("SESSION_SECRET is required to sign admin sessions.");
  const issuedAt = Date.now().toString();
  return `${issuedAt}.${signValue(issuedAt, secret)}`;
}

export function verifyAdminSessionValue(value: string | undefined | null, secret = process.env.SESSION_SECRET ?? "") {
  if (!value || !secret) return false;

  const parts = value.split(".");
  if (parts.length !== 2) return false;

  const [issuedAt, signature] = parts;
  const issuedAtMs = Number(issuedAt);
  if (!issuedAt || !signature || !Number.isFinite(issuedAtMs)) return false;
  if (Date.now() - issuedAtMs > SESSION_MAX_AGE_MS) return false;

  return signaturesMatch(signature, signValue(issuedAt, secret));
}

export async function requireAdmin() {
  const [{ cookies }, { redirect }] = await Promise.all([import("next/headers"), import("next/navigation")]);
  const cookieStore = await cookies();
  const sessionValue = cookieStore.get(COOKIE_NAME)?.value;

  if (!verifyAdminSessionValue(sessionValue)) {
    redirect("/admin/login");
  }
}

export async function loginAdminAction(formData: FormData) {
  "use server";

  const [{ cookies }, { redirect }] = await Promise.all([import("next/headers"), import("next/navigation")]);
  const password = formData.get("password");
  const adminPassword = process.env.ADMIN_PASSWORD;
  const sessionSecret = process.env.SESSION_SECRET;

  if (!adminPassword || !sessionSecret || password !== adminPassword) {
    redirect("/admin/login?error=1");
  }

  const cookieStore = await cookies();
  cookieStore.set({
    name: COOKIE_NAME,
    value: signAdminSessionValue(sessionSecret),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS
  });

  redirect("/admin");
}

export async function logoutAdminAction() {
  "use server";

  const [{ cookies }, { redirect }] = await Promise.all([import("next/headers"), import("next/navigation")]);
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
  redirect("/admin/login");
}
