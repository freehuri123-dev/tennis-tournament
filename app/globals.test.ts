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

  it("styles pending form progress feedback", () => {
    expect(css).toMatch(/\.button-progress::after,\s*\.form-progress::after\s*\{[\s\S]*animation:\s*progress-slide\s+920ms\s+ease-in-out\s+infinite;/s);
    expect(css).toMatch(/@keyframes\s+progress-slide/);
  });

  it("dims the screen for server loading states", () => {
    expect(css).toMatch(/\.global-loading-overlay\s*\{[^}]*position:\s*fixed;[^}]*inset:\s*0;[^}]*background:\s*rgba\(10,\s*22,\s*13,\s*0\.44\);/s);
    expect(css).toMatch(/\.global-loading-bar::after\s*\{[\s\S]*animation:\s*progress-slide\s+920ms\s+ease-in-out\s+infinite;/s);
  });

  it("keeps public match teams and score in one row", () => {
    expect(css).toMatch(/\.public-team-grid\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s+54px\s+minmax\(0,\s*1fr\);[^}]*align-items:\s*center;/s);
    expect(css).toMatch(/\.public-team-grid\s+\.match-player\s*\{[^}]*white-space:\s*nowrap;[^}]*overflow:\s*hidden;[^}]*text-overflow:\s*ellipsis;/s);
  });

  it("uses the selected cool mint palette", () => {
    expect(css).toMatch(/--bg:\s*#eef5f3;/);
    expect(css).toMatch(/--green:\s*#3b8f80;/);
    expect(css).toMatch(/--green-bright:\s*#76b8aa;/);
    expect(css).toMatch(/\/\*\s*Cool mint theme\s*\*\//);
  });

  it("uses the modern serif typography system", () => {
    expect(css).toMatch(/\/\*\s*Modern serif typography\s*\*\//);
    expect(css).toMatch(/\.invalid-access-page\s*\{[^}]*font-family:\s*var\(--font-noto-sans-kr\)/s);
    expect(css).toMatch(/\.header-title,[\s\S]*\.section-head,[\s\S]*font-family:\s*var\(--font-noto-serif-kr\)/);
  });
});
