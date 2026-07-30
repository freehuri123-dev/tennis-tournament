"use client";

import { usePathname } from "next/navigation";
import { isKnownClubSlug, type ClubSlug } from "@/lib/domain/club";
import { SplashScreen } from "./SplashScreen";

function clubSlugFromPath(pathname: string): ClubSlug | null {
  const segments = pathname.split("/").filter(Boolean);
  if (segments[0] === "admin") return "stc";

  const candidate = segments[0] === "public" ? segments[1] : segments[0];
  return candidate && isKnownClubSlug(candidate) ? candidate : null;
}

export function RouteSplashScreen() {
  const pathname = usePathname();
  const clubSlug = clubSlugFromPath(pathname);
  if (!clubSlug || pathname.endsWith("/tv")) return null;

  return (
    <SplashScreen
      clubSlug={clubSlug}
      startLabel={pathname.startsWith("/public/") ? "대진표 확인하기" : undefined}
    />
  );
}
