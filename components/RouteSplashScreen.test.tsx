import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RouteSplashScreen } from "./RouteSplashScreen";

const route = vi.hoisted(() => ({ pathname: "/stc" }));

vi.mock("next/navigation", () => ({
  usePathname: () => route.pathname
}));

vi.mock("./SplashScreen", () => ({
  SplashScreen: ({ clubSlug, startLabel }: { clubSlug: string; startLabel?: string }) => (
    <div data-club={clubSlug} data-label={startLabel} data-testid="route-splash" />
  )
}));

describe("RouteSplashScreen", () => {
  beforeEach(() => {
    route.pathname = "/stc";
  });

  it("keeps the same splash instance across pages in one club", () => {
    const view = render(<RouteSplashScreen />);
    const firstSplash = screen.getByTestId("route-splash");

    route.pathname = "/stc/members";
    view.rerender(<RouteSplashScreen />);

    expect(screen.getByTestId("route-splash")).toBe(firstSplash);
    expect(firstSplash.dataset.club).toBe("stc");
  });

  it("uses the public start label without remounting between public pages", () => {
    route.pathname = "/public/otc/2006";
    const view = render(<RouteSplashScreen />);
    const firstSplash = screen.getByTestId("route-splash");

    expect(firstSplash.dataset.club).toBe("otc");
    expect(firstSplash.dataset.label).toBe("대진표 확인하기");

    route.pathname = "/public/otc/records";
    view.rerender(<RouteSplashScreen />);
    expect(screen.getByTestId("route-splash")).toBe(firstSplash);
  });

  it("does not show the intro on TV or unknown routes", () => {
    route.pathname = "/public/stc/2006/tv";
    const view = render(<RouteSplashScreen />);
    expect(screen.queryByTestId("route-splash")).toBeNull();

    route.pathname = "/";
    view.rerender(<RouteSplashScreen />);
    expect(screen.queryByTestId("route-splash")).toBeNull();
  });
});
