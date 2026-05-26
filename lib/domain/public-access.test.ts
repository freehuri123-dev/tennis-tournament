import { describe, expect, it } from "vitest";
import { createTournamentSlug, getPublicTournamentAccess } from "./public-access";
import type { Tournament } from "./types";

const tournaments: Tournament[] = [
  { id: "t1", name: "진행 대회", date: "2026-05-15", publicSlug: "1234", status: "draft" },
  { id: "t0", name: "완료 대회", date: "2026-05-13", publicSlug: "1235", status: "completed" }
];

describe("public tournament access", () => {
  it("대회 id마다 짧은 숫자 공유 코드를 만든다", () => {
    expect(createTournamentSlug("tournament-123")).toMatch(/^\d{4}$/);
  });

  it("삭제된 공유 slug는 삭제 상태로 반환한다", () => {
    expect(getPublicTournamentAccess("1234", tournaments, ["1234"])).toEqual({ type: "deleted" });
  });

  it("지난 날짜의 공유 slug도 조회 가능 상태로 반환한다", () => {
    const result = getPublicTournamentAccess("1235", tournaments.map((item) => ({ ...item, date: item.id === "t0" ? "2026-05-13" : item.date })), []);
    expect(result.type).toBe("live");
  });

  it("존재하는 진행 대회 공유 slug는 조회 가능 상태로 반환한다", () => {
    const result = getPublicTournamentAccess("1234", tournaments.map((item) => ({ ...item, date: item.id === "t1" ? "2026-05-15" : item.date })), []);
    expect(result.type).toBe("live");
  });
});
