import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TournamentManageClient } from "./TournamentManageClient";
import type { TournamentState } from "@/lib/store/tournament-store";
import { persistTournamentStateAction } from "@/lib/server/actions/tournament-actions";

vi.mock("@/lib/server/actions/tournament-actions", () => ({
  persistTournamentStateAction: vi.fn(() => Promise.resolve({ ok: true }))
}));

function makeState(): TournamentState {
  return {
    version: 8,
    adminUnlocked: false,
    members: [
      { id: "m1", name: "김철수", gender: "male", notes: "" },
      { id: "m2", name: "박영희", gender: "female", notes: "" },
      { id: "m3", name: "이민준", gender: "male", notes: "" },
      { id: "m4", name: "최지은", gender: "female", notes: "" }
    ],
    tournaments: [{ id: "t1", name: "5월 정기대회", date: "2026-05-24", publicSlug: "tournament-t1", status: "draft" }],
    currentTournamentId: "t1",
    tournament: { id: "t1", name: "5월 정기대회", date: "2026-05-24", publicSlug: "tournament-t1", status: "draft" },
    groups: [{ id: "g1", tournamentId: "t1", name: "A조", scheduleFormat: "random", sortOrder: 1, seedPlayerIds: [] }],
    tournamentParticipantIds: { t1: [] },
    groupMemberIds: { g1: [] },
    matches: [],
    deletedPublicSlugs: []
  };
}

function makeStateWithParticipants(): TournamentState {
  const state = makeState();
  const participantIds = state.members.map((member) => member.id);
  return {
    ...state,
    tournamentParticipantIds: { t1: participantIds },
    groupMemberIds: { g1: [] }
  };
}

describe("TournamentManageClient save timing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
  });

  it("does not save participant clicks until the done button is pressed", async () => {
    render(<TournamentManageClient initialState={makeState()} clubSlug="stc" />);

    fireEvent.click(screen.getByRole("button", { name: /참가자 수정/ }));
    fireEvent.click(screen.getByRole("button", { name: /김철수/ }));

    expect(persistTournamentStateAction).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "참가자 선택완료" }));

    await waitFor(() => expect(persistTournamentStateAction).toHaveBeenCalledTimes(1));
  });

  it("does not save group assignment clicks until schedules are generated", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<TournamentManageClient initialState={makeStateWithParticipants()} clubSlug="stc" />);

    fireEvent.click(screen.getByRole("button", { name: /김철수/ }));

    expect(persistTournamentStateAction).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /박영희/ }));
    fireEvent.click(screen.getByRole("button", { name: /이민준/ }));
    fireEvent.click(screen.getByRole("button", { name: /최지은/ }));
    fireEvent.click(screen.getByRole("button", { name: "대진표 생성" }));

    await waitFor(() => expect(persistTournamentStateAction).toHaveBeenCalledTimes(1));
  });
});
