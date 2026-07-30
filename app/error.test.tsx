import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AppError from "./error";

describe("AppError", () => {
  it("offers a retry action for transient server errors", () => {
    const reset = vi.fn();

    render(<AppError error={Object.assign(new Error("temporary"), { digest: "1234" })} reset={reset} />);

    expect(screen.getByText("잠시 연결이 지연되고 있습니다")).toBeTruthy();
    expect(screen.getByText("오류번호: 1234")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(reset).toHaveBeenCalledOnce();
  });
});