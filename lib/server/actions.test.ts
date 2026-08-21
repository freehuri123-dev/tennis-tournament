import { describe, expect, it, vi } from "vitest";
import { deleteMemberAction } from "./actions/member-actions";
import { updateMatchScoreAction, updateTournamentMatchStatesAction } from "./actions/match-actions";
import { createTournamentAction, deleteTournamentAction, persistTournamentStateAction, updateTournamentDateAction, updateTournamentNameAction } from "./actions/tournament-actions";
import type { TournamentState } from "../store/tournament-store";
import { matchScoreInputSchema, memberInputSchema, tournamentInputSchema, tournamentMatchStatesInputSchema } from "./validation";

const { deleteTournament, redirect, revalidatePath, requireAdmin, replaceTournamentState, softDeleteMember, updateMatchScore, updateTournamentDate, updateTournamentMatchStates, updateTournamentName, upsertTournament } = vi.hoisted(() => ({
  deleteTournament: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
  revalidatePath: vi.fn(),
  requireAdmin: vi.fn(),
  replaceTournamentState: vi.fn(),
  softDeleteMember: vi.fn(),
  updateMatchScore: vi.fn(),
  updateTournamentDate: vi.fn(),
  updateTournamentMatchStates: vi.fn(),
  updateTournamentName: vi.fn(),
  upsertTournament: vi.fn()
}));

vi.mock("next/navigation", () => ({ redirect }));
vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("./auth/admin-session", () => ({ requireAdmin }));
vi.mock("./repositories/tournament-repository", () => ({
  deleteTournament,
  replaceTournamentState,
  softDeleteMember,
  updateMatchScore,
  updateTournamentDate,
  updateTournamentMatchStates,
  updateTournamentName,
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

  it("accepts six and null resets but rejects seven for single match scores", () => {
    expect(matchScoreInputSchema.safeParse({ matchId: "match-1", sideAScore: 6, sideBScore: 0 }).success).toBe(true);
    expect(matchScoreInputSchema.safeParse({ matchId: "match-1", sideAScore: null, sideBScore: null }).success).toBe(true);
    expect(matchScoreInputSchema.safeParse({ matchId: "match-1", sideAScore: 7, sideBScore: 0 }).success).toBe(false);
  });

  it("accepts six and null resets but rejects seven for bulk match scores", () => {
    const makeInput = (sideAScore: number | null, sideBScore: number | null) => ({
      publicSlug: "1234",
      matches: [{
        matchId: "match-1",
        sideAPlayerIds: ["member-1", "member-2"],
        sideBPlayerIds: ["member-3", "member-4"],
        sideAScore,
        sideBScore,
        status: sideAScore === null || sideBScore === null ? "scheduled" : "completed"
      }]
    });

    expect(tournamentMatchStatesInputSchema.safeParse(makeInput(6, 0)).success).toBe(true);
    expect(tournamentMatchStatesInputSchema.safeParse(makeInput(null, null)).success).toBe(true);
    expect(tournamentMatchStatesInputSchema.safeParse(makeInput(7, 0)).success).toBe(false);
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
      publicSlug: "spring-open",
      type: "general",
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

    expect(requireAdmin).toHaveBeenCalledWith("stc");
    expect(softDeleteMember).toHaveBeenCalledWith("stc", "member-1");
    expect(revalidatePath).toHaveBeenCalledWith("/stc/members");
  });

  it("propagates a clear error when deleting a member referenced by a locked schedule", async () => {
    softDeleteMember.mockRejectedValueOnce(new Error("잠긴 대회 대진표에 포함된 회원은 삭제할 수 없습니다."));
    const formData = new FormData();
    formData.set("clubSlug", "pt");
    formData.set("id", "pt-m01");

    await expect(deleteMemberAction(formData))
      .rejects.toThrow("잠긴 대회 대진표에 포함된 회원은 삭제할 수 없습니다.");

    expect(requireAdmin).toHaveBeenCalledWith("pt");
    expect(softDeleteMember).toHaveBeenCalledWith("pt", "pt-m01");
    expect(redirect).not.toHaveBeenCalledWith("/pt/members");
  });

  it("creates a default tournament for the requested club", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-15T15:30:00.000Z"));
    upsertTournament.mockResolvedValue({
      id: "tournament-1",
      name: "새 대회",
      date: "2026-05-17",
      publicSlug: "tournament-generated",
      status: "draft"
    });
    const formData = new FormData();
    formData.set("clubSlug", "otc");

    await expect(createTournamentAction(formData)).rejects.toThrow("redirect:/otc/tournaments/manage?tournamentId=tournament-1");

    expect(requireAdmin).toHaveBeenCalledWith("otc");
    expect(upsertTournament).toHaveBeenCalledWith({
      clubSlug: "otc",
      name: "새 대회",
      date: "2026-05-17",
      publicSlug: expect.stringMatching(/^\d{4}$/),
      type: "general",
    });
    expect(revalidatePath).toHaveBeenCalledWith("/otc/tournaments");

    vi.useRealTimers();
  });

  it("deletes a tournament inside the requested club and returns to the list", async () => {
    const formData = new FormData();
    formData.set("clubSlug", "stc");
    formData.set("id", "tournament-1");

    await expect(deleteTournamentAction(formData)).rejects.toThrow("redirect:/stc/tournaments");

    expect(requireAdmin).toHaveBeenCalledWith("stc");
    expect(deleteTournament).toHaveBeenCalledWith("stc", "tournament-1");
    expect(revalidatePath).toHaveBeenCalledWith("/stc/tournaments");
    expect(revalidatePath).toHaveBeenCalledWith("/stc/tournaments/manage");
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

    expect(requireAdmin).toHaveBeenCalledWith("stc");
    expect(replaceTournamentState).toHaveBeenCalledWith("stc", state);
    expect(revalidatePath).toHaveBeenCalledWith("/stc/tournaments/manage");
    expect(revalidatePath).toHaveBeenCalledWith("/stc/tournaments");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/tournaments/manage");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/tournaments");
    expect(revalidatePath).toHaveBeenCalledWith("/public/stc/spring-tournament");
  });

  it("propagates the database lock when renaming a locked tournament", async () => {
    updateTournamentName.mockRejectedValueOnce(new Error("This tournament schedule is locked"));

    await expect(updateTournamentNameAction("pt", "pt-event", "Changed name"))
      .rejects.toThrow("This tournament schedule is locked");

    expect(requireAdmin).toHaveBeenCalledWith("pt");
    expect(updateTournamentName).toHaveBeenCalledWith("pt", "pt-event", "Changed name");
  });

  it("propagates the database lock when changing a locked tournament date", async () => {
    updateTournamentDate.mockRejectedValueOnce(new Error("This tournament schedule is locked"));

    await expect(updateTournamentDateAction("pt", "pt-event", "2026-08-23"))
      .rejects.toThrow("This tournament schedule is locked");

    expect(requireAdmin).toHaveBeenCalledWith("pt");
    expect(updateTournamentDate).toHaveBeenCalledWith("pt", "pt-event", "2026-08-23");
  });
  it("passes club scope when updating match scores", async () => {
    await expect(
      updateMatchScoreAction(
        {
          matchId: "match-1",
          sideAScore: 6,
          sideBScore: 4
        },
        "otc"
      )
    ).resolves.toBeUndefined();

    expect(requireAdmin).toHaveBeenCalledWith("otc");
    expect(updateMatchScore).toHaveBeenCalledWith("otc", {
      matchId: "match-1",
      sideAScore: 6,
      sideBScore: 4
    });
    expect(revalidatePath).toHaveBeenCalledWith("/otc/tournaments/manage");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/tournaments/manage");
  });

  it("allows resetting a locked event score through the score-only action", async () => {
    await expect(updateMatchScoreAction({
      matchId: "pt-match-1",
      sideAScore: null,
      sideBScore: null
    }, "pt")).resolves.toBeUndefined();

    expect(requireAdmin).toHaveBeenCalledWith("pt");
    expect(updateMatchScore).toHaveBeenCalledWith("pt", {
      matchId: "pt-match-1",
      sideAScore: null,
      sideBScore: null
    });
  });
  it("saves only changed tournament matches and revalidates the public page", async () => {
    const matches = [{
      matchId: "match-1",
      sideAPlayerIds: ["member-1", "member-2"],
      sideBPlayerIds: ["member-3", "member-4"],
      sideAScore: 6,
      sideBScore: 4,
      status: "completed" as const
    }];

    await expect(updateTournamentMatchStatesAction({ publicSlug: "1234", matches }, "stc")).resolves.toBeUndefined();

    expect(requireAdmin).toHaveBeenCalledWith("stc");
    expect(updateTournamentMatchStates).toHaveBeenCalledWith("stc", matches);
    expect(revalidatePath).toHaveBeenCalledWith("/stc/tournaments/manage");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/tournaments/manage");
    expect(revalidatePath).toHaveBeenCalledWith("/public/stc/1234");
  });});
