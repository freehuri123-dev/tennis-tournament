import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { TournamentCreateForm } from "./TournamentCreateForm";

it("requires a tournament type before creating a tournament", () => {
  const action = vi.fn();
  const alert = vi.spyOn(window, "alert").mockImplementation(() => undefined);
  render(<TournamentCreateForm action={action} clubSlug="stc" />);

  expect(screen.getByRole("option", { name: "대회유형선택" })).toBeTruthy();
  expect(screen.getByRole("option", { name: "일반대회(KDK/고정페어)" })).toBeTruthy();
  expect(screen.getByRole("option", { name: "청백전(단체전)" })).toBeTruthy();
  expect(screen.getByRole("option", { name: "토너먼트(단식/복식)" })).toBeTruthy();

  fireEvent.click(screen.getByRole("button", { name: "새 대회 만들기" }));
  expect(alert).toHaveBeenCalledWith("대회 유형을 선택해주세요.");
  expect(action).not.toHaveBeenCalled();
});
