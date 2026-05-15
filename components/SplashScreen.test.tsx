import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("SplashScreen timing", () => {
  const source = readFileSync(join(process.cwd(), "components", "SplashScreen.tsx"), "utf8");

  it("keeps the club intro visible longer before dismissing it", () => {
    expect(source).toContain("setTimeout(() => setLeaving(true), 2600)");
    expect(source).toContain("}, 3200)");
  });
});
