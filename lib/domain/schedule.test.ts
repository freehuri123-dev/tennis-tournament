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

function slotLabel(index: number) {
  return index < 9 ? String(index + 1) : String.fromCharCode(65 + index - 9);
}

function matchTemplates(count: number) {
  const members = makeMembers(count);
  const idToSlot = new Map(members.map((member, index) => [member.id, slotLabel(index)]));
  return generateInitialMatches({
    tournamentId: "t1",
    groupId: "g1",
    format: "hanul-aa",
    participants: members
  }).map((match) => {
    const sideA = match.sideAPlayerIds.map((id) => idToSlot.get(id)).join("");
    const sideB = match.sideBPlayerIds.map((id) => idToSlot.get(id)).join("");
    return `${sideA}:${sideB}`;
  });
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

  it("한울AA 대진표는 도움말 이미지의 인원별 게임 순서를 따른다", () => {
    expect(matchTemplates(5)).toEqual(["12:34", "13:25", "14:35", "15:24", "23:45"]);
    expect(matchTemplates(6)).toEqual(["12:34", "15:46", "23:56", "14:25", "24:36", "16:35"]);
    expect(matchTemplates(7)).toEqual(["12:34", "56:17", "35:24", "14:67", "23:57", "16:25", "46:37"]);
    expect(matchTemplates(8)).toEqual(["12:34", "56:78", "13:57", "24:68", "37:48", "15:26", "16:38", "25:47"]);
    expect(matchTemplates(9)).toEqual(["12:34", "56:78", "19:57", "23:68", "49:38", "15:26", "17:89", "36:45", "24:79"]);
    expect(matchTemplates(10)).toEqual(["12:34", "56:78", "23:6A", "19:58", "3A:45", "27:89", "4A:68", "13:79", "46:59", "17:2A"]);
    expect(matchTemplates(11)).toEqual(["12:34", "56:78", "1B:9A", "23:68", "4A:57", "26:9B", "13:5B", "49:8A", "17:28", "5A:6B", "39:47"]);
    expect(matchTemplates(12)).toEqual(["12:34", "56:78", "9A:BC", "37:48", "29:5A", "1B:6C", "13:57", "24:9B", "68:AC", "17:2B", "35:6A", "49:8C"]);
    expect(matchTemplates(13)).toEqual(["12:34", "56:78", "9A:BC", "1D:25", "37:4A", "68:9B", "CD:13", "26:5A", "47:8B", "9C:2D", "15:AB", "3C:67", "48:9D"]);
    expect(matchTemplates(14)).toEqual(["12:34", "56:78", "9A:BC", "DE:13", "24:57", "68:9B", "26:CD", "79:AE", "14:8B", "5E:6A", "3C:7B", "2D:89", "3E:45", "AC:1D"]);
    expect(matchTemplates(15)).toEqual(["12:34", "56:78", "9A:BC", "DE:1F", "23:57", "46:AB", "8D:9E", "4F:5C", "13:6B", "27:8A", "9C:5E", "36:DF", "1B:8C", "47:EF", "2A:9D"]);
    expect(matchTemplates(16)).toEqual(["12:34", "56:78", "9A:BC", "DE:FG", "13:57", "24:68", "9B:DF", "AC:EG", "15:9D", "37:BF", "26:AE", "48:CG", "19:2A", "5D:6E", "3B:4C", "7F:8G"]);
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
