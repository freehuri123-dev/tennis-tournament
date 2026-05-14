import { describe, expect, it } from "vitest";
import { generateInitialMatches } from "./schedule";
import type { Member } from "./types";

const participants: Member[] = Array.from({ length: 6 }, (_, index) => ({
  id: `m${index + 1}`,
  name: `회원${index + 1}`,
  level: "B",
  notes: ""
}));

describe("generateInitialMatches", () => {
  it("한울AA 방식으로 수정 가능한 경기 목록을 만든다", () => {
    const matches = generateInitialMatches({
      tournamentId: "t1",
      groupId: "g1",
      format: "hanul-aa",
      participants
    });

    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0]).toMatchObject({
      tournamentId: "t1",
      groupId: "g1",
      matchNumber: 1,
      sideAScore: null,
      sideBScore: null,
      status: "scheduled",
      sortOrder: 1
    });
    expect(matches[0].sideAPlayerIds.length).toBe(2);
    expect(matches[0].sideBPlayerIds.length).toBe(2);
  });

  it("KDK-V2010 방식으로 수정 가능한 경기 목록을 만든다", () => {
    const matches = generateInitialMatches({
      tournamentId: "t1",
      groupId: "g1",
      format: "kdk-v2010",
      participants
    });

    expect(matches.length).toBeGreaterThan(0);
    expect(matches.every((match) => match.status === "scheduled")).toBe(true);
  });
});
