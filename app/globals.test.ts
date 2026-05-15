import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("mobile app frame styles", () => {
  const css = readFileSync(join(process.cwd(), "app", "globals.css"), "utf8");

  it("keeps the framed layout by default", () => {
    expect(css).toMatch(/\.app-shell\s*\{[^}]*place-items:\s*center;[^}]*padding:\s*18px;/s);
    expect(css).toMatch(/\.mobile-frame\s*\{[^}]*width:\s*min\(100%,\s*430px\);/s);
    expect(css).toMatch(/\.mobile-frame\s*\{[^}]*border-radius:\s*32px;/s);
  });

  it("uses the full viewport on phone-sized screens", () => {
    expect(css).toMatch(/@media\s*\(max-width:\s*768px\)\s*\{[\s\S]*?\.app-shell\s*\{[^}]*padding:\s*0;/s);
    expect(css).toMatch(/@media\s*\(max-width:\s*768px\)\s*\{[\s\S]*?\.mobile-frame\s*\{[^}]*width:\s*100%;[^}]*min-height:\s*100dvh;[^}]*border-radius:\s*0;/s);
  });

  it("fills the splash screen image on phone-sized screens", () => {
    expect(css).toMatch(/@media\s*\(max-width:\s*768px\)\s*\{[\s\S]*?\.splash-screen\s+img\s*\{[^}]*width:\s*100vw;[^}]*height:\s*100dvh;[^}]*object-fit:\s*cover;/s);
  });
});
