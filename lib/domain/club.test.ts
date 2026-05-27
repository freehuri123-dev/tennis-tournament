import { describe, expect, it } from "vitest";
import { buildClubPath, getClubBySlug, isKnownClubSlug } from "./club";

describe("club routing", () => {
  it("등록된 클럽/모임 slug만 허용한다", () => {
    expect(isKnownClubSlug("stc")).toBe(true);
    expect(isKnownClubSlug("otc")).toBe(true);
    expect(isKnownClubSlug("joogo")).toBe(true);
    expect(isKnownClubSlug("admin")).toBe(false);
    expect(isKnownClubSlug("")).toBe(false);
  });

  it("클럽/모임별 경로를 만든다", () => {
    expect(buildClubPath("stc", "members")).toBe("/stc/members");
    expect(buildClubPath("otc", "tournaments/manage")).toBe("/otc/tournaments/manage");
    expect(buildClubPath("joogo", "tournaments")).toBe("/joogo/tournaments");
    expect(buildClubPath("stc")).toBe("/stc");
  });

  it("slug로 표시명과 운영 구분을 찾는다", () => {
    expect(getClubBySlug("stc")?.name).toBe("STC 테니스 클럽");
    expect(getClubBySlug("otc")?.name).toBe("OTC 테니스 클럽");
    expect(getClubBySlug("joogo")?.name).toBe("주고받고");
    expect(getClubBySlug("joogo")?.organizationLabel).toBe("모임");
    expect(getClubBySlug("joogo")?.tournamentLabel).toBe("모임대회");
  });
});
