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
    expect(screen.getByLabelText("김철수 팀 승리 기여도 50%")).toBeTruthy();
  });
});
