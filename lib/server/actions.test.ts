import { describe, expect, it, vi } from "vitest";
import { deleteMemberAction } from "./actions/member-actions";
import { matchScoreInputSchema, memberInputSchema, tournamentInputSchema } from "./validation";

const { redirect, revalidatePath, requireAdmin, softDeleteMember } = vi.hoisted(() => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
  revalidatePath: vi.fn(),
  requireAdmin: vi.fn(),
  softDeleteMember: vi.fn()
}));

vi.mock("next/navigation", () => ({ redirect }));
vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("./auth/admin-session", () => ({ requireAdmin }));
vi.mock("./repositories/tournament-repository", () => ({
  softDeleteMember,
  upsertMember: vi.fn()
}));

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

  it("passes club scope when deleting a member", async () => {
    const formData = new FormData();
    formData.set("clubSlug", "stc");
    formData.set("id", "member-1");

    await expect(deleteMemberAction(formData)).rejects.toThrow("redirect:/stc/members");

    expect(requireAdmin).toHaveBeenCalledOnce();
    expect(softDeleteMember).toHaveBeenCalledWith("stc", "member-1");
    expect(revalidatePath).toHaveBeenCalledWith("/stc/members");
  });
});
