import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("SplashScreen", () => {
  const source = readFileSync(join(process.cwd(), "components", "SplashScreen.tsx"), "utf8");

  it("lets the user start or automatically continues after ten seconds", () => {
    expect(source).toContain("시작하기");
    expect(source).toContain("function startApp()");
    expect(source).toContain("}, 10000)");
    expect(source).toContain("splash-started:${clubSlug}");
    expect(source).not.toContain("setTimeout(() => setLeaving(true), 2600)");
  });

  it("uses optimized summer intro images for the STC and OTC clubs", () => {
    expect(source).toContain('stc: "/stc_intro_summer_coast.webp"');
    expect(source).toContain('otc: "/otc_intro_summer_coast.webp"');
  });

  it("uses the joogo intro image for the joogo meeting", () => {
    expect(source).toContain('joogo: "/joogo_intro.jpg"');
  });

  it("uses the army intro image for the army meeting", () => {
    expect(source).toContain('army: "/army_intro.jpg"');
  });
});
