import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TournamentManageClient } from "./TournamentManageClient";
import type { TournamentState } from "@/lib/store/tournament-store";
import { updateMatchScoreAction, updateTournamentMatchStatesAction } from "@/lib/server/actions/match-actions";
import { persistTournamentStateAction, updateTournamentDateAction, updateTournamentNameAction } from "@/lib/server/actions/tournament-actions";
import { applyTournamentAdvancement, generateInitialMatches } from "@/lib/domain/schedule";

vi.mock("@/lib/server/actions/match-actions", () => ({
  updateMatchScoreAction: vi.fn(() => Promise.resolve()),
  updateTournamentMatchStatesAction: vi.fn(() => Promise.resolve())
}));

vi.mock("@/lib/server/actions/tournament-actions", () => ({
  persistTournamentStateAction: vi.fn(() => Promise.resolve({ ok: true })),
  updateTournamentDateAction: vi.fn(() => Promise.resolve({ ok: true })),
  updateTournamentNameAction: vi.fn(() => Promise.resolve({ ok: true }))
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
    tournaments: [{ id: "t1", name: "5월 정기대회", date: "2099-06-24", publicSlug: "1234", status: "draft" }],
    currentTournamentId: "t1",
    tournament: { id: "t1", name: "5월 정기대회", date: "2099-06-24", publicSlug: "1234", status: "draft" },
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

function makeHanulStateWithCustomOrder(): TournamentState {
  const state = makeState();
  const members = Array.from({ length: 10 }, (_, index) => ({
    id: `m${index + 1}`,
    name: `Member ${index + 1}`,
    gender: index % 2 === 0 ? "male" as const : "female" as const,
    notes: ""
  }));
  const orderedIds = ["m5", "m4", "m3", "m2", "m1", "m6", "m7", "m8", "m9", "m10"];

  return {
    ...state,
    members,
    groups: [{ ...state.groups[0], scheduleFormat: "hanul-aa" }],
    tournamentParticipantIds: { t1: members.map((member) => member.id) },
    groupMemberIds: { g1: orderedIds },
    matches: []
  };
}

function makeKdkTenParticipantState(): TournamentState {
  const state = makeState();
  const members = Array.from({ length: 10 }, (_, index) => ({
    id: `m${index + 1}`,
    name: `Member ${index + 1}`,
    gender: index % 2 === 0 ? "male" as const : "female" as const,
    notes: ""
  }));

  return {
    ...state,
    members,
    groups: [{ ...state.groups[0], scheduleFormat: "kdk-v2010" }],
    tournamentParticipantIds: { t1: members.map((member) => member.id) },
    groupMemberIds: { g1: members.map((member) => member.id) },
    matches: []
  };
}

function makeFixedPairTournamentState(): TournamentState {
  const state = makeState();
  return {
    ...state,
    groups: [{ ...state.groups[0], scheduleFormat: "fixed-pair-tournament" }],
    tournamentParticipantIds: { t1: state.members.map((member) => member.id) },
    groupMemberIds: { g1: state.members.map((member) => member.id) },
    matches: [
      {
        id: "g1-match-1",
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

function makeTournamentByeState(): TournamentState {
  const state = makeFixedPairTournamentState();
  return {
    ...state,
    matches: [
      {
        id: "g1-match-bye",
        tournamentId: "t1",
        groupId: "g1",
        matchNumber: 1,
        sideAPlayerIds: ["m1", "m2"],
        sideBPlayerIds: [],
        sideAScore: null,
        sideBScore: null,
        status: "scheduled",
        sortOrder: 1
      }
    ]
  };
}

function makeNinePairTournamentState(): TournamentState {
  const state = makeState();
  const members = Array.from({ length: 18 }, (_, index) => ({
    id: `m${index + 1}`,
    name: `Member ${index + 1}`,
    gender: index % 2 === 0 ? "male" as const : "female" as const,
    notes: ""
  }));
  const baseState = {
    ...state,
    members,
    groups: [{ ...state.groups[0], scheduleFormat: "fixed-pair-tournament" as const }],
    tournamentParticipantIds: { t1: members.map((member) => member.id) },
    groupMemberIds: { g1: members.map((member) => member.id) },
    matches: generateInitialMatches({
      tournamentId: "t1",
      groupId: "g1",
      format: "fixed-pair-tournament",
      participants: members
    })
  };

  return {
    ...baseState,
    matches: applyTournamentAdvancement(baseState.matches.map((match) => {
      if (match.sortOrder >= 1 && match.sortOrder <= 4) return { ...match, sideAScore: 6, sideBScore: 3, status: "completed" as const };
      return match;
    }), "g1")
  };
}

describe("TournamentManageClient save timing", () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    window.sessionStorage.clear();
  });

  it("keeps participant clicks local until schedules are generated", () => {
    render(<TournamentManageClient initialState={makeState()} clubSlug="stc" />);

    fireEvent.click(screen.getByRole("button", { name: /참가자등록/ }));
    fireEvent.click(screen.getByRole("button", { name: /김철수/ }));

    expect(persistTournamentStateAction).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "참가자 선택완료" }));

    expect(persistTournamentStateAction).not.toHaveBeenCalled();
  });

  it("selects only members of the chosen gender without saving immediately", () => {
    const { container } = render(<TournamentManageClient initialState={makeState()} clubSlug="stc" />);

    fireEvent.click(screen.getByRole("button", { name: /참가자등록/ }));
    fireEvent.click(screen.getByRole("button", { name: "남자만 선택" }));
    fireEvent.click(screen.getByRole("button", { name: "참가자 선택완료" }));

    const summary = container.querySelector(".selected-summary");
    expect(summary?.textContent).toContain("김철수");
    expect(summary?.textContent).toContain("이민준");
    expect(summary?.textContent).not.toContain("박영희");
    expect(summary?.textContent).not.toContain("최지은");
    expect(persistTournamentStateAction).not.toHaveBeenCalled();
  });

  it("toggles gender bulk selection off when pressed again", () => {
    const { container } = render(<TournamentManageClient initialState={makeState()} clubSlug="stc" />);

    fireEvent.click(screen.getByRole("button", { name: /참가자등록/ }));
    fireEvent.click(screen.getByRole("button", { name: "남자만 선택" }));
    fireEvent.click(screen.getByRole("button", { name: "남자만 선택" }));
    fireEvent.click(screen.getByRole("button", { name: "참가자 선택완료" }));

    const summary = container.querySelector(".selected-summary");
    expect(summary?.textContent).not.toContain("김철수");
    expect(summary?.textContent).not.toContain("이민준");
    expect(persistTournamentStateAction).not.toHaveBeenCalled();
  });

  it("saves title on blur and date changes immediately", async () => {
    render(<TournamentManageClient initialState={makeState()} clubSlug="stc" />);

    const nameInput = screen.getByLabelText("대회명");
    fireEvent.change(nameInput, { target: { value: "새 이름" } });
    expect(updateTournamentNameAction).not.toHaveBeenCalled();
    fireEvent.blur(nameInput);

    await waitFor(() => expect(updateTournamentNameAction).toHaveBeenCalledWith("stc", "t1", "새 이름"));
    expect(updateTournamentDateAction).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("날짜"), { target: { value: "2026-05-25" } });

    await waitFor(() => expect(updateTournamentDateAction).toHaveBeenCalledWith("stc", "t1", "2026-05-25"));
    expect(persistTournamentStateAction).not.toHaveBeenCalled();
  });

  it("restores court assignment options from generated matches", () => {
    const state = makeStateWithMatch();
    state.matches = [
      { ...state.matches[0], courtNumber: "4" },
      { ...state.matches[0], id: "match-2", matchNumber: 2, sortOrder: 2, courtNumber: "5" }
    ];

    render(<TournamentManageClient initialState={state} clubSlug="stc" />);

    expect(screen.getByRole("button", { name: "사용함" })).toBeTruthy();
    expect((screen.getByLabelText("코트 개수") as HTMLSelectElement).value).toBe("2");
    expect(screen.getByRole("button", { name: "코트 4 1순서 선택됨" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "코트 5 2순서 선택됨" })).toBeTruthy();
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

  it("assigns and displays default court numbers when court assignment is enabled before generating schedules", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<TournamentManageClient initialState={makeStateWithParticipants()} clubSlug="stc" />);

    fireEvent.click(screen.getByRole("button", { name: /김철수/ }));
    fireEvent.click(screen.getByRole("button", { name: /박영희/ }));
    fireEvent.click(screen.getByRole("button", { name: /이민준/ }));
    fireEvent.click(screen.getByRole("button", { name: /최지은/ }));
    fireEvent.click(screen.getByRole("button", { name: "사용안함" }));
    fireEvent.click(screen.getByRole("button", { name: "대진표 생성" }));

    await waitFor(() => expect(persistTournamentStateAction).toHaveBeenCalledTimes(1));
    const savedState = vi.mocked(persistTournamentStateAction).mock.calls[0][1];
    expect(savedState.matches.map((match) => match.courtNumber)).toEqual(expect.arrayContaining(["1", "2"]));
    expect(screen.getAllByText("1번 코트").length).toBeGreaterThan(0);
  });

  it("hides court assignment when a second group is added", () => {
    render(<TournamentManageClient initialState={makeStateWithParticipants()} clubSlug="stc" />);

    fireEvent.click(screen.getByRole("button", { name: "사용안함" }));
    expect(screen.getByRole("button", { name: "사용함" })).toBeTruthy();
    expect(screen.getByLabelText("코트 개수")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "그룹 추가" }));

    expect(screen.getByRole("tab", { name: /B조.*0명/ }).getAttribute("aria-selected")).toBe("true");
    expect(screen.queryByText("코트 배정")).toBeNull();
    expect(screen.queryByRole("button", { name: "사용불가" })).toBeNull();
    expect(screen.queryByLabelText("코트 개수")).toBeNull();
    expect(screen.queryByText("코트 배정은 그룹이 1개일 때만 사용할 수 있습니다.")).toBeNull();
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

  it("swaps and saves two players already assigned to the same match", async () => {
    const state = makeStateWithMatch();
    state.members.push({ id: "m5", name: "대기선수", gender: "male", notes: "" });
    state.tournamentParticipantIds.t1.push("m5");
    state.groupMemberIds.g1.push("m5");

    render(<TournamentManageClient initialState={state} clubSlug="stc" />);

    fireEvent.click(screen.getByRole("button", { name: "대진표" }));

    const sideASecond = screen.getByLabelText("위쪽 2") as HTMLSelectElement;
    const sideBFirst = screen.getByLabelText("아래쪽 1") as HTMLSelectElement;
    const candidateNames = Array.from(sideASecond.options).map((option) => option.textContent);

    expect(candidateNames).toEqual(["박영희", "이민준", "최지은"]);
    expect(candidateNames).not.toContain("김철수");
    expect(candidateNames).not.toContain("대기선수");

    fireEvent.change(sideASecond, { target: { value: "m3" } });

    expect(sideASecond.value).toBe("m3");
    expect(sideBFirst.value).toBe("m2");

    await waitFor(() => expect(persistTournamentStateAction).toHaveBeenCalledTimes(1));
    const savedMatch = vi.mocked(persistTournamentStateAction).mock.calls[0][1].matches[0];
    expect(savedMatch.sideAPlayerIds).toEqual(["m1", "m3"]);
    expect(savedMatch.sideBPlayerIds).toEqual(["m2", "m4"]);
  });
  it("shows duplicate teams and their match numbers at the bottom after a player swap", () => {
    const state = makeStateWithMatch();
    state.matches.push({
      ...state.matches[0],
      id: "match-2",
      matchNumber: 2,
      sortOrder: 2,
      sideAPlayerIds: ["m3", "m1"],
      sideBPlayerIds: ["m2", "m4"]
    });
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => undefined);

    render(<TournamentManageClient initialState={state} clubSlug="stc" />);

    fireEvent.click(screen.getByRole("button", { name: "대진표" }));
    expect(screen.queryByText("중복 팀 안내")).toBeNull();
    fireEvent.change(screen.getAllByLabelText("위쪽 2")[0], { target: { value: "m3" } });

    expect(alertSpy).not.toHaveBeenCalled();
    expect(screen.getByText("중복 팀 안내")).toBeTruthy();
    expect(screen.getByText("김철수 · 이민준 — 경기 1, 경기 2")).toBeTruthy();
    expect(screen.getByText("박영희 · 최지은 — 경기 1, 경기 2")).toBeTruthy();
    expect((screen.getAllByLabelText("위쪽 2")[0] as HTMLSelectElement).value).toBe("m3");
    alertSpy.mockRestore();
  });
  it("generates Hanul AA matches from the current dragged group order", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const { container } = render(<TournamentManageClient initialState={makeHanulStateWithCustomOrder()} clubSlug="stc" />);

    fireEvent.click(container.querySelector<HTMLButtonElement>("button.primary-button")!);

    await waitFor(() => expect(persistTournamentStateAction).toHaveBeenCalledTimes(1));
    const savedState = vi.mocked(persistTournamentStateAction).mock.calls[0][1];

    expect(savedState.matches[0].sideAPlayerIds).toEqual(["m5", "m4"]);
    expect(savedState.matches[0].sideBPlayerIds).toEqual(["m3", "m2"]);
    expect(savedState.matches[2].sideAPlayerIds).toEqual(["m4", "m3"]);
    expect(savedState.matches[2].sideBPlayerIds).toEqual(["m6", "m10"]);
  });

  it("does not show automatic seed labels for KDK-V2010 groups", () => {
    render(<TournamentManageClient initialState={makeKdkTenParticipantState()} clubSlug="stc" />);

    expect(screen.queryByText(/자동 시드/)).toBeNull();
  });

  it("saves a completed match only after the input complete button is pressed", async () => {
    render(<TournamentManageClient initialState={makeStateWithMatch()} clubSlug="stc" />);

    fireEvent.click(screen.getByRole("button", { name: "대진표" }));
    const completeButton = screen.getByRole("button", { name: "점수 입력 완료" });
    expect((completeButton as HTMLButtonElement).disabled).toBe(true);

    fireEvent.change(screen.getByLabelText("위쪽 팀 점수"), { target: { value: "6" } });
    expect((completeButton as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("아래쪽 팀 점수"), { target: { value: "3" } });

    expect(updateMatchScoreAction).not.toHaveBeenCalled();
    expect(persistTournamentStateAction).not.toHaveBeenCalled();
    expect((completeButton as HTMLButtonElement).disabled).toBe(false);

    fireEvent.click(completeButton);

    await waitFor(() => expect(updateMatchScoreAction).toHaveBeenCalledWith(
      { matchId: "match-1", sideAScore: 6, sideBScore: 3 },
      "stc"
    ));
    expect(persistTournamentStateAction).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByRole("button", { name: "저장 완료" })).toBeTruthy());
  });

  it("does not save score edits on blur", () => {
    render(<TournamentManageClient initialState={makeStateWithMatch()} clubSlug="stc" />);

    fireEvent.click(screen.getByRole("button", { name: "대진표" }));
    const topScoreInput = screen.getByLabelText("위쪽 팀 점수");
    fireEvent.change(topScoreInput, { target: { value: "6" } });
    fireEvent.change(screen.getByLabelText("아래쪽 팀 점수"), { target: { value: "3" } });
    fireEvent.blur(topScoreInput);

    expect(updateMatchScoreAction).not.toHaveBeenCalled();
    expect(persistTournamentStateAction).not.toHaveBeenCalled();
    expect(screen.getByText("점수를 확인한 후 점수 입력 완료를 눌러주세요.")).toBeTruthy();
  });
  it("opens fixed-pair tournament draw and saves a completed score explicitly", async () => {
    render(<TournamentManageClient initialState={makeFixedPairTournamentState()} clubSlug="stc" />);

    fireEvent.click(screen.getByRole("button", { name: "대진표" }));
    fireEvent.change(screen.getByLabelText("위쪽 팀 점수"), { target: { value: "6" } });
    fireEvent.change(screen.getByLabelText("아래쪽 팀 점수"), { target: { value: "3" } });

    expect(updateTournamentMatchStatesAction).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "점수 입력 완료" }));

    await waitFor(() => expect(updateTournamentMatchStatesAction).toHaveBeenCalledTimes(1));
    expect(persistTournamentStateAction).not.toHaveBeenCalled();
    expect(screen.getByDisplayValue("6")).toBeTruthy();
    expect(screen.getByDisplayValue("3")).toBeTruthy();
  });
  it("disables tournament score inputs for BYE matches", () => {
    render(<TournamentManageClient initialState={makeTournamentByeState()} clubSlug="stc" />);

    fireEvent.click(screen.getByRole("button", { name: "대진표" }));

    expect((screen.getByLabelText("위쪽 팀 점수") as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByLabelText("아래쪽 팀 점수") as HTMLInputElement).disabled).toBe(true);
  });

  it("does not repeat tournament seeds below the participant order", () => {
    const { container } = render(<TournamentManageClient initialState={makeNinePairTournamentState()} clubSlug="stc" />);

    expect(container.querySelector(".fixed-pair-preview")).toBeNull();
    expect(container.querySelectorAll(".group-selected-member-grid .sortable-participant")).toHaveLength(18);
  });

  it("saves a selected tournament BYE as an automatic winner in the next round", async () => {
    const { container } = render(<TournamentManageClient initialState={makeNinePairTournamentState()} clubSlug="stc" />);

    fireEvent.click(screen.getByRole("button", { name: "대진표" }));
    const byeSelect = container.querySelector<HTMLSelectElement>(".bye-selection-box select");
    expect(byeSelect).toBeTruthy();
    fireEvent.change(byeSelect!, { target: { value: "g1-match-4" } });

    await waitFor(() => expect(persistTournamentStateAction).toHaveBeenCalledTimes(1));
    const savedState = vi.mocked(persistTournamentStateAction).mock.calls[0][1];
    expect(savedState.matches[6].sideAPlayerIds).toEqual(["m13", "m14"]);
    expect(savedState.matches[8].sideAPlayerIds).toEqual(["m13", "m14"]);
  });

it("creates and saves a five-pair round robin league", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const { container } = render(<TournamentManageClient initialState={makeKdkTenParticipantState()} clubSlug="stc" />);
    const formatSelect = container.querySelector<HTMLSelectElement>(".format-field select");

    expect(formatSelect).toBeTruthy();
    fireEvent.change(formatSelect!, { target: { value: "fixed-pair-league" } });
    expect(container.querySelectorAll(".fixed-pair-card")).toHaveLength(5);

    fireEvent.click(screen.getByRole("button", { name: "대진표 생성" }));

    await waitFor(() => expect(persistTournamentStateAction).toHaveBeenCalledTimes(1));
    const savedState = vi.mocked(persistTournamentStateAction).mock.calls[0][1];
    const playCounts = new Map(savedState.members.map((member) => [member.id, 0]));
    for (const match of savedState.matches) {
      for (const memberId of [...match.sideAPlayerIds, ...match.sideBPlayerIds]) {
        playCounts.set(memberId, (playCounts.get(memberId) ?? 0) + 1);
      }
    }

    expect(savedState.groups[0].scheduleFormat).toBe("fixed-pair-league");
    expect(savedState.matches).toHaveLength(10);
    expect([...playCounts.values()]).toEqual(Array(10).fill(4));
  });

  it("hides singles and doubles tournament formats when multiple groups exist", () => {
    const state = makeStateWithParticipants();
    state.groups = [
      state.groups[0],
      { ...state.groups[0], id: "g2", name: "B조", sortOrder: 2 }
    ];
    state.groupMemberIds = { g1: [], g2: [] };

    const { container } = render(<TournamentManageClient initialState={state} clubSlug="stc" />);
    const expectGeneralFormatsOnly = () => {
      const select = container.querySelector<HTMLSelectElement>(".format-field select");
      expect(select).toBeTruthy();
      const values = Array.from(select!.options).map((option) => option.value);
      expect(values).toContain("fixed-pair-league");
      expect(values).not.toContain("fixed-pair-tournament");
      expect(values).not.toContain("single-tournament");
    };

    expectGeneralFormatsOnly();
    fireEvent.click(screen.getByRole("tab", { name: /B조.*0명/ }));
    expectGeneralFormatsOnly();
    expect(container.querySelectorAll(".group-setup-card")).toHaveLength(1);
  });
  it("shows dynamic setup tabs and only unassigned players for the active group", () => {
    const state = makeStateWithParticipants();
    state.groups = [
      state.groups[0],
      { ...state.groups[0], id: "g2", name: "B조", sortOrder: 2 }
    ];
    state.groupMemberIds = { g1: ["m1"], g2: ["m2"] };

    const { container } = render(<TournamentManageClient initialState={state} clubSlug="stc" />);
    expect(screen.getByRole("tab", { name: /A조.*1명/ }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("tab", { name: /B조.*1명/ })).toBeTruthy();
    expect(container.querySelector(".group-selected-member-grid")?.textContent).toContain("김철수");
    expect(container.querySelector(".unassigned-participant-grid")?.textContent).not.toContain("박영희");
    expect(container.querySelector(".unassigned-participant-grid")?.textContent).toContain("이민준");

    fireEvent.click(screen.getByRole("tab", { name: /B조.*1명/ }));
    expect(container.querySelector(".group-selected-member-grid")?.textContent).toContain("박영희");
    fireEvent.click(screen.getByRole("button", { name: "이민준" }));

    expect(screen.getByRole("tab", { name: /B조.*2명/ })).toBeTruthy();
    expect(container.querySelector(".group-selected-member-grid")?.textContent).toContain("이민준");
  });
  it("renumbers remaining groups after a group is deleted", () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const state = makeStateWithParticipants();
    state.groups = [
      state.groups[0],
      { ...state.groups[0], id: "g2", name: "B조", sortOrder: 2 },
      { ...state.groups[0], id: "g3", name: "C조", sortOrder: 3 },
      { ...state.groups[0], id: "g4", name: "D조", sortOrder: 4 }
    ];
    state.groupMemberIds = { g1: [], g2: [], g3: [], g4: ["m1"] };

    const { container } = render(<TournamentManageClient initialState={state} clubSlug="stc" />);
    fireEvent.click(screen.getByRole("tab", { name: /C조.*0명/ }));
    fireEvent.click(screen.getByRole("button", { name: "그룹 삭제" }));

    expect(screen.getByRole("tab", { name: /A조.*0명/ }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("tab", { name: /B조.*0명/ })).toBeTruthy();
    expect(screen.getByRole("tab", { name: /C조.*1명/ })).toBeTruthy();
    expect(screen.queryByRole("tab", { name: /D조/ })).toBeNull();

    fireEvent.click(screen.getByRole("tab", { name: /C조.*1명/ }));
    expect(container.querySelector(".group-selected-member-grid")?.textContent).toContain("김철수");
  });
  it("shows each group format in the draw title and hides manual matches for fixed pairs", () => {
    const state = makeStateWithMatch();
    state.groups = [
      { ...state.groups[0], name: "A조", scheduleFormat: "fixed-pair-league" },
      { ...state.groups[0], id: "g2", name: "B조", scheduleFormat: "kdk-v2010", sortOrder: 2 }
    ];
    state.groupMemberIds = { g1: ["m1", "m2", "m3", "m4"], g2: [] };

    const { container } = render(<TournamentManageClient initialState={state} clubSlug="stc" />);
    fireEvent.click(screen.getByRole("button", { name: "대진표" }));

    expect(container.querySelector(".draw-group-title")?.textContent).toContain("A조");
    expect(container.querySelector(".group-format-badge")?.textContent).toBe("고정 페어 리그");
    expect(screen.queryByRole("button", { name: "경기 추가" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "B조" }));

    expect(container.querySelector(".draw-group-title")?.textContent).toContain("B조");
    expect(container.querySelector(".group-format-badge")?.textContent).toBe("KDK-V2010");
    expect(screen.getByRole("button", { name: "경기 추가" })).toBeTruthy();
  });
  it("creates and saves a team battle schedule from balanced rosters", async () => {
    const state = makeState();
    state.tournament = { ...state.tournament, type: "team-battle" };
    state.tournaments = [{ ...state.tournaments[0], type: "team-battle" }];
    state.members = [
      { id: "m1", name: "청A", level: "A", notes: "" },
      { id: "m2", name: "청C", level: "C", notes: "" },
      { id: "m3", name: "백A", level: "A", notes: "" },
      { id: "m4", name: "백C", level: "C", notes: "" }
    ];
    state.groups = [];
    state.groupMemberIds = {};
    state.tournamentParticipantIds = { t1: state.members.map((member) => member.id) };
    state.teamAssignments = { t1: { m1: "blue", m2: "blue", m3: "white", m4: "white" } };
    vi.spyOn(window, "confirm").mockReturnValue(true);

    const { container } = render(<TournamentManageClient initialState={state} clubSlug="stc" />);
    expect(screen.getByText("청백 팀 편성")).toBeTruthy();
    expect(screen.queryByLabelText("여자팀 허용 여부")).toBeNull();
    const setupCards = Array.from(container.querySelectorAll(".court-assignment-box, .team-battle-game-plan"));
    expect(setupCards[0]?.classList.contains("court-assignment-box")).toBe(true);
    expect(setupCards[1]?.classList.contains("team-battle-game-plan")).toBe(true);
    expect(Array.from(container.querySelectorAll(".team-roster-card .today-card-top > span")).map((element) => element.textContent)).toEqual(["2명", "2명"]);
    expect((screen.getByLabelText("코트 개수") as HTMLSelectElement).value).toBe("1");
    expect((screen.getByLabelText("라운드 수") as HTMLSelectElement).value).toBe("5");
    fireEvent.change(screen.getByLabelText("코트 개수"), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText("라운드 수"), { target: { value: "4" } });
    fireEvent.click(screen.getByRole("button", { name: "청백전 대진 생성" }));

    await waitFor(() => expect(persistTournamentStateAction).toHaveBeenCalled());
    const saved = vi.mocked(persistTournamentStateAction).mock.calls[0][1];
    expect(saved.tournament.type).toBe("team-battle");
    expect(saved.groups).toHaveLength(1);
    expect(saved.groups[0].scheduleFormat).toBe("team-battle");
    expect(saved.matches).toHaveLength(4);
    expect(saved.matches.every((match) => match.sideAPlayerIds.every((id) => id === "m1" || id === "m2"))).toBe(true);
    expect(saved.matches.every((match) => match.courtNumber === "1")).toBe(true);
    expect(document.querySelectorAll(".admin-team-battle-round-card")).toHaveLength(4);
  });
  it("fills five rounds and lets the manager choose the smaller uneven-game groups", async () => {
    const state = makeState();
    state.tournament = { ...state.tournament, type: "team-battle" };
    state.tournaments = [{ ...state.tournaments[0], type: "team-battle" }];
    const blueMembers = Array.from({ length: 8 }, (_, index) => ({ id: `b${index + 1}`, name: `청${index + 1}`, level: "B", notes: "" }));
    const whiteMembers = Array.from({ length: 7 }, (_, index) => ({ id: `w${index + 1}`, name: `백${index + 1}`, level: "B", notes: "" }));
    state.members = [...blueMembers, ...whiteMembers];
    state.groups = [];
    state.groupMemberIds = {};
    state.tournamentParticipantIds = { t1: state.members.map((member) => member.id) };
    state.teamAssignments = {
      t1: Object.fromEntries([
        ...blueMembers.map((member) => [member.id, "blue"] as const),
        ...whiteMembers.map((member) => [member.id, "white"] as const)
      ])
    };
    vi.spyOn(window, "confirm").mockReturnValue(true);

    const firstView = render(<TournamentManageClient initialState={state} clubSlug="stc" />);
    expect(screen.getByText("5라운드 × 3코트 · 총 15경기")).toBeTruthy();
    expect(screen.getByText("사용할 코트 번호 선택")).toBeTruthy();
    expect(screen.getByText("3/3개 선택")).toBeTruthy();
    expect(screen.getByText("아래 번호를 눌러 실제 사용할 코트를 선택하세요.")).toBeTruthy();
    const replacement = await screen.findByRole("button", { name: /청5 4경기/ });
    fireEvent.click(replacement);
    expect(screen.getByRole("button", { name: /청5 3경기/ })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "청백전 대진 생성" }));

    await waitFor(() => expect(persistTournamentStateAction).toHaveBeenCalled());
    const saved = vi.mocked(persistTournamentStateAction).mock.calls.at(-1)?.[1];
    expect(saved?.matches).toHaveLength(15);
    const appearances = new Map<string, number>();
    saved?.matches.forEach((match) => [...match.sideAPlayerIds, ...match.sideBPlayerIds].forEach((id) => appearances.set(id, (appearances.get(id) ?? 0) + 1)));
    expect(appearances.get("b5")).toBe(3);
    expect(appearances.get("b1")).toBe(4);
    expect(appearances.get("w1")).toBe(5);
    expect(appearances.get("w2")).toBe(5);
    expect(saved?.matches.every((match, index) => match.courtNumber === String(index % 3 + 1))).toBe(true);
    expect(document.querySelectorAll(".admin-team-battle-round-card")).toHaveLength(5);
    expect(saved).toBeTruthy();
    firstView.unmount();
    render(<TournamentManageClient initialState={saved!} clubSlug="stc" />);

    await waitFor(() => expect(screen.getByRole("button", { name: /청5 3경기/ }).getAttribute("aria-pressed")).toBe("true"));
    expect(screen.getByRole("button", { name: /청1 4경기/ }).getAttribute("aria-pressed")).toBe("false");
    expect(screen.getByRole("button", { name: /백1 5경기/ }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "대진표" }));
    const bluePlayerSelect = screen.getAllByLabelText("청팀 1 선수 변경")[0] as HTMLSelectElement;
    const outgoingPlayerId = bluePlayerSelect.value;
    const restingPlayerId = Array.from(bluePlayerSelect.options).find((option) => option.value !== outgoingPlayerId)?.value;
    expect(restingPlayerId).toBeTruthy();
    const saveCount = vi.mocked(persistTournamentStateAction).mock.calls.length;
    fireEvent.change(bluePlayerSelect, { target: { value: restingPlayerId } });

    await waitFor(() => expect(vi.mocked(persistTournamentStateAction).mock.calls.length).toBeGreaterThan(saveCount));
    const changed = vi.mocked(persistTournamentStateAction).mock.calls.at(-1)?.[1];
    expect(changed?.matches[0].sideAPlayerIds).toContain(restingPlayerId);
    expect(changed?.matches[0].sideAPlayerIds).not.toContain(outgoingPlayerId);
    const firstRoundPlayerIds = changed?.matches.slice(0, 3).flatMap((match) => [...match.sideAPlayerIds, ...match.sideBPlayerIds]) ?? [];
    expect(new Set(firstRoundPlayerIds).size).toBe(firstRoundPlayerIds.length);
    expect(state.teamAssignments?.t1[restingPlayerId!]).toBe("blue");
  });
  it("shows duplicate team details for a team battle only in the admin draw", () => {
    const state = makeStateWithMatch();
    state.tournament = { ...state.tournament, type: "team-battle" };
    state.tournaments = [{ ...state.tournaments[0], type: "team-battle" }];
    state.groups = [{ ...state.groups[0], scheduleFormat: "team-battle" }];
    state.groupMemberIds = { g1: state.members.slice(0, 4).map((member) => member.id) };
    state.tournamentParticipantIds = { t1: state.members.slice(0, 4).map((member) => member.id) };
    state.teamAssignments = { t1: { m1: "blue", m2: "blue", m3: "white", m4: "white" } };
    state.matches = [
      { ...state.matches[0], sideAPlayerIds: ["m1", "m2"], sideBPlayerIds: ["m3", "m4"], courtNumber: "1" },
      { ...state.matches[0], id: "team-match-2", matchNumber: 2, sortOrder: 2, sideAPlayerIds: ["m2", "m1"], sideBPlayerIds: ["m4", "m3"], courtNumber: "1" }
    ];
    const memberName = (id: string) => state.members.find((member) => member.id === id)?.name;

    render(<TournamentManageClient initialState={state} clubSlug="stc" />);
    fireEvent.click(screen.getByRole("button", { name: "대진표" }));

    expect(screen.getByText("중복 팀 안내")).toBeTruthy();
    expect(screen.getByText(`${memberName("m1")} · ${memberName("m2")} — 경기 1, 경기 2`)).toBeTruthy();
    expect(screen.getByText(`${memberName("m3")} · ${memberName("m4")} — 경기 1, 경기 2`)).toBeTruthy();
  });

  it("resets every existing team battle match and score before regenerating", async () => {
    const state = makeStateWithMatch();
    state.tournament = { ...state.tournament, type: "team-battle" };
    state.tournaments = [{ ...state.tournaments[0], type: "team-battle" }];
    state.members = [
      { id: "m1", name: "청1", level: "B", notes: "" },
      { id: "m2", name: "청2", level: "B", notes: "" },
      { id: "m3", name: "백1", level: "B", notes: "" },
      { id: "m4", name: "백2", level: "B", notes: "" }
    ];
    state.groups = [{ id: "g1", tournamentId: "t1", name: "청백전", scheduleFormat: "team-battle", sortOrder: 1 }];
    state.groupMemberIds = { g1: state.members.map((member) => member.id) };
    state.tournamentParticipantIds = { t1: state.members.map((member) => member.id) };
    state.teamAssignments = { t1: { m1: "blue", m2: "blue", m3: "white", m4: "white" } };
    state.matches = [{ ...state.matches[0], sideAPlayerIds: ["m1", "m2"], sideBPlayerIds: ["m3", "m4"], sideAScore: 6, sideBScore: 3, status: "completed" }];
    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<TournamentManageClient initialState={state} clubSlug="stc" />);
    fireEvent.change(screen.getByLabelText("코트 개수"), { target: { value: "1" } });
    fireEvent.click(screen.getByRole("button", { name: "기존 대진 초기화 후 다시 생성" }));

    await waitFor(() => expect(persistTournamentStateAction).toHaveBeenCalled());
    const saved = vi.mocked(persistTournamentStateAction).mock.calls.at(-1)?.[1];
    expect(saved?.matches).toHaveLength(1);
    expect(saved?.matches.every((match) => match.status === "scheduled" && match.sideAScore === null && match.sideBScore === null)).toBe(true);
  });
});
