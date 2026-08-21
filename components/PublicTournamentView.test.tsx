import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PublicTournamentView } from "./PublicTournamentView";
import { createInitialState } from "../lib/store/tournament-store";

describe("PublicTournamentView auto refresh", () => {
  const originalLocation = window.location;

  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...originalLocation, reload: vi.fn() }
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation
    });
  });

  it("5분마다 화면을 새로고침한다", () => {
    render(<PublicTournamentView state={createInitialState()} slug="1234" clubSlug="stc" />);

    act(() => {
      vi.advanceTimersByTime(5 * 60 * 1000);
    });

    expect(window.location.reload).toHaveBeenCalledTimes(1);
  });

  it("renders every group in the tablet overview board", () => {
    const state = createInitialState();
    const { container } = render(<PublicTournamentView state={state} slug="1234" clubSlug="stc" />);

    expect(container.querySelectorAll(".public-tablet-group")).toHaveLength(state.groups.length);
  });

  it("links to public records for the tournament year", () => {
    const { container } = render(<PublicTournamentView state={createInitialState()} slug="1234" clubSlug="stc" />);

    expect(container.querySelector(".public-records-link")?.getAttribute("href")).toBe("/public/stc/records?year=2026");
  });
  it("omits only ranking-excluded members while preserving the completed match for everyone else", () => {
    const state = createInitialState();
    state.members = [
      { id: "m1", name: "Excluded", gender: "male", notes: "" },
      { id: "m3", name: "Partner", gender: "male", notes: "" },
      { id: "m4", name: "Opponent One", gender: "male", notes: "" },
      { id: "m5", name: "Opponent Two", gender: "male", notes: "" }
    ];
    state.tournament = { ...state.tournament, rankingExcludedMemberIds: ["m1"] };
    state.tournaments = [{ ...state.tournament }];
    state.groups = [{ id: "g1", tournamentId: state.tournament.id, name: "A", scheduleFormat: "random", sortOrder: 1 }];
    state.groupMemberIds = { g1: ["m1", "m3", "m4", "m5"] };
    state.matches = [{
      id: "match-1",
      tournamentId: state.tournament.id,
      groupId: "g1",
      matchNumber: 1,
      sideAPlayerIds: ["m1", "m3"],
      sideBPlayerIds: ["m4", "m5"],
      sideAScore: 6,
      sideBScore: 4,
      status: "completed",
      sortOrder: 1
    }];

    const { container } = render(<PublicTournamentView state={state} slug={state.tournament.publicSlug} clubSlug="stc" />);
    fireEvent.click(container.querySelectorAll<HTMLButtonElement>(".public-phone-view .tab-button")[1]);

    const rankingText = container.querySelector(".ranking-card-list")?.textContent ?? "";
    expect(rankingText).not.toContain("Excluded");
    expect(rankingText).toContain("Partner");
    expect(rankingText).toContain("Opponent One");
    expect(rankingText).toContain("Opponent Two");
    expect(container.querySelectorAll(".ranking-card")).toHaveLength(3);
    expect(Array.from(container.querySelectorAll(".ranking-card")).find((card) => card.textContent?.includes("Partner"))?.textContent).toContain("+2");
  });

  it("hides the annual records link for tournaments excluded from club records", () => {
    const state = createInitialState();
    state.tournament = { ...state.tournament, includeInClubRecords: false };
    state.tournaments = [{ ...state.tournament }];

    const { container } = render(<PublicTournamentView state={state} slug={state.tournament.publicSlug} clubSlug="stc" />);

    expect(container.querySelector(".public-records-link")).toBeNull();
  });

  it("falls back to the legacy schedule without dropping matches when round metadata is partial", () => {
    const state = createInitialState();
    state.groups = [{ id: "mixed-group", tournamentId: state.tournament.id, name: "전체", scheduleFormat: "random", sortOrder: 1 }];
    state.groupMemberIds = { "mixed-group": state.members.slice(0, 4).map((member) => member.id) };
    const baseMatch = {
      tournamentId: state.tournament.id,
      groupId: "mixed-group",
      sideAPlayerIds: state.members.slice(0, 2).map((member) => member.id),
      sideBPlayerIds: state.members.slice(2, 4).map((member) => member.id),
      sideAScore: null,
      sideBScore: null,
      status: "scheduled" as const
    };
    state.matches = [
      { ...baseMatch, id: "explicit-match", matchNumber: 1, sortOrder: 1, roundNumber: 1 },
      { ...baseMatch, id: "legacy-match", matchNumber: 2, sortOrder: 2 }
    ];

    const { container } = render(<PublicTournamentView state={state} slug={state.tournament.publicSlug} clubSlug="stc" />);

    expect(container.querySelectorAll(".explicit-round-card")).toHaveLength(0);
    expect(container.querySelectorAll(".public-phone-view .public-match-card")).toHaveLength(2);
    expect(container.querySelector(".public-phone-view")?.textContent).toContain("경기 1");
    expect(container.querySelector(".public-phone-view")?.textContent).toContain("경기 2");
  });

  it("renders persisted event rounds and court labels without the internal format badge", () => {
    const state = createInitialState();
    const tournament = { ...state.tournament, scheduleLocked: true };
    state.tournament = tournament;
    state.tournaments = [tournament];
    state.groups = [{ id: "event-group", tournamentId: tournament.id, name: "이벤트", scheduleFormat: "random", sortOrder: 1 }];
    state.groupMemberIds = { "event-group": state.members.slice(0, 4).map((member) => member.id) };
    state.matches = Array.from({ length: 8 }, (_, index) => ({
      id: `event-match-${index + 1}`,
      tournamentId: tournament.id,
      groupId: "event-group",
      matchNumber: index + 1,
      sideAPlayerIds: state.members.slice(0, 2).map((member) => member.id),
      sideBPlayerIds: state.members.slice(2, 4).map((member) => member.id),
      sideAScore: null,
      sideBScore: null,
      status: "scheduled" as const,
      sortOrder: index + 1,
      roundNumber: Math.floor(index / 4) + 1,
      courtNumber: String((index % 4) + 1)
    }));

    const { container } = render(<PublicTournamentView state={state} slug={tournament.publicSlug} clubSlug="pt" />);

    expect(container.querySelectorAll(".explicit-round-card")).toHaveLength(2);
    expect(container.querySelectorAll(".explicit-round-card .public-match-card")).toHaveLength(8);
    expect(screen.getByText("1라운드")).toBeTruthy();
    expect(screen.getByText("2라운드")).toBeTruthy();
    expect(container.querySelector(".explicit-round-card")?.textContent).toContain("1번 코트");
    expect(container.querySelector(".group-format-badge")).toBeNull();
  });

it("removes overall ranking and renders team standings when a fixed pair league exists", () => {
    const state = createInitialState();
    state.groups = state.groups.map((group, index) => index === 0 ? { ...group, scheduleFormat: "fixed-pair-league" } : group);
    const { container } = render(<PublicTournamentView state={state} slug="1234" clubSlug="stc" />);
    const tabLabels = Array.from(container.querySelectorAll(".tab-button")).map((button) => button.textContent);

    expect(tabLabels).toEqual(["대진표", "그룹 순위"]);
    expect(tabLabels).not.toContain("전체 순위");
    expect(container.querySelector(".group-format-badge")?.textContent).toBe("고정 페어 리그");

    fireEvent.click(screen.getByRole("tab", { name: "그룹 순위" }));

    expect(container.querySelectorAll(".group-tab")).toHaveLength(2);
    expect(container.querySelectorAll(".team-ranking-stat-grid").length).toBeGreaterThan(0);
  });
  it("shows only schedule and team score tabs for a team battle", () => {
    const state = createInitialState();
    state.tournament = { ...state.tournament, type: "team-battle" };
    state.tournaments = [{ ...state.tournament }];
    state.groups = [{ id: "team-g", tournamentId: state.tournament.id, name: "청백전", scheduleFormat: "team-battle", sortOrder: 1 }];
    state.groupMemberIds = { "team-g": state.members.slice(0, 4).map((member) => member.id) };
    state.tournamentParticipantIds = { [state.tournament.id]: state.members.slice(0, 4).map((member) => member.id) };
    state.teamAssignments = { [state.tournament.id]: Object.fromEntries(state.members.slice(0, 4).map((member, index) => [member.id, index < 2 ? "blue" : "white"])) };
    state.matches = [{
      id: "team-match", tournamentId: state.tournament.id, groupId: "team-g", matchNumber: 1,
      sideAPlayerIds: state.members.slice(0, 2).map((member) => member.id),
      sideBPlayerIds: state.members.slice(2, 4).map((member) => member.id),
      sideAScore: 6, sideBScore: 4, status: "completed", sortOrder: 1, courtNumber: "1"
    }, {
      id: "team-match-2", tournamentId: state.tournament.id, groupId: "team-g", matchNumber: 2,
      sideAPlayerIds: state.members.slice(0, 2).map((member) => member.id),
      sideBPlayerIds: state.members.slice(2, 4).map((member) => member.id),
      sideAScore: 3, sideBScore: 6, status: "completed", sortOrder: 2, courtNumber: "2"
    }, {
      id: "team-match-3", tournamentId: state.tournament.id, groupId: "team-g", matchNumber: 3,
      sideAPlayerIds: state.members.slice(0, 2).map((member) => member.id),
      sideBPlayerIds: state.members.slice(2, 4).map((member) => member.id),
      sideAScore: 6, sideBScore: 2, status: "completed", sortOrder: 3, courtNumber: "3"
    }, {
      id: "team-match-4", tournamentId: state.tournament.id, groupId: "team-g", matchNumber: 4,
      sideAPlayerIds: state.members.slice(0, 2).map((member) => member.id),
      sideBPlayerIds: state.members.slice(2, 4).map((member) => member.id),
      sideAScore: null, sideBScore: null, status: "scheduled", sortOrder: 4, courtNumber: "1"
    }];
    const { container } = render(<PublicTournamentView state={state} slug={state.tournament.publicSlug} clubSlug="stc" />);
    const tabLabels = Array.from(container.querySelectorAll(".tab-button")).map((button) => button.textContent);
    expect(tabLabels).toEqual(["대진표", "팀 스코어"]);
    expect(screen.queryByText("중복 팀 안내")).toBeNull();
    expect(Array.from(container.querySelectorAll(".team-side-badge")).map((badge) => badge.textContent)).toEqual(expect.arrayContaining(["청팀", "백팀"]));
    expect(container.querySelector(".team-battle-roster-summary")?.textContent).toContain("김철수");
    expect(container.querySelectorAll(".team-roster-member-list b")).toHaveLength(0);
    const roundCards = Array.from(container.querySelectorAll<HTMLDetailsElement>(".public-team-battle-round-card"));
    expect(roundCards).toHaveLength(2);
    expect(roundCards[0].open).toBe(false);
    expect(roundCards[0].querySelector(".public-team-battle-round-score")?.textContent).toContain("1라운드 결과");
    expect(roundCards[0].querySelector(".public-team-battle-round-score")?.textContent).toContain("청팀 2 : 1 백팀");
    expect(roundCards[1].open).toBe(true);
    fireEvent.click(roundCards[0].querySelector("summary")!);
    expect(roundCards[0].open).toBe(true);
    expect(container.querySelector(".tournament-round-head")?.textContent).toContain("1라운드");
    expect(container.querySelector(".header-title")?.textContent).toBe(`STC 테니스 클럽 - ${state.tournament.name} - 대진표`);
    fireEvent.click(screen.getByRole("tab", { name: "팀 스코어" }));
    expect(screen.queryByText("청백전 대진표")).toBeNull();
    expect(screen.getByText("청백전 팀 스코어")).toBeTruthy();
    expect(screen.getByRole("tab", { name: "팀 스코어" }).getAttribute("aria-selected")).toBe("true");
    expect(container.querySelector(".team-battle-scoreboard")?.textContent).toContain("청팀2:백팀1");
    expect(screen.getByText("팀 기여도")).toBeTruthy();
    expect(screen.getByLabelText("김철수 팀 승리 기여도 100%")).toBeTruthy();
  });
});
