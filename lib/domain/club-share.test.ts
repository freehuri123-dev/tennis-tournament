import { describe, expect, it } from "vitest";
import { getClubShareContent } from "./club-share";

describe("getClubShareContent", () => {
  it.each([
    ["stc", "/kakao-share-stc.jpg", "STC \uACBD\uAE30 \uC77C\uC815\uACFC \uC2E4\uC2DC\uAC04 \uC21C\uC704\uB97C \uD655\uC778\uD558\uC138\uC694."],
    ["otc", "/kakao-share-otc.jpg", "OTC \uACBD\uAE30 \uC77C\uC815\uACFC \uC2E4\uC2DC\uAC04 \uC21C\uC704\uB97C \uD655\uC778\uD558\uC138\uC694."],
    ["joogo", "/kakao-share-joogo.jpg", "\uC8FC\uACE0\uBC1B\uACE0 \uACBD\uAE30 \uC77C\uC815\uACFC \uC2E4\uC2DC\uAC04 \uC21C\uC704\uB97C \uD655\uC778\uD558\uC138\uC694."],
    ["army", "/kakao-share-army.jpg", "\uCC9C\uD558\uC81C\uC77C1\uC0AC\uB2E8 \uACBD\uAE30 \uC77C\uC815\uACFC \uC2E4\uC2DC\uAC04 \uC21C\uC704\uB97C \uD655\uC778\uD558\uC138\uC694."],
    ["queensday", "/kakao-share-queensday.jpg", "퀸즈데이 경기 일정과 실시간 순위를 확인하세요."]
  ] as const)("returns club-specific content for %s", (clubSlug, imagePath, description) => {
    const content = getClubShareContent(clubSlug);

    expect(content.imagePath).toBe(imagePath);
    expect(content.description).toBe(description);
    expect(content.description).not.toContain("?");
  });
});
