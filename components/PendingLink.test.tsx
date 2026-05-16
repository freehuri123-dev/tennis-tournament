import { fireEvent, render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { PendingLink } from "./PendingLink";

vi.mock("next/link", () => ({
  default: ({ children, onClick, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { children: ReactNode }) => (
    <a
      {...props}
      onClick={(event) => {
        onClick?.(event);
        event.preventDefault();
      }}
    >
      {children}
    </a>
  )
}));

describe("PendingLink", () => {
  it("shows a loading overlay for page navigation links", () => {
    render(<PendingLink href="/stc/tournaments/manage?tournamentId=t1">상세 이동</PendingLink>);

    fireEvent.click(screen.getByRole("link", { name: "상세 이동" }));

    expect(screen.getByRole("status")).toBeTruthy();
  });

  it("does not show a loading overlay when pending feedback is disabled", () => {
    render(
      <PendingLink href="/stc/tournaments?tab=completed" showPending={false}>
        완료 대회
      </PendingLink>
    );

    fireEvent.click(screen.getByRole("link", { name: "완료 대회" }));

    expect(screen.queryByRole("status")).toBeNull();
  });
});
