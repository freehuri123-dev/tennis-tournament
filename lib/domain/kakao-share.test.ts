import { describe, expect, it, vi } from "vitest";
import { openKakaoTournamentShare } from "./kakao-share";

const input = {
  javascriptKey: "javascript-key",
  title: "STC 테니스 클럽 - 7월 정기대회",
  description: "테니스매치업 대진표를 확인하세요.",
  url: "https://example.com/public/stc/1234",
  imageUrl: "https://example.com/tennis-matchup-share-card.png"
};

describe("openKakaoTournamentShare", () => {
  it("initializes the SDK and opens a feed share", () => {
    const sendDefault = vi.fn();
    const init = vi.fn();

    const result = openKakaoTournamentShare({
      ...input,
      sdk: {
        init,
        isInitialized: () => false,
        Share: { sendDefault }
      }
    });

    expect(result).toBe(true);
    expect(init).toHaveBeenCalledWith("javascript-key");
    expect(sendDefault).toHaveBeenCalledWith(expect.objectContaining({
      objectType: "feed",
      content: expect.objectContaining({
        title: input.title,
        link: {
          mobileWebUrl: input.url,
          webUrl: input.url
        }
      }),
      buttons: [
        {
          title: "대진표 확인하기",
          link: {
            mobileWebUrl: input.url,
            webUrl: input.url
          }
        }
      ]
    }));
  });

  it("returns false when the key or SDK is unavailable", () => {
    expect(openKakaoTournamentShare({ ...input, javascriptKey: "", sdk: undefined })).toBe(false);
    expect(openKakaoTournamentShare({ ...input, sdk: undefined })).toBe(false);
  });

  it("returns false when initialization does not expose the Share module", () => {
    expect(openKakaoTournamentShare({
      ...input,
      sdk: {
        init: vi.fn(),
        isInitialized: () => false
      }
    })).toBe(false);
  });

  it("does not initialize an SDK that is already initialized", () => {
    const init = vi.fn();

    expect(openKakaoTournamentShare({
      ...input,
      sdk: {
        init,
        isInitialized: () => true,
        Share: { sendDefault: vi.fn() }
      }
    })).toBe(true);
    expect(init).not.toHaveBeenCalled();
  });
});
