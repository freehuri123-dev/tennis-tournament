import { withDateStatus } from "./tournament-status";
import type { Tournament } from "./types";

export type PublicAccessResult =
  | { type: "live"; tournament: Tournament }
  | { type: "deleted" };

export function createTournamentSlug(id: string) {
  const numericSeed = Number(id.replace(/\D/g, "").slice(-8) || Date.now());
  return String(1000 + (numericSeed % 9000));
}

export function getPublicTournamentAccess(slug: string, tournaments: Tournament[], deletedPublicSlugs: string[] = []): PublicAccessResult {
  if (deletedPublicSlugs.includes(slug)) return { type: "deleted" };

  const tournament = tournaments.map((item) => withDateStatus(item)).find((item) => item.publicSlug === slug);
  if (!tournament) return { type: "deleted" };
  return { type: "live", tournament };
}
