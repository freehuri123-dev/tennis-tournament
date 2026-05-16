import { describe, expect, it } from "vitest";
import { generateInitialMatches, getHanulSeedCount, getHanulSeedSlots, validateScheduleParticipants } from "./schedule";
import type { Member } from "./types";

function makeMembers(count: number): Member[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `m${index + 1}`,
    name: `회원${index + 1}`,
    notes: ""
  }));
}

describe("generateInitialMatches", () => {
  it("KDK-V2010 이미지 표의 seed_no 대진을 사용한다", () => {
    const matches = generateInitialMatches({
      tournamentId: "t1",
      groupId: "g1",
      format: "kdk-v2010",
      participants: makeMembers(5)
    });

    expect(matches).toHaveLength(5);
    expect(matches[0].sideAPlayerIds).toEqual(["m1", "m4"]);
    expect(matches[0].sideBPlayerIds).toEqual(["m2", "m3"]);
    expect(matches[4].sideAPlayerIds).toEqual(["m2", "m5"]);
    expect(matches[4].sideBPlayerIds).toEqual(["m3", "m4"]);
  });

  it("한울AA방식 KDK 이미지 표의 A~G 표기를 10~16번 선수로 해석한다", () => {
    const matches = generateInitialMatches({
      tournamentId: "t1",
      groupId: "g1",
      format: "hanul-aa",
      participants: makeMembers(16)
    });

    expect(matches).toHaveLength(16);
    expect(matches[3].sideAPlayerIds).toEqual(["m13", "m14"]);
    expect(matches[3].sideBPlayerIds).toEqual(["m15", "m16"]);
    expect(matches[15].sideAPlayerIds).toEqual(["m7", "m15"]);
    expect(matches[15].sideBPlayerIds).toEqual(["m8", "m16"]);
  });

  it("한울AA는 별도 시드 선택 없이 순번의 시드 슬롯을 그대로 사용한다", () => {
    const matches = generateInitialMatches({
      tournamentId: "t1",
      groupId: "g1",
      format: "hanul-aa",
      participants: makeMembers(6),
      seedPlayerIds: ["m5", "m6"]
    });

    expect(getHanulSeedCount(6)).toBe(2);
    expect(getHanulSeedSlots(6)).toEqual(["1", "3"]);
    expect(matches[0].sideAPlayerIds).toEqual(["m1", "m2"]);
    expect(matches[0].sideBPlayerIds).toEqual(["m3", "m4"]);
  });

  it("한울AA 10명은 1, 8, A 순번을 자동 시드 슬롯으로 표시한다", () => {
    const matches = generateInitialMatches({
      tournamentId: "t1",
      groupId: "g1",
      format: "hanul-aa",
      participants: makeMembers(10)
    });

    expect(getHanulSeedSlots(10)).toEqual(["1", "8", "A"]);
    expect(matches[0].sideAPlayerIds).toEqual(["m1", "m2"]);
    expect(matches[0].sideBPlayerIds).toEqual(["m3", "m4"]);
  });

  it("지원하지 않는 인원수는 안내문구를 반환한다", () => {
    expect(validateScheduleParticipants("kdk-v2010", 4)).toContain("5~10명");
    expect(validateScheduleParticipants("hanul-aa", 17)).toContain("5~16명");
  });

  it("랜덤 방식은 4명으로도 모든 참가자가 최소 4경기를 하도록 대진을 만든다", () => {
    const matches = generateInitialMatches({
      tournamentId: "t1",
      groupId: "g1",
      format: "random",
      participants: makeMembers(4)
    });

    const playCounts = new Map(makeMembers(4).map((member) => [member.id, 0]));
    for (const match of matches) {
      expect(match.sideAPlayerIds).toHaveLength(2);
      expect(match.sideBPlayerIds).toHaveLength(2);
      for (const playerId of [...match.sideAPlayerIds, ...match.sideBPlayerIds]) {
        playCounts.set(playerId, (playCounts.get(playerId) ?? 0) + 1);
      }
    }

    expect(matches.length).toBeGreaterThanOrEqual(4);
    expect([...playCounts.values()].every((count) => count >= 4)).toBe(true);
  });
});
