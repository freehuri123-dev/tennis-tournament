import { act, render } from "@testing-library/react";
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
});
