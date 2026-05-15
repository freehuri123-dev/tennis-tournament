import { describe, expect, it } from "vitest";
import { canAddTournamentGroup, filterGroupMembersByTournamentParticipants, updateTournamentParticipantSelection } from "./tournament-participants";
import type { TournamentGroup } from "./types";

const groups: TournamentGroup[] = [
  {
    id: "g1",
    tournamentId: "t1",
    name: "A조",
    scheduleFormat: "kdk-v2010",
    sortOrder: 1,
    seedPlayerIds: ["m1", "m3"]
  },
  {
    id: "g2",
    tournamentId: "t1",
    name: "B조",
    scheduleFormat: "hanul-aa",
    sortOrder: 2,
    seedPlayerIds: ["m4"]
  }
];

describe("filterGroupMembersByTournamentParticipants", () => {
  it("대회 참가자에서 빠진 회원은 그룹 배정에서도 제외하고 시드 선택을 초기화한다", () => {
    const result = filterGroupMembersByTournamentParticipants({
      participantIds: ["m1", "m2", "m4"],
      groups,
      groupMemberIds: {
        g1: ["m1", "m2", "m3"],
        g2: ["m4", "m5"]
      }
    });

    expect(result.groupMemberIds).toEqual({
      g1: ["m1", "m2"],
      g2: ["m4"]
    });
    expect(result.groups.map((group) => group.seedPlayerIds)).toEqual([[], []]);
  });
});

describe("updateTournamentParticipantSelection", () => {
  it("참가자를 제외하면 기존 대진표 초기화가 필요하다고 표시한다", () => {
    const result = updateTournamentParticipantSelection({
      currentParticipantIds: ["m1", "m2"],
      memberId: "m2"
    });

    expect(result.participantIds).toEqual(["m1"]);
    expect(result.removed).toBe(true);
  });

  it("참가자를 추가할 때는 대진표 초기화 표시를 하지 않는다", () => {
    const result = updateTournamentParticipantSelection({
      currentParticipantIds: ["m1"],
      memberId: "m2"
    });

    expect(result.participantIds).toEqual(["m1", "m2"]);
    expect(result.removed).toBe(false);
  });
});

describe("canAddTournamentGroup", () => {
  it("대회 참가자가 없으면 그룹을 추가할 수 없다", () => {
    expect(canAddTournamentGroup([])).toBe(false);
  });

  it("대회 참가자가 있으면 그룹을 추가할 수 있다", () => {
    expect(canAddTournamentGroup(["m1"])).toBe(true);
  });
});
