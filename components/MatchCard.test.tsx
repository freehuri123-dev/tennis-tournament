import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MatchCard } from "./MatchCard";
import type { Match, Member } from "@/lib/domain/types";

const members: Member[] = [
  { id: "m1", name: "김철수", notes: "" },
  { id: "m2", name: "박영희", notes: "" },
  { id: "m3", name: "이민준", notes: "" },
  { id: "m4", name: "최지은", notes: "" }
];

function makeMatch(patch: Partial<Match> = {}): Match {
  return {
    id: "match-1",
    tournamentId: "t1",
    groupId: "g1",
    matchNumber: 1,
    sideAPlayerIds: ["m1", "m2"],
    sideBPlayerIds: ["m3", "m4"],
    sideAScore: null,
    sideBScore: null,
    status: "scheduled",
    sortOrder: 1,
    ...patch
  };
}

describe("MatchCard", () => {
  it("keeps completed matches collapsed while showing the score in the summary", () => {
    const { container } = render(<MatchCard match={makeMatch({ sideAScore: 6, sideBScore: 4, status: "completed" })} members={members} />);

    const details = container.querySelector("details");
    expect(details?.hasAttribute("open")).toBe(false);
    expect(screen.getByText("경기 1")).toBeTruthy();
    expect(screen.getAllByText("6:4").length).toBeGreaterThan(0);
    expect(screen.getByText("완료")).toBeTruthy();
  });

  it("keeps pending matches open so the next game is immediately visible", () => {
    const { container } = render(<MatchCard match={makeMatch()} members={members} />);

    const details = container.querySelector("details");
    expect(details?.hasAttribute("open")).toBe(true);
    expect(screen.getAllByText("VS").length).toBeGreaterThan(0);
    expect(screen.getByText("대기")).toBeTruthy();
  });
});
