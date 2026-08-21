import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import ClubTournamentsPage from "./page";
import { listTournamentsByClub } from "@/lib/server/repositories/tournament-repository";

vi.mock("@/lib/server/repositories/tournament-repository", () => ({
  listTournamentsByClub: vi.fn()
}));

vi.mock("@/lib/server/actions/tournament-actions", () => ({
  createTournamentAction: vi.fn(),
  deleteTournamentAction: vi.fn()
}));

describe("ClubTournamentsPage", () => {
  it("omits the delete control only for schedule-locked tournaments", async () => {
    vi.mocked(listTournamentsByClub).mockResolvedValue([
      {
        id: "locked-event",
        name: "잠긴 이벤트",
        date: "2099-08-22",
        publicSlug: "2822",
        status: "draft",
        scheduleLocked: true
      },
      {
        id: "editable-event",
        name: "일반 대회",
        date: "2099-08-23",
        publicSlug: "2823",
        status: "draft",
        scheduleLocked: false
      }
    ]);

    const listPageElement = await ClubTournamentsPage({
      params: Promise.resolve({ clubSlug: "pt" }),
      searchParams: Promise.resolve({ tab: "current" })
    }) as ReactElement;
    const page = await (listPageElement.type as (props: unknown) => Promise<ReactElement>)(listPageElement.props);
    const { container } = render(page);
    const rows = Array.from(container.querySelectorAll(".tournament-list-row"));
    const lockedRow = rows.find((row) => row.querySelector(".tournament-card strong")?.textContent === "잠긴 이벤트");
    const editableRow = rows.find((row) => row.querySelector(".tournament-card strong")?.textContent === "일반 대회");

    expect(lockedRow).toBeDefined();
    expect(editableRow).toBeDefined();
    expect(lockedRow!.querySelector(".tournament-delete-button")).toBeNull();
    expect(editableRow!.querySelector(".tournament-delete-button")).not.toBeNull();
  });
});

