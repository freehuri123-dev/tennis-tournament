import { describe, expect, it } from "vitest";
import { getClubShareContent } from "./club-share";

describe("getClubShareContent", () => {
  it.each([
    ["stc", "/kakao-share-stc.jpg", "STC\uC640 \uD568\uAED8\uD558\uB294 \uC990\uAC70\uC6B4 \uC2B9\uBD80, \uB300\uC9C4\uD45C\uC640 \uC21C\uC704\uB97C \uD655\uC778\uD558\uC138\uC694."],
    ["otc", "/kakao-share-otc.jpg", "OTC\uC640 \uD568\uAED8\uD558\uB294 \uC990\uAC70\uC6B4 \uC2B9\uBD80, \uB300\uC9C4\uD45C\uC640 \uC21C\uC704\uB97C \uD655\uC778\uD558\uC138\uC694."],
    ["joogo", "/kakao-share-joogo.jpg", "\uD568\uAED8\uD558\uB294 \uD14C\uB2C8\uC2A4, \uC990\uAC70\uC6B4 \uBAA8\uC784! \uB300\uC9C4\uD45C\uC640 \uC21C\uC704\uB97C \uD655\uC778\uD558\uC138\uC694."],
    ["army", "/kakao-share-army.jpg", "\uCC9C\uD558\uC81C\uC77C1\uC0AC\uB2E8\uC758 \uB728\uAC70\uC6B4 \uC2B9\uBD80, \uB300\uC9C4\uD45C\uC640 \uC21C\uC704\uB97C \uD655\uC778\uD558\uC138\uC694."]
  ] as const)("returns club-specific content for %s", (clubSlug, imagePath, description) => {
    const content = getClubShareContent(clubSlug);

    expect(content.imagePath).toBe(imagePath);
    expect(content.description).toBe(description);
    expect(content.description).not.toContain("?");
  });
});
