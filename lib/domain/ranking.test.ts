import { describe, expect, it } from "vitest";
import { calculateRankings } from "./ranking";
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
