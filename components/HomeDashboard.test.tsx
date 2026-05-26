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

    expect(screen.getByRole("link", { name: /5월 정기대회/ }).getAttribute("href")).toBe(
      "/stc/tournaments/manage?tournamentId=t1"
    );
  });
});
