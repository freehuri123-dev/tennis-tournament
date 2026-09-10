import { describe, expect, it } from "vitest";
import { scheduleMatchesAcrossCourts } from "./court-schedule";
import { generateInitialMatches } from "./schedule";

describe("scheduleMatchesAcrossCourts", () => {
  it("fills KDK court rounds without assigning a player twice in the same round", () => {
    const members = Array.from({ length: 16 }, (_, index) => ({
      id: `m${index + 1}`,
      name: `Member ${index + 1}`,
      gender: "male" as const,
      notes: ""
    }));
    const matches = [
      ...generateInitialMatches({ tournamentId: "t1", groupId: "g1", format: "kdk-v2010", participants: members.slice(0, 8) }),
      ...generateInitialMatches({ tournamentId: "t1", groupId: "g2", format: "kdk-v2010", participants: members.slice(8) })
    ];

    const scheduled = scheduleMatchesAcrossCourts(matches, ["1", "2", "3"]);
    const rounds = new Map<number, typeof scheduled>();
    for (const match of scheduled) {
      expect(match.roundNumber).toBeTypeOf("number");
      const round = rounds.get(match.roundNumber!) ?? [];
      round.push(match);
      rounds.set(match.roundNumber!, round);
    }

    expect(scheduled).toHaveLength(matches.length);
    expect([...rounds.values()].some((round) => round.length === 3)).toBe(true);
    for (const round of rounds.values()) {
      expect(round.length).toBeLessThanOrEqual(3);
      expect(new Set(round.map((match) => match.courtNumber)).size).toBe(round.length);
      const playerIds = round.flatMap((match) => [...match.sideAPlayerIds, ...match.sideBPlayerIds]);
      expect(new Set(playerIds).size).toBe(playerIds.length);
    }
  });
});
