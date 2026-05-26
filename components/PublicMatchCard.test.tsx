import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PublicMatchCard } from "./PublicMatchCard";
import type { Match, Member } from "../lib/domain/types";

const members: Member[] = [
  { id: "m1", name: "김철수", notes: "" },
  { id: "m2", name: "박영희", notes: "" },
  { id: "m3", name: "이민수", notes: "" },
  { id: "m4", name: "최준호", notes: "" }
];

const baseMatch: Match = {
  id: "match-1",
  tournamentId: "t1",
  groupId: "g1",
  matchNumber: 3,
  sideAPlayerIds: ["m1", "m2"],
  sideBPlayerIds: ["m3", "m4"],
  sideAScore: null,
  sideBScore: null,
  status: "scheduled",
  sortOrder: 3
};

describe("PublicMatchCard", () => {
  it("관리자 대진표처럼 양팀과 중앙 스코어를 읽기 전용으로 보여준다", () => {
    render(<PublicMatchCard match={baseMatch} members={members} />);

    expect(screen.getByText("경기 3")).toBeTruthy();
    expect(screen.getByText("김철수")).toBeTruthy();
    expect(screen.getByText("박영희")).toBeTruthy();
    expect(screen.getByText("이민수")).toBeTruthy();
    expect(screen.getByText("최준호")).toBeTruthy();
    expect(screen.getByText("VS")).toBeTruthy();
    expect(screen.getByText("대기")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByRole("combobox")).toBeNull();
  });

  it("점수가 있으면 점수를 표시한다", () => {
    render(<PublicMatchCard match={{ ...baseMatch, sideAScore: 6, sideBScore: 4, status: "completed" }} members={members} />);

    expect(screen.getByText("6:4")).toBeTruthy();
  });
});
