import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("SplashScreen", () => {
  const source = readFileSync(join(process.cwd(), "components", "SplashScreen.tsx"), "utf8");

  it("lets the user start or automatically continues after five seconds", () => {
    expect(source).toContain("시작하기");
    expect(source).toContain("function startApp()");
    expect(source).toContain("}, 5000)");
    expect(source).toContain("splash-started:${clubSlug}");
    expect(source).not.toContain("setTimeout(() => setLeaving(true), 2600)");
  });

  it("uses the joogo intro image for the joogo meeting", () => {
    expect(source).toContain('joogo: "/joogo_intro.png"');
  });

  it("uses the army intro image for the army meeting", () => {
    expect(source).toContain('army: "/army_intro.png"');
  });
});
