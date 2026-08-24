import type { Match, Member, RankingRow, TeamRankingRow } from "./types";

type MutableRanking = Omit<RankingRow, "rank">;

export function calculateRankings(members: Member[], matches: Match[]): RankingRow[] {
  const rows = new Map<string, MutableRanking>();

  for (const member of members) {
    rows.set(member.id, {
      memberId: member.id,
      name: member.name,
      wins: 0,
      draws: 0,
      losses: 0,
      rankingPoints: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      pointDiff: 0
    });
  }

  for (const match of matches) {
    if (match.status !== "completed" || match.sideAScore === null || match.sideBScore === null) {
      continue;
    }

    const sideAResult = match.sideAScore === match.sideBScore ? "draw" : match.sideAScore > match.sideBScore ? "win" : "loss";
    const sideBResult = match.sideAScore === match.sideBScore ? "draw" : match.sideBScore > match.sideAScore ? "win" : "loss";

    applyResult(rows, match.sideAPlayerIds, match.sideAScore, match.sideBScore, sideAResult);
    applyResult(rows, match.sideBPlayerIds, match.sideBScore, match.sideAScore, sideBResult);
  }

  return rankRankingRows(
    [...rows.values()].map((row) => ({ ...row, pointDiff: row.pointsFor - row.pointsAgainst }))
  );
}

function applyResult(
  rows: Map<string, MutableRanking>,
  playerIds: string[],
  pointsFor: number,
  pointsAgainst: number,
  result: "win" | "draw" | "loss"
) {
  for (const playerId of playerIds) {
    const row = rows.get(playerId);
    if (!row) continue;

    row.pointsFor += pointsFor;
    row.pointsAgainst += pointsAgainst;

    if (result === "win") {
      row.wins += 1;
      row.rankingPoints += 3;
    } else if (result === "draw") {
      row.draws += 1;
      row.rankingPoints += 1;
    } else {
      row.losses += 1;
    }
  }
}

function compareRankingRows(a: MutableRanking, b: MutableRanking) {
  return (
    b.rankingPoints - a.rankingPoints ||
    b.wins - a.wins ||
    b.pointDiff - a.pointDiff ||
    b.pointsFor - a.pointsFor ||
    a.pointsAgainst - b.pointsAgainst ||
    a.name.localeCompare(b.name, "ko")
  );
}

function sameRankingValue(a: MutableRanking, b: MutableRanking) {
  return (
    a.rankingPoints === b.rankingPoints &&
    a.wins === b.wins &&
    a.pointDiff === b.pointDiff &&
    a.pointsFor === b.pointsFor &&
    a.pointsAgainst === b.pointsAgainst
  );
}

export function rankRankingRows<T extends MutableRanking>(rows: T[]): Array<T & { rank: number }> {
  const sortedRows = [...rows].sort(compareRankingRows);
  let previous: MutableRanking | undefined;
  let previousRank = 0;

  return sortedRows.map((row, index) => {
    const rank = previous && sameRankingValue(row, previous) ? previousRank : index + 1;
    previous = row;
    previousRank = rank;
    return { ...row, rank };
  });
}

type MutableTeamRanking = Omit<TeamRankingRow, "rank">;

export function calculateFixedPairRankings(members: Member[], matches: Match[]): TeamRankingRow[] {
  const rows = new Map<string, MutableTeamRanking>();

  for (let index = 0; index < members.length; index += 2) {
    const pair = members.slice(index, index + 2);
    if (pair.length !== 2) continue;
    const memberIds = pair.map((member) => member.id);
    const teamId = fixedPairId(memberIds);
    rows.set(teamId, {
      teamId,
      memberIds,
      name: pair.map((member) => member.name).join(" · "),
      matchesPlayed: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      pointDiff: 0
    });
  }

  for (const match of matches) {
    if (match.status !== "completed" || match.sideAScore === null || match.sideBScore === null) continue;
    const sideA = rows.get(fixedPairId(match.sideAPlayerIds));
    const sideB = rows.get(fixedPairId(match.sideBPlayerIds));
    if (!sideA || !sideB) continue;

    applyTeamResult(sideA, match.sideAScore, match.sideBScore);
    applyTeamResult(sideB, match.sideBScore, match.sideAScore);
  }

  const buckets = new Map<number, MutableTeamRanking[]>();
  for (const row of rows.values()) {
    row.pointDiff = row.pointsFor - row.pointsAgainst;
    const bucket = buckets.get(row.wins) ?? [];
    bucket.push(row);
    buckets.set(row.wins, bucket);
  }

  const ranked: TeamRankingRow[] = [];
  for (const wins of [...buckets.keys()].sort((a, b) => b - a)) {
    const bucket = buckets.get(wins) ?? [];
    bucket.sort(compareTeamRankingRows);
    const headToHeadWinner = bucket.length === 2 ? findHeadToHeadWinner(bucket[0], bucket[1], matches) : null;
    if (headToHeadWinner && bucket[1].teamId === headToHeadWinner) bucket.reverse();

    for (let index = 0; index < bucket.length; index += 1) {
      const row = bucket[index];
      const previous = bucket[index - 1];
      const hasHeadToHeadOrder = Boolean(headToHeadWinner && index <= 1);
      const rank = previous && !hasHeadToHeadOrder && sameTeamRankingValue(row, previous)
        ? ranked[ranked.length - 1].rank
        : ranked.length + 1;
      ranked.push({ ...row, rank });
    }
  }

  return ranked;
}

function fixedPairId(memberIds: string[]) {
  return [...memberIds].sort().join(":");
}

function applyTeamResult(row: MutableTeamRanking, pointsFor: number, pointsAgainst: number) {
  row.matchesPlayed += 1;
  row.pointsFor += pointsFor;
  row.pointsAgainst += pointsAgainst;
  if (pointsFor > pointsAgainst) row.wins += 1;
  else if (pointsFor < pointsAgainst) row.losses += 1;
  else row.draws += 1;
}

function findHeadToHeadWinner(left: MutableTeamRanking, right: MutableTeamRanking, matches: Match[]) {
  const match = matches.find((item) => {
    if (item.status !== "completed" || item.sideAScore === null || item.sideBScore === null) return false;
    const sideAId = fixedPairId(item.sideAPlayerIds);
    const sideBId = fixedPairId(item.sideBPlayerIds);
    return (sideAId === left.teamId && sideBId === right.teamId) || (sideAId === right.teamId && sideBId === left.teamId);
  });
  if (!match || match.sideAScore === match.sideBScore) return null;
  return match.sideAScore! > match.sideBScore! ? fixedPairId(match.sideAPlayerIds) : fixedPairId(match.sideBPlayerIds);
}

function compareTeamRankingRows(a: MutableTeamRanking, b: MutableTeamRanking) {
  return (
    b.pointDiff - a.pointDiff ||
    b.pointsFor - a.pointsFor ||
    a.pointsAgainst - b.pointsAgainst ||
    a.name.localeCompare(b.name, "ko")
  );
}

function sameTeamRankingValue(a: MutableTeamRanking, b: MutableTeamRanking) {
  return (
    a.wins === b.wins &&
    a.pointDiff === b.pointDiff &&
    a.pointsFor === b.pointsFor &&
    a.pointsAgainst === b.pointsAgainst
  );
}
