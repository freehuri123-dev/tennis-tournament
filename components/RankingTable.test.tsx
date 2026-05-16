import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RankingTable } from "./RankingTable";

describe("RankingTable", () => {
  it("shows points-for and points-against details when point diff is tied", () => {
    render(
      <RankingTable
        rows={[
          { memberId: "m1", name: "1번", rank: 1, wins: 2, draws: 0, losses: 0, rankingPoints: 6, pointsFor: 12, pointsAgainst: 4, pointDiff: 8 },
          { memberId: "m2", name: "2번", rank: 2, wins: 1, draws: 0, losses: 1, rankingPoints: 3, pointsFor: 6, pointsAgainst: 4, pointDiff: 2 },
          { memberId: "m3", name: "3번", rank: 3, wins: 1, draws: 0, losses: 1, rankingPoints: 3, pointsFor: 5, pointsAgainst: 3, pointDiff: 2 }
        ]}
      />
    );

    expect(screen.getByText("득실 동률: 득점 6 / 실점 4")).toBeTruthy();
    expect(screen.getByText("득실 동률: 득점 5 / 실점 3")).toBeTruthy();
    expect(screen.queryByText("득실 동률: 득점 12 / 실점 4")).toBeNull();
  });
});
