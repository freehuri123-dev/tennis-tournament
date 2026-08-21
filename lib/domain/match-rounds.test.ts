import { describe, expect, it } from "vitest";
import type { Match } from "./types";
import { groupMatchesByExplicitRound } from "./match-rounds";

const match: Match = {
  id: "match", tournamentId: "t1", groupId: "g1", matchNumber: 1,
  sideAPlayerIds: ["m1", "m2"], sideBPlayerIds: ["m3", "m4"],
  sideAScore: null, sideBScore: null, status: "scheduled", sortOrder: 1
};

describe("groupMatchesByExplicitRound", () => {
  it("groups matches by persisted round number and keeps round and match order", () => {
    const rounds = groupMatchesByExplicitRound([
      { ...match, id: "r2c1", roundNumber: 2, sortOrder: 3 },
      { ...match, id: "r1c2", roundNumber: 1, sortOrder: 2 },
      { ...match, id: "r1c1", roundNumber: 1, sortOrder: 1 }
    ]);
    expect(rounds.map((round) => [round.roundNumber, round.matches.length])).toEqual([[1, 2], [2, 1]]);
    expect(rounds[0].matches.map((item) => item.id)).toEqual(["r1c1", "r1c2"]);
  });

  it("returns no explicit rounds when round metadata is absent", () => {
    expect(groupMatchesByExplicitRound([{ ...match }])).toEqual([]);
  });
});
