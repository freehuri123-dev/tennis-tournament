import { describe, expect, it } from "vitest";
import { matchScoreInputSchema, memberInputSchema, tournamentInputSchema } from "./validation";

describe("server action validation", () => {
  it("rejects member input with an empty trimmed name", () => {
    const result = memberInputSchema.safeParse({
      clubSlug: "stc",
      name: "   "
    });

    expect(result.success).toBe(false);
  });

  it("normalizes valid nullable match scores", () => {
    expect(
      matchScoreInputSchema.parse({
        matchId: "match-1",
        sideAScore: 6,
        sideBScore: null
      })
    ).toEqual({
      matchId: "match-1",
      sideAScore: 6,
      sideBScore: null
    });
  });

  it("accepts valid tournament input", () => {
    expect(
      tournamentInputSchema.parse({
        clubSlug: "stc",
        name: "Spring Tournament",
        date: "2026-05-24",
        publicSlug: "Spring-Open"
      })
    ).toEqual({
      clubSlug: "stc",
      name: "Spring Tournament",
      date: "2026-05-24",
      publicSlug: "spring-open"
    });
  });

  it("rejects invalid tournament public slugs", () => {
    const result = tournamentInputSchema.safeParse({
      clubSlug: "stc",
      name: "Spring Tournament",
      date: "2026-05-24",
      publicSlug: "spring_open"
    });

    expect(result.success).toBe(false);
  });
});
