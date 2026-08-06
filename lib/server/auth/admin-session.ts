import { createHash, timingSafeEqual } from "crypto";
import { buildClubPath, isKnownClubSlug, type ClubSlug } from "../../domain/club";

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

export function getAdminSessionCookieName(clubSlug: ClubSlug) {
  return `${COOKIE_NAME}:${clubSlug}`;
}

function getClubPassword(clubSlug: ClubSlug) {
  return process.env[`ADMIN_PASSWORD_${clubSlug.toUpperCase()}`] ?? process.env.ADMIN_PASSWORD ?? "1234";
}

function getSessionSecret() {
  return process.env.SESSION_SECRET ?? "local-development-session-secret";
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

export async function requireAdmin(clubSlug: ClubSlug = "stc") {
  const [{ cookies }, { redirect }] = await Promise.all([import("next/headers"), import("next/navigation")]);
  const cookieStore = await cookies();
  const sessionValue = cookieStore.get(getAdminSessionCookieName(clubSlug))?.value;

  if (!verifyAdminSessionValue(sessionValue, getSessionSecret())) {
    redirect(buildClubPath(clubSlug, "login"));
  }
}

export async function loginAdminAction(formData: FormData) {
  "use server";

  const [{ cookies }, { redirect }] = await Promise.all([import("next/headers"), import("next/navigation")]);
  const rawClubSlug = formData.get("clubSlug");
  const requestedClubSlug = typeof rawClubSlug === "string" ? rawClubSlug : undefined;
  const clubSlug: ClubSlug = isKnownClubSlug(requestedClubSlug) ? requestedClubSlug : "stc";
  const password = formData.get("password");
  const adminPassword = getClubPassword(clubSlug);
  const sessionSecret = getSessionSecret();

  if (password !== adminPassword) {
    redirect(`${buildClubPath(clubSlug, "login")}?error=1`);
  }

  const cookieStore = await cookies();
  cookieStore.set({
    name: getAdminSessionCookieName(clubSlug),
    value: signAdminSessionValue(sessionSecret),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS
  });

  redirect(buildClubPath(clubSlug));
}

export async function logoutAdminAction() {
  "use server";

  const [{ cookies }, { redirect }] = await Promise.all([import("next/headers"), import("next/navigation")]);
  const cookieStore = await cookies();
  cookieStore.delete(getAdminSessionCookieName("stc"));
  cookieStore.delete(getAdminSessionCookieName("otc"));
  cookieStore.delete(getAdminSessionCookieName("joogo"));
  cookieStore.delete(getAdminSessionCookieName("army"));
  cookieStore.delete(getAdminSessionCookieName("queensday"));
  redirect("/stc/login");
}
