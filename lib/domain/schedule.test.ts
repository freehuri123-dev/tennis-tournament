import { describe, expect, it } from "vitest";
import { generateInitialMatches, validateScheduleParticipants } from "./schedule";
import type { Member } from "./types";

const participants: Member[] = Array.from({ length: 6 }, (_, index) => ({
  id: `m${index + 1}`,
  name: `회원${index + 1}`,
  notes: ""
}));

describe("generateInitialMatches", () => {
  it("KDK-V2010 방식으로 수정 가능한 경기 목록을 만든다", () => {
    const matches = generateInitialMatches({
      tournamentId: "t1",
      groupId: "g1",
      format: "kdk-v2010",
      participants
    });

    expect(matches.length).toBe(6);
    expect(matches.every((match) => new Set([...match.sideAPlayerIds, ...match.sideBPlayerIds]).size === 4)).toBe(true);
  });

  it("한울AA 방식으로 수정 가능한 경기 목록을 만든다", () => {
    const matches = generateInitialMatches({
      tournamentId: "t1",
      groupId: "g1",
      format: "hanul-aa",
      participants
    });

    expect(matches.length).toBe(6);
    expect(matches[0].sideAPlayerIds.length).toBe(2);
    expect(matches[0].sideBPlayerIds.length).toBe(2);
  });

  it("지원하지 않는 인원수는 안내문구를 반환한다", () => {
    expect(validateScheduleParticipants("kdk-v2010", 4)).toContain("5~10명");
    expect(validateScheduleParticipants("hanul-aa", 17)).toContain("5~16명");
  });
});
