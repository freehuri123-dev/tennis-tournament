import { describe, expect, it } from "vitest";
import { isIncludedInClubRecords, isScheduleLocked, rankingMembersForTournament } from "./tournament-policy";
import type { Member, Tournament } from "./types";

const base: Tournament = { id: "t1", name: "General", date: "2026-08-22", publicSlug: "1234", status: "active" };
const members: Member[] = [
  { id: "m1", name: "Alpha", notes: "" },
  { id: "m2", name: "Bravo", notes: "" },
  { id: "m3", name: "Charlie", notes: "" }
];

describe("tournament policy defaults", () => {
  it("keeps existing tournaments editable and in records", () => {
    expect(isScheduleLocked(base)).toBe(false);
    expect(isIncludedInClubRecords(base)).toBe(true);
    expect(rankingMembersForTournament(base, members)).toEqual(members);
  });

  it("applies only persisted event exceptions", () => {
    const event = { ...base, scheduleLocked: true, includeInClubRecords: false, rankingExcludedMemberIds: ["m1", "m2"] };
    expect(isScheduleLocked(event)).toBe(true);
    expect(isIncludedInClubRecords(event)).toBe(false);
    expect(rankingMembersForTournament(event, members).map((member) => member.id)).toEqual(["m3"]);
  });
});
