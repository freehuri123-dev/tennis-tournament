import type { Match, Member, Tournament } from "./types";

export type MemberRecord = {
  memberId: string;
  name: string;
  tournamentCount: number;
  matchCount: number;
  wins: number;
  draws: number;
  losses: number;
  winRate: number;
  pointsFor: number;
  pointsAgainst: number;
  pointDiff: number;
  recentResults: Array<"win" | "draw" | "loss">;
  lastPlayedDate?: string;
};

export type PartnerRecord = {
  playerIds: [string, string];
  names: [string, string];
  matchCount: number;
  wins: number;
  winRate: number;
  pointDiff: number;
};

export type ClubRecords = {
  members: MemberRecord[];
  awards: {
    mvp?: MemberRecord;
    mostWins?: MemberRecord;
    highestWinRate?: MemberRecord;
    mostPointsFor?: MemberRecord;
    mostParticipations?: MemberRecord;
    bestPartner?: PartnerRecord;
    risingStar?: MemberRecord;
  };
  partnerRecords: PartnerRecord[];
};

type MutableMemberRecord = Omit<MemberRecord, "tournamentCount" | "winRate" | "pointDiff"> & {
  tournamentIds: Set<string>;
};

type MatchWithTournamentDate = Match & { tournamentDate?: string };

export function calculateClubRecords(members: Member[], tournaments: Tournament[], matches: Match[]): ClubRecords {
  const membersById = new Map(members.map((member) => [member.id, member]));
  const tournamentDateById = new Map(tournaments.map((tournament) => [tournament.id, tournament.date]));
  const records = new Map<string, MutableMemberRecord>();

  for (const member of members) {
    records.set(member.id, {
      memberId: member.id,
      name: member.name,
      tournamentIds: new Set(),
      matchCount: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      recentResults: [],
      lastPlayedDate: undefined
    });
  }

  const completedMatches = matches
    .filter((match) => match.status === "completed" && match.sideAScore !== null && match.sideBScore !== null)
    .map((match) => ({ ...match, tournamentDate: tournamentDateById.get(match.tournamentId) }))
    .sort(compareMatchDateDesc);

  const partnerRecords = new Map<string, Omit<PartnerRecord, "winRate">>();

  for (const match of completedMatches) {
    const sideAScore = match.sideAScore;
    const sideBScore = match.sideBScore;
    if (sideAScore === null || sideBScore === null) continue;

    const sideAResult = sideAScore === sideBScore ? "draw" : sideAScore > sideBScore ? "win" : "loss";
    const sideBResult = sideAScore === sideBScore ? "draw" : sideBScore > sideAScore ? "win" : "loss";

    applyMemberResult(records, match, match.sideAPlayerIds, sideAScore, sideBScore, sideAResult);
    applyMemberResult(records, match, match.sideBPlayerIds, sideBScore, sideAScore, sideBResult);
    applyPartnerResult(partnerRecords, membersById, match.sideAPlayerIds, sideAScore, sideBScore, sideAResult);
    applyPartnerResult(partnerRecords, membersById, match.sideBPlayerIds, sideBScore, sideAScore, sideBResult);
  }

  const memberRecords = [...records.values()]
    .map((record) => ({
      memberId: record.memberId,
      name: record.name,
      tournamentCount: record.tournamentIds.size,
      matchCount: record.matchCount,
      wins: record.wins,
      draws: record.draws,
      losses: record.losses,
      winRate: record.matchCount > 0 ? Math.round((record.wins / record.matchCount) * 1000) / 10 : 0,
      pointsFor: record.pointsFor,
      pointsAgainst: record.pointsAgainst,
      pointDiff: record.pointsFor - record.pointsAgainst,
      recentResults: record.recentResults.slice(0, 5),
      lastPlayedDate: record.lastPlayedDate
    }))
    .sort(compareMemberRecords);

  const partnerRecordRows = [...partnerRecords.values()]
    .map((record) => ({
      ...record,
      winRate: record.matchCount > 0 ? Math.round((record.wins / record.matchCount) * 1000) / 10 : 0
    }))
    .sort((a, b) => b.wins - a.wins || b.winRate - a.winRate || b.pointDiff - a.pointDiff || b.matchCount - a.matchCount);

  const activeMemberRecords = memberRecords.filter((record) => record.matchCount > 0);

  return {
    members: memberRecords,
    partnerRecords: partnerRecordRows,
    awards: {
      mvp: activeMemberRecords[0],
      mostWins: [...activeMemberRecords].sort((a, b) => b.wins - a.wins || compareMemberRecords(a, b))[0],
      highestWinRate: [...activeMemberRecords].filter((record) => record.matchCount >= 3).sort((a, b) => b.winRate - a.winRate || compareMemberRecords(a, b))[0],
      mostPointsFor: [...activeMemberRecords].sort((a, b) => b.pointsFor - a.pointsFor || compareMemberRecords(a, b))[0],
      mostParticipations: [...activeMemberRecords].sort((a, b) => b.tournamentCount - a.tournamentCount || compareMemberRecords(a, b))[0],
      bestPartner: partnerRecordRows.filter((record) => record.matchCount >= 2)[0] ?? partnerRecordRows[0],
      risingStar: [...activeMemberRecords].filter((record) => record.recentResults.length >= 3).sort(compareRisingStarRecords)[0]
    }
  };
}

function applyMemberResult(
  records: Map<string, MutableMemberRecord>,
  match: Match,
  playerIds: string[],
  pointsFor: number,
  pointsAgainst: number,
  result: "win" | "draw" | "loss"
) {
  for (const playerId of playerIds) {
    const record = records.get(playerId);
    if (!record) continue;

    record.tournamentIds.add(match.tournamentId);
    record.matchCount += 1;
    record.pointsFor += pointsFor;
    record.pointsAgainst += pointsAgainst;
    record.recentResults.push(result);
    record.lastPlayedDate = newerDate(record.lastPlayedDate, (match as MatchWithTournamentDate).tournamentDate);

    if (result === "win") record.wins += 1;
    else if (result === "draw") record.draws += 1;
    else record.losses += 1;
  }
}

function newerDate(left?: string, right?: string) {
  if (!right) return left;
  if (!left) return right;
  return right > left ? right : left;
}

function applyPartnerResult(
  records: Map<string, Omit<PartnerRecord, "winRate">>,
  membersById: Map<string, Member>,
  playerIds: string[],
  pointsFor: number,
  pointsAgainst: number,
  result: "win" | "draw" | "loss"
) {
  if (playerIds.length !== 2) return;

  const sortedIds = [...playerIds].sort() as [string, string];
  const key = sortedIds.join(":");
  const existing = records.get(key) ?? {
    playerIds: sortedIds,
    names: [membersById.get(sortedIds[0])?.name ?? "미정", membersById.get(sortedIds[1])?.name ?? "미정"],
    matchCount: 0,
    wins: 0,
    pointDiff: 0
  };

  existing.matchCount += 1;
  existing.pointDiff += pointsFor - pointsAgainst;
  if (result === "win") existing.wins += 1;
  records.set(key, existing);
}

function compareMatchDateDesc(left: MatchWithTournamentDate, right: MatchWithTournamentDate) {
  return (right.tournamentDate ?? "").localeCompare(left.tournamentDate ?? "") || right.sortOrder - left.sortOrder;
}

function compareMemberRecords(left: MemberRecord, right: MemberRecord) {
  return (
    right.wins - left.wins ||
    right.winRate - left.winRate ||
    right.pointDiff - left.pointDiff ||
    right.matchCount - left.matchCount ||
    left.name.localeCompare(right.name, "ko")
  );
}

function recentScore(record: MemberRecord) {
  return record.recentResults.reduce((score, result) => {
    if (result === "win") return score + 3;
    if (result === "draw") return score + 1;
    return score;
  }, 0);
}

function compareRisingStarRecords(left: MemberRecord, right: MemberRecord) {
  return (
    recentScore(right) - recentScore(left) ||
    right.recentResults.filter((result) => result === "win").length - left.recentResults.filter((result) => result === "win").length ||
    right.winRate - left.winRate ||
    right.pointDiff - left.pointDiff ||
    left.name.localeCompare(right.name, "ko")
  );
}
