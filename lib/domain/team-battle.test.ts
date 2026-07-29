import { describe, expect, it } from "vitest";
import type { Match, Member } from "./types";
import { balanceTeamAssignments, calculateTeamBattleResult, calculateTeamBattleSideGamePlan, generateTeamBattleMatches, getTeamBattleRoundNumber, getTeamBattleTargetAppearances, groupTeamBattleMatchesByRound, normalizeTeamGrade, teamGradeWeight } from "./team-battle";

function member(id: string, level: string, gender?: "male" | "female"): Member {
  return { id, name: id, level, gender, notes: "" };
}

const blue = [member("b1", "A"), member("b2", "A"), member("b3", "B"), member("b4", "B"), member("b5", "B"), member("b6", "C"), member("b7", "C"), member("b8", "C")];
const white = [member("w1", "A"), member("w2", "A"), member("w3", "B"), member("w4", "B"), member("w5", "B"), member("w6", "C"), member("w7", "C")];

describe("team battle", () => {
  it("normalizes old or missing grades safely", () => {
    expect(normalizeTeamGrade("A조")).toBe("A");
    expect(normalizeTeamGrade("c")).toBe("C");
    expect(normalizeTeamGrade("D급")).toBe("D");
    expect(normalizeTeamGrade(undefined)).toBe("B");
    expect(teamGradeWeight(member("a", "A"))).toBe(4);
    expect(teamGradeWeight(member("b", "B"))).toBe(3);
    expect(teamGradeWeight(member("c", "C"))).toBe(2);
    expect(teamGradeWeight(member("d", "D"))).toBe(1);
  });

  it("balances uneven rosters by count and average grade strength", () => {
    const members = [...blue, ...white];
    const assignments = balanceTeamAssignments(members);
    const blueMembers = members.filter((item) => assignments[item.id] === "blue");
    const whiteMembers = members.filter((item) => assignments[item.id] === "white");
    expect(Math.abs(blueMembers.length - whiteMembers.length)).toBeLessThanOrEqual(1);
    const weight = (items: Member[]) => items.reduce((sum, item) => sum + ({ A: 4, B: 3, C: 2, D: 1 }[normalizeTeamGrade(item.level)]), 0);
    const blueAverage = weight(blueMembers) / blueMembers.length;
    const whiteAverage = weight(whiteMembers) / whiteMembers.length;
    expect(Math.abs(blueAverage - whiteAverage)).toBeCloseTo(0.125, 5);
  });

  it("reshuffles members on repeated auto balance while preserving the balance", () => {
    const members = [...blue, ...white];
    const first = balanceTeamAssignments(members);
    const second = balanceTeamAssignments(members, first);
    expect(second).not.toEqual(first);

    const totals = (assignments: Record<string, "blue" | "white">, side: "blue" | "white") => {
      const selected = members.filter((item) => assignments[item.id] === side);
      return {
        count: selected.length,
        strength: selected.reduce((sum, item) => sum + ({ A: 4, B: 3, C: 2, D: 1 }[normalizeTeamGrade(item.level)]), 0)
      };
    };
    expect(totals(second, "blue")).toEqual(totals(first, "blue"));
    expect(totals(second, "white")).toEqual(totals(first, "white"));
  });
  it("fills every court and lets the manager choose the smaller uneven-game group", () => {
    const totalAppearances = getTeamBattleTargetAppearances(5, 3);
    const bluePlan = calculateTeamBattleSideGamePlan(blue.length, totalAppearances);
    const whitePlan = calculateTeamBattleSideGamePlan(white.length, totalAppearances);
    expect(bluePlan).toEqual({ baseGames: 3, extraGamePlayerCount: 6, totalAppearances: 30 });
    expect(whitePlan).toEqual({ baseGames: 4, extraGamePlayerCount: 2, totalAppearances: 30 });

    const lowGameBlueIds = new Set(["b7", "b8"]);
    const highGameWhiteIds = new Set(["w1", "w2"]);
    const targetGamesByMemberId = Object.fromEntries([
      ...blue.map((item) => [item.id, lowGameBlueIds.has(item.id) ? 3 : 4] as const),
      ...white.map((item) => [item.id, highGameWhiteIds.has(item.id) ? 5 : 4] as const)
    ]);
    const matches = generateTeamBattleMatches({
      tournamentId: "t1",
      groupId: "g1",
      blueMembers: blue,
      whiteMembers: white,
      targetGamesByMemberId,
      courtNumbers: ["1", "2", "3"],
      roundCount: 5,

    });
    const counts = new Map<string, number>();
    matches.forEach((match) => [...match.sideAPlayerIds, ...match.sideBPlayerIds].forEach((id) => counts.set(id, (counts.get(id) ?? 0) + 1)));
    expect(matches).toHaveLength(15);
    [...blue, ...white].forEach((item) => expect(counts.get(item.id)).toBe(targetGamesByMemberId[item.id]));
    expect(groupTeamBattleMatchesByRound(matches).map((round) => round.matches.length)).toEqual([3, 3, 3, 3, 3]);
    const membersById = new Map([...blue, ...white].map((item) => [item.id, item]));
    const balanceGaps = matches.map((match) => {
      const blueStrength = match.sideAPlayerIds.reduce((sum, id) => sum + teamGradeWeight(membersById.get(id)!), 0);
      const whiteStrength = match.sideBPlayerIds.reduce((sum, id) => sum + teamGradeWeight(membersById.get(id)!), 0);
      return Math.abs(blueStrength - whiteStrength);
    });
    expect(balanceGaps.filter((gap) => gap >= 3)).toEqual([]);
    matches.forEach((match) => {
      expect(match.sideAPlayerIds.every((id) => id.startsWith("b"))).toBe(true);
      expect(match.sideBPlayerIds.every((id) => id.startsWith("w"))).toBe(true);
    });
  });

  it("allows women-only pairs", () => {
    const blueMembers = [member("bf1", "A", "female"), member("bf2", "B", "female")];
    const whiteMembers = [member("wf1", "A", "female"), member("wf2", "B", "female")];
    const matches = generateTeamBattleMatches({
      tournamentId: "t1",
      groupId: "g1",
      blueMembers,
      whiteMembers,
      courtNumbers: ["1"],
      roundCount: 1
    });

    expect(matches).toHaveLength(1);
    expect(matches[0].sideAPlayerIds).toEqual(["bf1", "bf2"]);
    expect(matches[0].sideBPlayerIds).toEqual(["wf1", "wf2"]);
  });  it("groups three courts into rounds without repeating a player in the same round", () => {
    const matches = generateTeamBattleMatches({
      tournamentId: "t1",
      groupId: "g1",
      blueMembers: blue,
      whiteMembers: white,
      courtNumbers: ["1", "2", "3"],
      roundCount: 5
    });
    const rounds = new Map<number, Match[]>();
    matches.forEach((match) => {
      const round = getTeamBattleRoundNumber(matches, match.id);
      rounds.set(round, [...(rounds.get(round) ?? []), match]);
    });
    expect([...rounds.values()].every((round) => round.length === 3)).toBe(true);
    for (const round of rounds.values()) {
      const playerIds = round.flatMap((match) => [...match.sideAPlayerIds, ...match.sideBPlayerIds]);
      expect(new Set(playerIds).size).toBe(playerIds.length);
    }
    expect(matches.slice(0, 6).map((match) => match.courtNumber)).toEqual(["1", "2", "3", "1", "2", "3"]);
    expect(groupTeamBattleMatchesByRound(matches).map((round) => round.matches.length)).toEqual([3, 3, 3, 3, 3]);
    const membersById = new Map([...blue, ...white].map((item) => [item.id, item]));
    const balanceGaps = matches.map((match) => {
      const blueStrength = match.sideAPlayerIds.reduce((sum, id) => sum + teamGradeWeight(membersById.get(id)!), 0);
      const whiteStrength = match.sideBPlayerIds.reduce((sum, id) => sum + teamGradeWeight(membersById.get(id)!), 0);
      return Math.abs(blueStrength - whiteStrength);
    });
    expect(balanceGaps.filter((gap) => gap >= 3)).toEqual([]);
  });
  it("preserves completed matches when the remaining schedule is rebuilt", () => {
    const completed: Match = {
      ...generateTeamBattleMatches({ tournamentId: "t1", groupId: "g1", blueMembers: blue, whiteMembers: white })[0],
      id: "completed-1",
      sideAScore: 6,
      sideBScore: 4,
      status: "completed"
    };
    const matches = generateTeamBattleMatches({ tournamentId: "t1", groupId: "g1", blueMembers: blue, whiteMembers: white, existingMatches: [completed] });
    expect(matches[0]).toMatchObject({ id: "completed-1", sideAScore: 6, sideBScore: 4, status: "completed" });
  });

  it("calculates only completed team results", () => {
    const matches = generateTeamBattleMatches({ tournamentId: "t1", groupId: "g1", blueMembers: blue, whiteMembers: white }).slice(0, 3);
    const scored = matches.map((match, index) => index === 0 ? { ...match, sideAScore: 6, sideBScore: 3, status: "completed" as const } : index === 1 ? { ...match, sideAScore: 4, sideBScore: 6, status: "completed" as const } : match);
    expect(calculateTeamBattleResult(scored)).toEqual({ blueWins: 1, whiteWins: 1, draws: 0, completedMatches: 2 });
  });
});