import { withDateStatus } from "./tournament-status";
import type { Tournament } from "./types";

export type PublicAccessResult =
  | { type: "live"; tournament: Tournament }
  | { type: "completed"; tournament: Tournament }
  | { type: "deleted" };

export function createTournamentSlug(id: string) {
  return `tournament-${id.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()}`;
}

export function getPublicTournamentAccess(slug: string, tournaments: Tournament[], deletedPublicSlugs: string[] = []): PublicAccessResult {
  if (deletedPublicSlugs.includes(slug)) return { type: "deleted" };

  const tournament = tournaments.map((item) => withDateStatus(item)).find((item) => item.publicSlug === slug);
  if (!tournament) return { type: "deleted" };
  if (tournament.status === "completed") return { type: "completed", tournament };
  return { type: "live", tournament };
}
