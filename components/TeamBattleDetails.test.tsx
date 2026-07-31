import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Match, Member } from "@/lib/domain/types";
import { TeamBattleContributionDetails } from "./TeamBattleDetails";

const blueMembers: Member[] = [
  { id: "blue-park", name: "\uBC15\uC9C0\uC218", notes: "" },
  { id: "blue-choi", name: "\uCD5C\uC11C\uC724", notes: "" },
  { id: "blue-lee", name: "\uC774\uB3C4\uC724", notes: "" },
  { id: "blue-kim", name: "\uAE40\uBBFC\uC218", notes: "" }
];

const whiteMembers: Member[] = [
  { id: "white-a", name: "\uD55C\uC720\uC9C4", notes: "" },
  { id: "white-b", name: "\uC815\uC2DC\uC6B0", notes: "" }
];

function completedBlueWin(id: string, sideAPlayerIds: string[]): Match {
  return {
    id,
    tournamentId: "t1",
    groupId: "g1",
    matchNumber: Number(id),
    sideAPlayerIds,
    sideBPlayerIds: ["white-a", "white-b"],
    sideAScore: 6,
    sideBScore: 3,
    status: "completed",
    sortOrder: Number(id)
  };
}

describe("TeamBattleContributionDetails", () => {
  it("shows each player's team-win participation rate and sorts by percent then name", () => {
    const matches = [
      completedBlueWin("1", ["blue-park", "blue-kim"]),
      completedBlueWin("2", ["blue-park", "blue-lee"]),
      completedBlueWin("3", ["blue-kim", "blue-lee"]),
      completedBlueWin("4", ["blue-choi", "blue-kim"]),
      completedBlueWin("5", ["blue-choi", "blue-lee"])
    ];

    const { container } = render(
      <TeamBattleContributionDetails blueMembers={blueMembers} whiteMembers={whiteMembers} matches={matches} />
    );

    const names = [...container.querySelectorAll(".team-contribution-card.blue .team-contribution-member strong")]
      .map((element) => element.textContent);

    expect(names).toEqual(["\uAE40\uBBFC\uC218", "\uC774\uB3C4\uC724", "\uBC15\uC9C0\uC218", "\uCD5C\uC11C\uC724"]);
    expect(screen.getByLabelText("\uAE40\uBBFC\uC218 \uD300 \uC2B9\uB9AC \uAE30\uC5EC\uB3C4 60%")).toBeTruthy();
    expect(screen.getByLabelText("\uC774\uB3C4\uC724 \uD300 \uC2B9\uB9AC \uAE30\uC5EC\uB3C4 60%")).toBeTruthy();
    expect(screen.getByLabelText("\uBC15\uC9C0\uC218 \uD300 \uC2B9\uB9AC \uAE30\uC5EC\uB3C4 40%")).toBeTruthy();
    expect(screen.getByLabelText("\uCD5C\uC11C\uC724 \uD300 \uC2B9\uB9AC \uAE30\uC5EC\uB3C4 40%")).toBeTruthy();
  });

  it("excludes temporary substitutes from contribution rows while counting their team wins", () => {
    const matches: Match[] = [
      completedBlueWin("1", ["blue-park", "guest-late"]),
      completedBlueWin("2", ["guest-late", "guest-other"])
    ];

    const { container } = render(
      <TeamBattleContributionDetails blueMembers={[blueMembers[0]]} whiteMembers={whiteMembers} matches={matches} />
    );

    expect(screen.queryByText("guest-late")).toBeNull();
    expect(container.querySelector(".team-contribution-card.blue .team-personal-ranking-head strong")?.textContent).toBe("1명");
    expect(screen.getByLabelText("박지수 팀 승리 기여도 50%")).toBeTruthy();
  });
});
