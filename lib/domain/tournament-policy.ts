import type { Member, Tournament } from "./types";

export function isScheduleLocked(tournament: Tournament) {
  return tournament.scheduleLocked === true;
}

export function rankingMembersForTournament(tournament: Tournament, members: Member[]) {
  const excluded = new Set(tournament.rankingExcludedMemberIds ?? []);
  return members.filter((member) => !excluded.has(member.id));
}

export function isIncludedInClubRecords(tournament: Tournament) {
  return tournament.includeInClubRecords !== false;
}
