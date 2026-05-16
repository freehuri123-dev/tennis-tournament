import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TournamentManageClient } from "./TournamentManageClient";
import type { TournamentState } from "@/lib/store/tournament-store";
import { persistTournamentStateAction, updateTournamentDateAction } from "@/lib/server/actions/tournament-actions";

vi.mock("@/lib/server/actions/tournament-actions", () => ({
  persistTournamentStateAction: vi.fn(() => Promise.resolve({ ok: true })),
  updateTournamentDateAction: vi.fn(() => Promise.resolve({ ok: true }))
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

function makeStateWithMatch(): TournamentState {
  const state = makeStateWithParticipants();
  return {
    ...state,
    groupMemberIds: { g1: ["m1", "m2", "m3", "m4"] },
    matches: [
      {
        id: "match-1",
        tournamentId: "t1",
        groupId: "g1",
        matchNumber: 1,
        sideAPlayerIds: ["m1", "m2"],
        sideBPlayerIds: ["m3", "m4"],
        sideAScore: null,
        sideBScore: null,
        status: "scheduled",
        sortOrder: 1
      }
    ]
  };
}

describe("TournamentManageClient save timing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
  });

  it("keeps participant clicks local until schedules are generated", () => {
    render(<TournamentManageClient initialState={makeState()} clubSlug="stc" />);

    fireEvent.click(screen.getByRole("button", { name: /참가자 수정/ }));
    fireEvent.click(screen.getByRole("button", { name: /김철수/ }));

    expect(persistTournamentStateAction).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "참가자 선택완료" }));

    expect(persistTournamentStateAction).not.toHaveBeenCalled();
  });

  it("saves date changes immediately but keeps title changes local", async () => {
    render(<TournamentManageClient initialState={makeState()} clubSlug="stc" />);

    fireEvent.change(screen.getByLabelText("대회명"), { target: { value: "새 이름" } });
    expect(persistTournamentStateAction).not.toHaveBeenCalled();
    expect(updateTournamentDateAction).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("날짜"), { target: { value: "2026-05-25" } });

    await waitFor(() => expect(updateTournamentDateAction).toHaveBeenCalledWith("stc", "t1", "2026-05-25"));
    expect(persistTournamentStateAction).not.toHaveBeenCalled();
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

  it("swaps only the dragged participant and drop target in group order", () => {
    const { container } = render(<TournamentManageClient initialState={makeStateWithMatch()} clubSlug="stc" />);
    const participants = Array.from(container.querySelectorAll<HTMLButtonElement>(".sortable-participant"));
    const initialNames = participants.map((button) => button.querySelector("strong")?.textContent);

    fireEvent.dragStart(participants[0]);
    fireEvent.dragOver(participants[2]);
    fireEvent.drop(participants[2]);

    const nextNames = Array.from(container.querySelectorAll<HTMLButtonElement>(".sortable-participant"))
      .map((button) => button.querySelector("strong")?.textContent);

    expect(nextNames).toEqual([initialNames[2], initialNames[1], initialNames[0], initialNames[3]]);
  });

  it("keeps score edits local until the result save button is pressed", async () => {
    render(<TournamentManageClient initialState={makeStateWithMatch()} clubSlug="stc" />);

    fireEvent.click(screen.getByRole("button", { name: "대진표" }));
    fireEvent.change(screen.getByLabelText("위쪽 팀 점수"), { target: { value: "6" } });

    expect(persistTournamentStateAction).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "경기 결과 저장" }));

    await waitFor(() => expect(persistTournamentStateAction).toHaveBeenCalledTimes(1));
  });
});
