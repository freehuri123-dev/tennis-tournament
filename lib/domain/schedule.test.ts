import { describe, expect, it } from "vitest";
import { applyTournamentAdvancement, generateInitialMatches, getHanulSeedCount, getHanulSeedSlots, getTournamentByeSelectionOptions, getTournamentRoundLabel, selectTournamentBye, validateScheduleParticipants } from "./schedule";
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
  it("assigns optional court numbers in generated match order", () => {
    const matches = generateInitialMatches({
      tournamentId: "t1",
      groupId: "g1",
      format: "kdk-v2010",
      participants: makeMembers(5),
      courtNumbers: ["4", "5", "6"]
    });

    expect(matches.map((match) => match.courtNumber)).toEqual(["4", "5", "6", "4", "5"]);
  });

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

  it("복식 토너먼트는 순번대로 붙이고 마지막 홀수 페어만 BYE로 올린다", () => {
    const matches = generateInitialMatches({
      tournamentId: "t1",
      groupId: "g1",
      format: "fixed-pair-tournament",
      participants: makeMembers(10)
    });

    expect(matches).toHaveLength(6);
    expect(matches[0].sideAPlayerIds).toEqual(["m1", "m2"]);
    expect(matches[0].sideBPlayerIds).toEqual(["m3", "m4"]);
    expect(matches[1].sideAPlayerIds).toEqual(["m5", "m6"]);
    expect(matches[1].sideBPlayerIds).toEqual(["m7", "m8"]);
    expect(matches[2].sideAPlayerIds).toEqual(["m9", "m10"]);
    expect(matches[2].sideBPlayerIds).toEqual([]);
    expect(matches[3].sideAPlayerIds).toEqual([]);
    expect(matches[3].sideBPlayerIds).toEqual([]);
    expect(matches[4].sideAPlayerIds).toEqual([]);
    expect(matches[4].sideBPlayerIds).toEqual(["m9", "m10"]);
    expect(matches[5].sideAPlayerIds).toEqual([]);
    expect(matches[5].sideBPlayerIds).toEqual([]);
  });

  it("복식 토너먼트는 5페어일 때 이전 경기 승자 중 부전승 팀을 선택할 때까지 다음 라운드를 비워둔다", () => {
    const matches = generateInitialMatches({
      tournamentId: "t1",
      groupId: "g1",
      format: "fixed-pair-tournament",
      participants: makeMembers(10)
    });
    const scored = matches.map((match) => {
      if (match.sortOrder === 1) return { ...match, sideAScore: 6, sideBScore: 3, status: "completed" as const };
      if (match.sortOrder === 2) return { ...match, sideAScore: 6, sideBScore: 4, status: "completed" as const };
      return match;
    });

    const advanced = applyTournamentAdvancement(scored, "g1");

    expect(advanced[3].sideAPlayerIds).toEqual([]);
    expect(advanced[3].sideBPlayerIds).toEqual([]);
    expect(advanced[4].sideAPlayerIds).toEqual([]);
    expect(advanced[4].sideBPlayerIds).toEqual(["m9", "m10"]);
    expect(advanced[5].sideAPlayerIds).toEqual([]);
    expect(advanced[5].sideBPlayerIds).toEqual([]);
  });

  it("복식 토너먼트는 이전 경기 승자 중 선택한 팀만 다음 라운드 BYE를 받게 한다", () => {
    const matches = generateInitialMatches({
      tournamentId: "t1",
      groupId: "g1",
      format: "fixed-pair-tournament",
      participants: makeMembers(10)
    });
    const scored = applyTournamentAdvancement(matches.map((match) => {
      if (match.sortOrder === 1) return { ...match, sideAScore: 6, sideBScore: 3, status: "completed" as const };
      if (match.sortOrder === 2) return { ...match, sideAScore: 6, sideBScore: 4, status: "completed" as const };
      return match;
    }), "g1");

    const options = getTournamentByeSelectionOptions(scored, "g1");
    const selected = selectTournamentBye(scored, "g1", options[0].roundIndex, "g1-match-2");

    expect(options[0].options.map((option) => option.sourceMatchId)).toEqual(["g1-match-1", "g1-match-2"]);
    expect(selected[3].sideAPlayerIds).toEqual(["m5", "m6"]);
    expect(selected[3].sideBPlayerIds).toEqual([]);
    expect(selected[4].sideAPlayerIds).toEqual(["m1", "m2"]);
    expect(selected[4].sideBPlayerIds).toEqual(["m9", "m10"]);
    expect(selected[5].sideAPlayerIds).toEqual(["m5", "m6"]);
    expect(selected[5].sideBPlayerIds).toEqual([]);
  });

  it("복식 토너먼트는 9페어일 때 라운드마다 직전 BYE 팀을 제외하고 부전승 후보를 만든다", () => {
    const matches = generateInitialMatches({
      tournamentId: "t1",
      groupId: "g1",
      format: "fixed-pair-tournament",
      participants: makeMembers(18)
    });
    const firstRoundScored = applyTournamentAdvancement(matches.map((match) => {
      if (match.sortOrder >= 1 && match.sortOrder <= 4) return { ...match, sideAScore: 6, sideBScore: 3, status: "completed" as const };
      return match;
    }), "g1");
    const firstOptions = getTournamentByeSelectionOptions(firstRoundScored, "g1");
    const firstSelected = selectTournamentBye(firstRoundScored, "g1", firstOptions[0].roundIndex, "g1-match-4");
    const secondRoundScored = applyTournamentAdvancement(firstSelected.map((match) => {
      if (match.sortOrder === 6 || match.sortOrder === 8) return { ...match, sideAScore: 6, sideBScore: 3, status: "completed" as const };
      return match;
    }), "g1");

    const secondOptions = getTournamentByeSelectionOptions(secondRoundScored, "g1");
    const semiByeOptions = secondOptions.find((option) => option.roundIndex === 1);

    expect(firstOptions[0].options.map((option) => option.sourceMatchId)).toEqual(["g1-match-3", "g1-match-4"]);
    expect(semiByeOptions?.options.map((option) => option.sourceMatchId)).toEqual(["g1-match-6", "g1-match-8"]);
    expect(semiByeOptions?.options.map((option) => option.teamIds)).not.toContainEqual(["m13", "m14"]);
    expect(secondRoundScored[8].sideAPlayerIds).toEqual(["m13", "m14"]);
    expect(secondRoundScored[9].sideAPlayerIds).toEqual([]);
  });

  it("복식 토너먼트는 16강 BYE 팀을 준결승에 미리 표시하지 않는다", () => {
    const matches = generateInitialMatches({
      tournamentId: "t1",
      groupId: "g1",
      format: "fixed-pair-tournament",
      participants: makeMembers(18)
    });

    expect(matches[4].sideAPlayerIds).toEqual(["m17", "m18"]);
    expect(matches[4].sideBPlayerIds).toEqual([]);
    expect(matches[7].sideBPlayerIds).toEqual(["m17", "m18"]);
    expect(matches[9].sideAPlayerIds).toEqual([]);
    expect(matches[9].sideBPlayerIds).toEqual([]);
  });

  it("복식 토너먼트는 선택된 16강 부전승 팀을 8강 승자로 준결승에 올린다", () => {
    const matches = generateInitialMatches({
      tournamentId: "t1",
      groupId: "g1",
      format: "fixed-pair-tournament",
      participants: makeMembers(18)
    });
    const firstRoundScored = applyTournamentAdvancement(matches.map((match) => {
      if (match.sortOrder >= 1 && match.sortOrder <= 4) return { ...match, sideAScore: 6, sideBScore: 3, status: "completed" as const };
      return match;
    }), "g1");
    const firstOptions = getTournamentByeSelectionOptions(firstRoundScored, "g1");
    const firstSelected = selectTournamentBye(firstRoundScored, "g1", firstOptions[0].roundIndex, "g1-match-4");

    expect(firstSelected[6].sideAPlayerIds).toEqual(["m13", "m14"]);
    expect(firstSelected[6].sideBPlayerIds).toEqual([]);
    expect(firstSelected[7].sideAPlayerIds).toEqual(["m9", "m10"]);
    expect(firstSelected[7].sideBPlayerIds).toEqual(["m17", "m18"]);
    expect(firstSelected[8].sideAPlayerIds).toEqual(["m13", "m14"]);
    expect(firstSelected[9].sideAPlayerIds).toEqual([]);
    expect(firstSelected[9].sideBPlayerIds).toEqual([]);
  });

  it("복식 토너먼트는 이전 계산에서 남은 결승 진출 표시를 재계산 때 제거한다", () => {
    const matches = generateInitialMatches({
      tournamentId: "t1",
      groupId: "g1",
      format: "fixed-pair-tournament",
      participants: makeMembers(18)
    });
    const firstRoundScored = applyTournamentAdvancement(matches.map((match) => {
      if (match.sortOrder >= 1 && match.sortOrder <= 4) return { ...match, sideAScore: 6, sideBScore: 3, status: "completed" as const };
      return match;
    }), "g1");
    const firstOptions = getTournamentByeSelectionOptions(firstRoundScored, "g1");
    const firstSelected = selectTournamentBye(firstRoundScored, "g1", firstOptions[0].roundIndex, "g1-match-4");
    const staleFinal = firstSelected.map((match) => (
      match.sortOrder === 11 ? { ...match, sideAPlayerIds: ["m13", "m14"] } : match
    ));

    const recalculated = applyTournamentAdvancement(staleFinal, "g1");

    expect(recalculated[10].sideAPlayerIds).toEqual([]);
    expect(recalculated[10].sideBPlayerIds).toEqual([]);
  });

  it("복식 토너먼트는 준결승에서 선택한 부전승 팀을 결승으로 올린다", () => {
    const matches = generateInitialMatches({
      tournamentId: "t1",
      groupId: "g1",
      format: "fixed-pair-tournament",
      participants: makeMembers(18)
    });
    const firstRoundScored = applyTournamentAdvancement(matches.map((match) => {
      if (match.sortOrder >= 1 && match.sortOrder <= 4) return { ...match, sideAScore: 6, sideBScore: 3, status: "completed" as const };
      return match;
    }), "g1");
    const firstOptions = getTournamentByeSelectionOptions(firstRoundScored, "g1");
    const firstSelected = selectTournamentBye(firstRoundScored, "g1", firstOptions[0].roundIndex, "g1-match-4");
    const secondRoundScored = applyTournamentAdvancement(firstSelected.map((match) => {
      if (match.sortOrder === 6 || match.sortOrder === 8) return { ...match, sideAScore: 6, sideBScore: 3, status: "completed" as const };
      return match;
    }), "g1");
    const semiOptions = getTournamentByeSelectionOptions(secondRoundScored, "g1").find((option) => option.roundIndex === 1);

    const semiSelected = selectTournamentBye(secondRoundScored, "g1", semiOptions!.roundIndex, "g1-match-6");

    expect(semiSelected[8].sideAPlayerIds).toEqual(["m1", "m2"]);
    expect(semiSelected[10].sideAPlayerIds).toEqual(["m1", "m2"]);
    expect(semiSelected[10].sideBPlayerIds).toEqual([]);
  });

  it("복식 토너먼트는 부전승 선택 후 남은 두 팀의 경기 승자를 다음 라운드로 올린다", () => {
    const matches = generateInitialMatches({
      tournamentId: "t1",
      groupId: "g1",
      format: "fixed-pair-tournament",
      participants: makeMembers(10)
    });
    const firstRoundScored = applyTournamentAdvancement(matches.map((match) => {
      if (match.sortOrder >= 1 && match.sortOrder <= 2) return { ...match, sideAScore: 6, sideBScore: 3, status: "completed" as const };
      return match;
    }), "g1");
    const firstOptions = getTournamentByeSelectionOptions(firstRoundScored, "g1");
    const firstSelected = selectTournamentBye(firstRoundScored, "g1", firstOptions[0].roundIndex, "g1-match-2");
    const next = applyTournamentAdvancement(firstSelected.map((match) => (
      match.sortOrder === 5
        ? { ...match, sideAScore: 6, sideBScore: 4, status: "completed" as const }
        : match
    )), "g1");

    expect(next[5].sideAPlayerIds).toEqual(["m5", "m6"]);
    expect(next[5].sideBPlayerIds).toEqual(["m1", "m2"]);
  });

  it("복식 토너먼트는 6페어처럼 직전 BYE 팀이 없어도 세 승자 중 부전승 팀을 선택한다", () => {
    const matches = generateInitialMatches({
      tournamentId: "t1",
      groupId: "g1",
      format: "fixed-pair-tournament",
      participants: makeMembers(12)
    });
    const scored = applyTournamentAdvancement(matches.map((match) => (
      match.sortOrder >= 1 && match.sortOrder <= 3
        ? { ...match, sideAScore: 6, sideBScore: 3, status: "completed" as const }
        : match
    )), "g1");

    const options = getTournamentByeSelectionOptions(scored, "g1");
    const selected = selectTournamentBye(scored, "g1", options[0].roundIndex, "g1-match-2");

    expect(options[0].options.map((option) => option.sourceMatchId)).toEqual(["g1-match-1", "g1-match-2", "g1-match-3"]);
    expect(selected[3].sideAPlayerIds).toEqual(["m5", "m6"]);
    expect(selected[4].sideAPlayerIds).toEqual(["m1", "m2"]);
    expect(selected[4].sideBPlayerIds).toEqual(["m9", "m10"]);
  });

  it("복식 토너먼트는 경기 승자를 다음 라운드로 자동 배치한다", () => {
    const matches = generateInitialMatches({
      tournamentId: "t1",
      groupId: "g1",
      format: "fixed-pair-tournament",
      participants: makeMembers(8)
    });
    const scored = matches.map((match) => (
      match.sortOrder === 1
        ? { ...match, sideAScore: 6, sideBScore: 3, status: "completed" as const }
        : match
    ));

    const advanced = applyTournamentAdvancement(scored, "g1");

    expect(advanced[2].sideAPlayerIds).toEqual(["m1", "m2"]);
  });

  it("복식 토너먼트는 홀수 참가자 수를 허용하지 않는다", () => {
    expect(validateScheduleParticipants("fixed-pair-tournament", 5)).toContain("짝수");
  });

  it("단식 토너먼트는 참가자 한 명씩 순번대로 붙이고 마지막 홀수 참가자만 BYE로 올린다", () => {
    const matches = generateInitialMatches({
      tournamentId: "t1",
      groupId: "g1",
      format: "single-tournament",
      participants: makeMembers(5)
    });

    expect(matches).toHaveLength(6);
    expect(matches[0].sideAPlayerIds).toEqual(["m1"]);
    expect(matches[0].sideBPlayerIds).toEqual(["m2"]);
    expect(matches[1].sideAPlayerIds).toEqual(["m3"]);
    expect(matches[1].sideBPlayerIds).toEqual(["m4"]);
    expect(matches[2].sideAPlayerIds).toEqual(["m5"]);
    expect(matches[2].sideBPlayerIds).toEqual([]);
    expect(matches[4].sideAPlayerIds).toEqual([]);
    expect(matches[4].sideBPlayerIds).toEqual(["m5"]);
  });

  it("토너먼트 라운드는 팀 수 기준으로 16강, 8강, 준결승, 결승처럼 표시한다", () => {
    expect(getTournamentRoundLabel(0, [5, 3, 2, 1])).toBe("16강");
    expect(getTournamentRoundLabel(1, [5, 3, 2, 1])).toBe("8강");
    expect(getTournamentRoundLabel(2, [5, 3, 2, 1])).toBe("준결승");
    expect(getTournamentRoundLabel(3, [5, 3, 2, 1])).toBe("결승");
  });
});
