import { describe, expect, it } from "vitest";
import { generateInitialMatches, getHanulSeedCount, validateScheduleParticipants } from "./schedule";
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

  it("한울AA 선택 시드는 인원수별 시드 슬롯에 먼저 배정한다", () => {
    const matches = generateInitialMatches({
      tournamentId: "t1",
      groupId: "g1",
      format: "hanul-aa",
      participants: makeMembers(6),
      seedPlayerIds: ["m5", "m6"]
    });

    expect(getHanulSeedCount(6)).toBe(2);
    expect(matches[0].sideAPlayerIds).toEqual(["m5", "m1"]);
    expect(matches[0].sideBPlayerIds).toEqual(["m6", "m2"]);
  });

  it("지원하지 않는 인원수는 안내문구를 반환한다", () => {
    expect(validateScheduleParticipants("kdk-v2010", 4)).toContain("5~10명");
    expect(validateScheduleParticipants("hanul-aa", 17)).toContain("5~16명");
  });
});
