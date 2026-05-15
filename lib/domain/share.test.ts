import { describe, expect, it, vi } from "vitest";
import { shareTournamentLink } from "./share";

describe("shareTournamentLink", () => {
  it("falls back to clipboard copy when native share fails", async () => {
    const share = vi.fn().mockRejectedValue(new Error("share unavailable"));
    const writeText = vi.fn().mockResolvedValue(undefined);
    const notify = vi.fn();

    const result = await shareTournamentLink({
      title: "5월 월례대회",
      text: "대진표를 확인하세요.",
      url: "https://example.com/public/monthly-demo",
      share,
      writeText,
      notify
    });

    expect(result).toBe("copied");
    expect(writeText).toHaveBeenCalledWith("https://example.com/public/monthly-demo");
    expect(notify).toHaveBeenCalledWith("공유 링크를 복사했습니다. 카카오톡에 붙여넣어 공유해주세요.");
  });

  it("does not copy when the user cancels native share", async () => {
    const share = vi.fn().mockRejectedValue(new DOMException("cancelled", "AbortError"));
    const writeText = vi.fn().mockResolvedValue(undefined);

    const result = await shareTournamentLink({
      title: "5월 월례대회",
      text: "대진표를 확인하세요.",
      url: "https://example.com/public/monthly-demo",
      share,
      writeText,
      notify: vi.fn()
    });

    expect(result).toBe("cancelled");
    expect(writeText).not.toHaveBeenCalled();
  });
});
