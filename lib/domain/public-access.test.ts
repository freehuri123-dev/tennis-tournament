import { describe, expect, it } from "vitest";
import { createTournamentSlug, getPublicTournamentAccess } from "./public-access";
import type { Tournament } from "./types";

const tournaments: Tournament[] = [
  { id: "t1", name: "진행 대회", date: "2026-05-15", publicSlug: "tournament-t1", status: "draft" },
  { id: "t0", name: "완료 대회", date: "2026-05-13", publicSlug: "tournament-t0", status: "completed" }
];

describe("public tournament access", () => {
  it("대회 id마다 고유한 공유 slug를 만든다", () => {
    expect(createTournamentSlug("tournament-123")).toBe("tournament-tournament-123");
  });

  it("삭제된 공유 slug는 삭제 상태로 반환한다", () => {
    expect(getPublicTournamentAccess("tournament-t1", tournaments, ["tournament-t1"])).toEqual({ type: "deleted" });
  });

  it("지난 날짜의 공유 slug도 조회 가능 상태로 반환한다", () => {
    const result = getPublicTournamentAccess("tournament-t0", tournaments.map((item) => ({ ...item, date: item.id === "t0" ? "2026-05-13" : item.date })), []);
    expect(result.type).toBe("live");
  });

  it("존재하는 진행 대회 공유 slug는 조회 가능 상태로 반환한다", () => {
    const result = getPublicTournamentAccess("tournament-t1", tournaments.map((item) => ({ ...item, date: item.id === "t1" ? "2026-05-15" : item.date })), []);
    expect(result.type).toBe("live");
  });
});
