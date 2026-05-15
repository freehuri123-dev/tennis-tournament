import { NextResponse, type NextRequest } from "next/server";

const COOKIE_NAME = "tennis-admin-session";
const SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7;

function base64Url(bytes: ArrayBuffer) {
  const binary = String.fromCharCode(...new Uint8Array(bytes));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function signValue(issuedAt: string, secret: string) {
  const data = new TextEncoder().encode(`${issuedAt}.${secret}`);
  return base64Url(await crypto.subtle.digest("SHA-256", data));
}

async function verifyAdminSession(value: string | undefined, secret: string | undefined) {
  if (!value || !secret) return false;
  const parts = value.split(".");
  if (parts.length !== 2) return false;

  const [issuedAt, signature] = parts;
  const issuedAtMs = Number(issuedAt);
  if (!issuedAt || !signature || !Number.isFinite(issuedAtMs)) return false;
  if (Date.now() - issuedAtMs > SESSION_MAX_AGE_MS) return false;

  return signature === (await signValue(issuedAt, secret));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith("/admin") || pathname.startsWith("/admin/login")) {
    return NextResponse.next();
  }

  const valid = await verifyAdminSession(request.cookies.get(COOKIE_NAME)?.value, process.env.SESSION_SECRET);
  if (valid) return NextResponse.next();

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/admin/login";
  loginUrl.search = "";
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/admin/:path*"]
};
