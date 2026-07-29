import { describe, expect, it } from "vitest";
import { calculateFixedPairRankings, calculateRankings } from "./ranking";
import type { Match, Member } from "./types";

const members: Member[] = [
  { id: "m1", name: "김철수", notes: "" },
  { id: "m2", name: "박영희", notes: "" },
  { id: "m3", name: "이민수", notes: "" },
  { id: "m4", name: "최은정", notes: "" }
];

describe("calculateRankings", () => {
  it("승점, 승수, 득실차, 득점, 실점 순서로 순위를 계산한다", () => {
    const matches: Match[] = [
      {
        id: "match-1",
        tournamentId: "t1",
        groupId: "g1",
        matchNumber: 1,
        sideAPlayerIds: ["m1", "m2"],
        sideBPlayerIds: ["m3", "m4"],
        sideAScore: 6,
        sideBScore: 3,
        status: "completed",
        sortOrder: 1
      },
      {
        id: "match-2",
        tournamentId: "t1",
        groupId: "g1",
        matchNumber: 2,
        sideAPlayerIds: ["m1", "m3"],
        sideBPlayerIds: ["m2", "m4"],
        sideAScore: 4,
        sideBScore: 4,
        status: "completed",
        sortOrder: 2
      }
    ];

    expect(calculateRankings(members, matches)).toEqual([
      { memberId: "m1", name: "김철수", rank: 1, wins: 1, draws: 1, losses: 0, rankingPoints: 4, pointsFor: 10, pointsAgainst: 7, pointDiff: 3 },
      { memberId: "m2", name: "박영희", rank: 1, wins: 1, draws: 1, losses: 0, rankingPoints: 4, pointsFor: 10, pointsAgainst: 7, pointDiff: 3 },
      { memberId: "m3", name: "이민수", rank: 3, wins: 0, draws: 1, losses: 1, rankingPoints: 1, pointsFor: 7, pointsAgainst: 10, pointDiff: -3 },
      { memberId: "m4", name: "최은정", rank: 3, wins: 0, draws: 1, losses: 1, rankingPoints: 1, pointsFor: 7, pointsAgainst: 10, pointDiff: -3 }
    ]);
  });

  it("미완료 경기는 순위 계산에서 제외한다", () => {
    const matches: Match[] = [
      {
        id: "match-1",
        tournamentId: "t1",
        groupId: "g1",
        matchNumber: 1,
        sideAPlayerIds: ["m1"],
        sideBPlayerIds: ["m2"],
        sideAScore: null,
        sideBScore: null,
        status: "scheduled",
        sortOrder: 1
      }
    ];

    expect(calculateRankings(members.slice(0, 2), matches)).toEqual([
      { memberId: "m1", name: "김철수", rank: 1, wins: 0, draws: 0, losses: 0, rankingPoints: 0, pointsFor: 0, pointsAgainst: 0, pointDiff: 0 },
      { memberId: "m2", name: "박영희", rank: 1, wins: 0, draws: 0, losses: 0, rankingPoints: 0, pointsFor: 0, pointsAgainst: 0, pointDiff: 0 }
    ]);
  });
});

describe("calculateFixedPairRankings head-to-head", () => {
  const pairMembers: Member[] = Array.from({ length: 8 }, (_, index) => ({ id: `p${index + 1}`, name: `선수 ${index + 1}`, notes: "" }));

  function completedMatch(id: string, sideAPlayerIds: string[], sideBPlayerIds: string[], sideAScore: number, sideBScore: number): Match {
    const order = Number(id.replace(/\D/g, ""));
    return { id, tournamentId: "t1", groupId: "g1", matchNumber: order, sideAPlayerIds, sideBPlayerIds, sideAScore, sideBScore, status: "completed", sortOrder: order };
  }

  it("uses the direct match when exactly two teams have the same win count", () => {
    const matches = [
      completedMatch("match-1", ["p3", "p4"], ["p1", "p2"], 6, 5),
      completedMatch("match-2", ["p1", "p2"], ["p5", "p6"], 6, 0),
      completedMatch("match-3", ["p1", "p2"], ["p7", "p8"], 6, 0),
      completedMatch("match-4", ["p3", "p4"], ["p5", "p6"], 6, 4),
      completedMatch("match-5", ["p7", "p8"], ["p3", "p4"], 6, 0)
    ];
    const rows = calculateFixedPairRankings(pairMembers, matches);

    expect(rows.slice(0, 2).map((row) => row.memberIds)).toEqual([["p3", "p4"], ["p1", "p2"]]);
    expect(rows.slice(0, 2).map((row) => row.wins)).toEqual([2, 2]);
    expect(rows.slice(0, 2).map((row) => row.rank)).toEqual([1, 2]);
  });

  it("uses game differential instead of pairwise results for a three-team win tie", () => {
    const matches = [
      completedMatch("match-1", ["p1", "p2"], ["p3", "p4"], 6, 0),
      completedMatch("match-2", ["p5", "p6"], ["p1", "p2"], 6, 0),
      completedMatch("match-3", ["p3", "p4"], ["p5", "p6"], 6, 4)
    ];
    const rows = calculateFixedPairRankings(pairMembers.slice(0, 6), matches);

    expect(rows.map((row) => row.memberIds)).toEqual([["p5", "p6"], ["p1", "p2"], ["p3", "p4"]]);
    expect(rows.map((row) => row.pointDiff)).toEqual([4, 0, -4]);
  });
});
