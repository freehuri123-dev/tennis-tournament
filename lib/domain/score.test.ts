import { describe, expect, it } from "vitest";
import { normalizeMatchScore } from "./score";

describe("normalizeMatchScore", () => {
  it("빈 값은 미입력 점수로 처리한다", () => {
    expect(normalizeMatchScore("")).toBeNull();
  });

  it("점수는 0점부터 6점 사이로 제한한다", () => {
    expect(normalizeMatchScore("-1")).toBe(0);
    expect(normalizeMatchScore("4")).toBe(4);
    expect(normalizeMatchScore("9")).toBe(6);
  });
});
