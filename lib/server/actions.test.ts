import { describe, expect, it, vi } from "vitest";
import { deleteMemberAction } from "./actions/member-actions";
import { createTournamentAction, persistTournamentStateAction } from "./actions/tournament-actions";
import type { TournamentState } from "../store/tournament-store";
import { matchScoreInputSchema, memberInputSchema, tournamentInputSchema } from "./validation";

const { redirect, revalidatePath, requireAdmin, replaceTournamentState, softDeleteMember, upsertTournament } = vi.hoisted(() => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
  revalidatePath: vi.fn(),
  requireAdmin: vi.fn(),
  replaceTournamentState: vi.fn(),
  softDeleteMember: vi.fn(),
  upsertTournament: vi.fn()
}));

vi.mock("next/navigation", () => ({ redirect }));
vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("./auth/admin-session", () => ({ requireAdmin }));
vi.mock("./repositories/tournament-repository", () => ({
  replaceTournamentState,
  softDeleteMember,
  upsertMember: vi.fn(),
  upsertTournament
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

  it("creates a default tournament for the requested club", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-15T09:30:00.000Z"));
    upsertTournament.mockResolvedValue({
      id: "tournament-1",
      name: "새 월례대회",
      date: "2026-05-15",
      publicSlug: "tournament-generated",
      status: "draft"
    });
    const formData = new FormData();
    formData.set("clubSlug", "otc");

    await expect(createTournamentAction(formData)).rejects.toThrow("redirect:/otc/tournaments");

    expect(requireAdmin).toHaveBeenCalled();
    expect(upsertTournament).toHaveBeenCalledWith({
      clubSlug: "otc",
      name: "새 월례대회",
      date: "2026-05-15",
      publicSlug: expect.stringMatching(/^tournament-[a-z0-9-]+$/)
    });
    expect(revalidatePath).toHaveBeenCalledWith("/otc/tournaments");

    vi.useRealTimers();
  });

  it("persists tournament manage state and revalidates club paths", async () => {
    const state: TournamentState = {
      version: 8,
      adminUnlocked: false,
      members: [],
      tournaments: [],
      currentTournamentId: "tournament-1",
      tournament: {
        id: "tournament-1",
        name: "Spring Tournament",
        date: "2026-05-24",
        publicSlug: "spring-tournament",
        status: "active"
      },
      groups: [],
      tournamentParticipantIds: { "tournament-1": [] },
      groupMemberIds: {},
      matches: [],
      deletedPublicSlugs: []
    };

    await expect(persistTournamentStateAction("stc", state)).resolves.toEqual({ ok: true });

    expect(requireAdmin).toHaveBeenCalled();
    expect(replaceTournamentState).toHaveBeenCalledWith("stc", state);
    expect(revalidatePath).toHaveBeenCalledWith("/stc/tournaments/manage");
    expect(revalidatePath).toHaveBeenCalledWith("/stc/tournaments");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/tournaments/manage");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/tournaments");
    expect(revalidatePath).toHaveBeenCalledWith("/public/stc/spring-tournament");
  });
});
