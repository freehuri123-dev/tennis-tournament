import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PublicTvTournamentView } from "./PublicTvTournamentView";
import { createInitialState } from "../lib/store/tournament-store";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh })
}));

describe("PublicTvTournamentView", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    refresh.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the schedule slide with every group board", () => {
    const state = createInitialState();
    const { container } = render(<PublicTvTournamentView state={state} clubSlug="stc" />);

    expect(container.querySelector(".tv-page")).not.toBeNull();
    expect(container.textContent).toContain("전체 대진표");
    expect(container.textContent).toContain("다다음");
    expect(container.querySelectorAll(".tv-group-board")).toHaveLength(state.groups.length);
  });

  it("slides from schedule to ranking summary", () => {
    const { container } = render(<PublicTvTournamentView state={createInitialState()} clubSlug="stc" />);

    act(() => {
      vi.advanceTimersByTime(8_000);
    });

    expect(container.textContent).toContain("조별 순위 요약");
    expect(container.textContent).toContain("전체 순위");
  });

  it("refreshes tournament data every 10 seconds", () => {
    render(<PublicTvTournamentView state={createInitialState()} clubSlug="stc" />);

    act(() => {
      vi.advanceTimersByTime(10_000);
    });

    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
