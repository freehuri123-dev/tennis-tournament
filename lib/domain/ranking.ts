import type { Match, Member, RankingRow } from "./types";

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

  const sorted = [...rows.values()]
    .map((row) => ({ ...row, pointDiff: row.pointsFor - row.pointsAgainst }))
    .sort(compareRankingRows);

  let previous: MutableRanking | undefined;
  let previousRank = 0;

  return sorted.map((row, index) => {
    const rank = previous && sameRankingValue(row, previous) ? previousRank : index + 1;
    previous = row;
    previousRank = rank;
    return { ...row, rank };
  });
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
