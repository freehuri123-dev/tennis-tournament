import { describe, expect, it } from "vitest";
import { getTournamentStatusByDate } from "./tournament-status";

describe("getTournamentStatusByDate", () => {
  const today = new Date("2026-05-14T12:00:00+09:00");

  it("대회 날짜가 오늘보다 이전이면 완료로 계산한다", () => {
    expect(getTournamentStatusByDate("2026-05-13", today)).toBe("completed");
  });

  it("대회 날짜가 오늘이면 진행으로 계산한다", () => {
    expect(getTournamentStatusByDate("2026-05-14", today)).toBe("active");
  });

  it("대회 날짜가 오늘보다 이후면 준비로 계산한다", () => {
    expect(getTournamentStatusByDate("2026-05-15", today)).toBe("draft");
  });
});
