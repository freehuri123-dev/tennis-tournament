import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemberForm } from "./MemberForm";

vi.mock("@/lib/server/actions/member-actions", () => ({
  deleteMemberAction: vi.fn(),
  saveMemberAction: vi.fn()
}));

describe("MemberForm", () => {
  it("preserves Play Tennis numeric levels and lists them from 7 down to 1", () => {
    render(<MemberForm clubSlug="pt" member={{ id: "pt-m01", name: "감독진", level: "7", notes: "" }} />);

    const select = screen.getByRole("combobox", { name: "등급" }) as HTMLSelectElement;
    expect(select.value).toBe("7");
    expect(Array.from(select.options).map((option) => option.value)).toEqual(["7", "6", "5", "4", "3", "2", "1"]);
  });

  it("keeps A through D options unchanged for existing clubs", () => {
    render(<MemberForm clubSlug="stc" member={{ id: "m1", name: "회원", level: "C", notes: "" }} />);

    const select = screen.getByRole("combobox", { name: "등급" }) as HTMLSelectElement;
    expect(select.value).toBe("C");
    expect(Array.from(select.options).map((option) => option.value)).toEqual(["A", "B", "C", "D"]);
  });
});
