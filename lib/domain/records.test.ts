import { describe, expect, it } from "vitest";
import { calculateClubRecords } from "./records";
import type { Match, Member, Tournament } from "./types";

const members: Member[] = [
  { id: "m1", name: "김철수", gender: "male", notes: "" },
  { id: "m2", name: "박영희", gender: "female", notes: "" },
  { id: "m3", name: "이민수", gender: "male", notes: "" },
  { id: "m4", name: "최지은", gender: "female", notes: "" }
];

const tournaments: Tournament[] = [
  { id: "t1", name: "6월 대회", date: "2026-06-10", publicSlug: "1111", status: "completed" },
  { id: "t2", name: "5월 대회", date: "2026-05-10", publicSlug: "2222", status: "completed" }
];

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
    tournamentId: "t2",
    groupId: "g1",
    matchNumber: 2,
    sideAPlayerIds: ["m1", "m3"],
    sideBPlayerIds: ["m2", "m4"],
    sideAScore: 2,
    sideBScore: 6,
    status: "completed",
    sortOrder: 2
  }
];

const risingMatches: Match[] = [
  ...matches,
  {
    id: "match-3",
    tournamentId: "t1",
    groupId: "g1",
    matchNumber: 3,
    sideAPlayerIds: ["m1", "m2"],
    sideBPlayerIds: ["m3", "m4"],
    sideAScore: 6,
    sideBScore: 2,
    status: "completed",
    sortOrder: 3
  },
  {
    id: "match-4",
    tournamentId: "t1",
    groupId: "g1",
    matchNumber: 4,
    sideAPlayerIds: ["m1", "m4"],
    sideBPlayerIds: ["m2", "m3"],
    sideAScore: 6,
    sideBScore: 1,
    status: "completed",
    sortOrder: 4
  }
];

describe("calculateClubRecords", () => {
  it("calculates member records from completed matches", () => {
    const records = calculateClubRecords(members, tournaments, matches);
    const kim = records.members.find((record) => record.memberId === "m1");

    expect(kim).toMatchObject({
      matchCount: 2,
      wins: 1,
      losses: 1,
      winRate: 50,
      pointsFor: 8,
      pointsAgainst: 9,
      pointDiff: -1,
      tournamentCount: 2,
      lastPlayedDate: "2026-06-10"
    });
  });

  it("calculates partner records", () => {
    const records = calculateClubRecords(members, tournaments, matches);

    expect(records.partnerRecords[0]).toMatchObject({
      matchCount: 1,
      wins: 1,
      winRate: 100
    });
  });

  it("does not assign awards when there are no completed matches", () => {
    const records = calculateClubRecords(members, tournaments, []);

    expect(records.awards.mvp).toBeUndefined();
    expect(records.awards.mostWins).toBeUndefined();
    expect(records.partnerRecords).toHaveLength(0);
  });

  it("selects a rising star from recent results", () => {
    const records = calculateClubRecords(members, tournaments, risingMatches);

    expect(records.awards.risingStar?.memberId).toBe("m1");
  });
});
