import { describe, expect, it } from "vitest";
import { createInitialState, getTournamentStorageKey, loadTournamentState } from "./tournament-store";

describe("getTournamentStorageKey", () => {
  it("separates localStorage keys by club slug", () => {
    expect(getTournamentStorageKey("stc")).toBe("tennis-monthly-tournament-state:stc");
    expect(getTournamentStorageKey("otc")).toBe("tennis-monthly-tournament-state:otc");
    expect(getTournamentStorageKey("joogo")).toBe("tennis-monthly-tournament-state:joogo");
    expect(getTournamentStorageKey("army")).toBe("tennis-monthly-tournament-state:army");
    expect(getTournamentStorageKey("queensday")).toBe("tennis-monthly-tournament-state:queensday");
  });

  it("uses the legacy storage key when no club slug is provided", () => {
    expect(getTournamentStorageKey()).toBe("tennis-monthly-tournament-state");
  });
  it("normalizes legacy tournament policy fields and match round metadata", () => {
    const initial = createInitialState();
    const legacyState = {
      ...initial,
      tournaments: initial.tournaments.map(({ type: _type, ...tournament }) => tournament),
      tournament: (({ type: _type, ...tournament }) => tournament)(initial.tournament),
      matches: initial.matches.map(({ roundNumber: _roundNumber, ...match }) => match)
    };

    window.localStorage.setItem(getTournamentStorageKey("stc"), JSON.stringify(legacyState));

    const loaded = loadTournamentState("stc");

    expect(loaded.tournament).toMatchObject({
      scheduleLocked: false,
      rankingExcludedMemberIds: [],
      includeInClubRecords: true
    });
    expect(loaded.tournaments).toEqual(expect.arrayContaining([
      expect.objectContaining({
        scheduleLocked: false,
        rankingExcludedMemberIds: [],
        includeInClubRecords: true
      })
    ]));
    expect(loaded.matches.every((match) => match.roundNumber === null)).toBe(true);
  });
});
