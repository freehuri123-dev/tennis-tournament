import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HomeDashboard } from "./HomeDashboard";

describe("HomeDashboard", () => {
  it("links recent tournaments directly to their manage pages", () => {
    render(
      <HomeDashboard
        clubSlug="stc"
        tournaments={[
          { id: "t1", name: "5월 정기대회", date: "2026-05-24", publicSlug: "1234", status: "draft" }
        ]}
      />
    );

    expect(screen.getByRole("link", { name: /대회 바로 관리/ }).getAttribute("href")).toBe(
      "/stc/tournaments/manage?tournamentId=t1"
    );
  });

  it("features the newest tournament and keeps the management shortcuts", () => {
    render(
      <HomeDashboard
        clubSlug="stc"
        tournaments={[
          { id: "older", name: "6월 정기대회", date: "2026-06-14", publicSlug: "5678", status: "completed" },
          { id: "newest", name: "7월 정기대회", date: "2026-07-19", publicSlug: "9012", status: "draft" }
        ]}
      />
    );

    expect(screen.getByRole("link", { name: /대회 바로 관리/ }).getAttribute("href")).toBe(
      "/stc/tournaments/manage?tournamentId=newest"
    );
    expect(screen.getByRole("link", { name: /회원관리/ }).getAttribute("href")).toBe("/stc/members");
    expect(screen.getByRole("link", { name: /대회관리/ }).getAttribute("href")).toBe("/stc/tournaments");
    expect(screen.getByRole("link", { name: /기록\/랭킹/ }).getAttribute("href")).toBe("/stc/records");
  });
});
