import { describe, expect, it, vi } from "vitest";
import { isMobileBrowser, openKakaoTournamentShare } from "./kakao-share";

const input = {
  javascriptKey: "javascript-key",
  title: "STC \uD14C\uB2C8\uC2A4 \uD074\uB7FD - 7\uC6D4 \uC815\uAE30\uB300\uD68C",
  description: "\uD14C\uB2C8\uC2A4\uB9E4\uCE58\uC5C5 \uB300\uC9C4\uD45C\uB97C \uD655\uC778\uD558\uC138\uC694.",
  url: "https://example.com/public/stc/1234",
  imageUrl: "https://example.com/tennis-matchup-share-card.png",
  userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)"
};

describe("openKakaoTournamentShare", () => {
  it("initializes the SDK and opens a feed share on mobile", async () => {
    const sendDefault = vi.fn();
    const init = vi.fn();

    const result = await openKakaoTournamentShare({
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
          title: "\uB300\uC9C4\uD45C \uD655\uC778\uD558\uAE30",
          link: {
            mobileWebUrl: input.url,
            webUrl: input.url
          }
        }
      ]
    }));
  });

  it("returns false when the key or SDK is unavailable", async () => {
    await expect(openKakaoTournamentShare({ ...input, javascriptKey: "", sdk: undefined })).resolves.toBe(false);
    await expect(openKakaoTournamentShare({ ...input, sdk: undefined })).resolves.toBe(false);
  });

  it("returns false when initialization does not expose the Share module", async () => {
    await expect(openKakaoTournamentShare({
      ...input,
      sdk: {
        init: vi.fn(),
        isInitialized: () => false
      }
    })).resolves.toBe(false);
  });

  it("does not initialize an SDK that is already initialized", async () => {
    const init = vi.fn();

    await expect(openKakaoTournamentShare({
      ...input,
      sdk: {
        init,
        isInitialized: () => true,
        Share: { sendDefault: vi.fn() }
      }
    })).resolves.toBe(true);
    expect(init).not.toHaveBeenCalled();
  });

  it("returns false on desktop without opening Kakao share", async () => {
    const sendDefault = vi.fn();

    await expect(openKakaoTournamentShare({
      ...input,
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      sdk: {
        init: vi.fn(),
        isInitialized: () => true,
        Share: { sendDefault }
      }
    })).resolves.toBe(false);
    expect(sendDefault).not.toHaveBeenCalled();
  });

  it("returns false when the Kakao share promise rejects", async () => {
    await expect(openKakaoTournamentShare({
      ...input,
      sdk: {
        init: vi.fn(),
        isInitialized: () => true,
        Share: { sendDefault: vi.fn().mockRejectedValue(new Error("share failed")) }
      }
    })).resolves.toBe(false);
  });
});

describe("isMobileBrowser", () => {
  it("recognizes Android, iPhone, and touch-enabled iPad user agents", () => {
    expect(isMobileBrowser("Mozilla/5.0 (Linux; Android 15)")).toBe(true);
    expect(isMobileBrowser("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)")).toBe(true);
    expect(isMobileBrowser("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", 5)).toBe(true);
  });

  it("does not treat a desktop browser as mobile", () => {
    expect(isMobileBrowser("Mozilla/5.0 (Windows NT 10.0; Win64; x64)")).toBe(false);
  });
});
