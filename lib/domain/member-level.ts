import type { ClubSlug } from "./club";
import { normalizeTeamGrade } from "./team-battle";

export const PLAY_TENNIS_LEVELS = ["7", "6", "5", "4", "3", "2", "1"] as const;

export function getMemberLevelLabel(level: string | undefined, clubSlug: ClubSlug): string {
  const normalized = level?.trim() ?? "";
  if (clubSlug === "pt") {
    return PLAY_TENNIS_LEVELS.includes(normalized as (typeof PLAY_TENNIS_LEVELS)[number]) ? normalized : "4";
  }
  return normalizeTeamGrade(level);
}
