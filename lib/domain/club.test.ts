import { describe, expect, it } from "vitest";
import { buildClubPath, getClubBySlug, isKnownClubSlug } from "./club";

describe("club routing", () => {
  it("stc와 otc 클럽 slug만 허용한다", () => {
    expect(isKnownClubSlug("stc")).toBe(true);
    expect(isKnownClubSlug("otc")).toBe(true);
    expect(isKnownClubSlug("admin")).toBe(false);
    expect(isKnownClubSlug("")).toBe(false);
  });

  it("클럽별 경로를 만든다", () => {
    expect(buildClubPath("stc", "members")).toBe("/stc/members");
    expect(buildClubPath("otc", "tournaments/manage")).toBe("/otc/tournaments/manage");
    expect(buildClubPath("stc")).toBe("/stc");
  });

  it("slug로 클럽 표시명을 찾는다", () => {
    expect(getClubBySlug("stc")?.name).toBe("STC 테니스 클럽");
    expect(getClubBySlug("otc")?.name).toBe("OTC 테니스 클럽");
  });
});
