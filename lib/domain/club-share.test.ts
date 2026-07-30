import { describe, expect, it } from "vitest";
import { getClubShareContent } from "./club-share";

describe("getClubShareContent", () => {
  it.each([
    ["stc", "/kakao-share-stc.jpg", "STC? ???? ??? ??"],
    ["otc", "/kakao-share-otc.jpg", "OTC? ???? ??? ??"],
    ["joogo", "/kakao-share-joogo.jpg", "???? ???, ??? ??"],
    ["army", "/kakao-share-army.jpg", "????1??? ??? ??"]
  ] as const)("returns club-specific content for %s", (clubSlug, imagePath, description) => {
    const content = getClubShareContent(clubSlug);

    expect(content.imagePath).toBe(imagePath);
    expect(content.description).toContain(description);
  });
});
