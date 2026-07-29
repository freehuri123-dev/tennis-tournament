import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AppShell, PublicShell } from "./AppShell";

describe("AppShell footer", () => {
  it("관리자 화면 하단에 copyright를 표시한다", () => {
    render(<AppShell title="테스트">본문</AppShell>);

    expect(screen.getByText("Copyright © JunHeePark. All Rights Reserved.")).toBeTruthy();
  });

  it("공유 화면 하단에도 copyright를 표시한다", () => {
    render(<PublicShell title="공유">본문</PublicShell>);

    expect(screen.getByText("Copyright © JunHeePark. All Rights Reserved.")).toBeTruthy();
  });

  it("관리자 홈에서 테니스매치업 워드마크를 표시한다", () => {
    render(<AppShell title="테니스매치업" brandTitle>본문</AppShell>);

    expect(screen.getByText("테니스매치업").closest(".tennis-matchup-wordmark")).toBeTruthy();
    expect(screen.queryByText("TENNIS MATCH UP")).toBeNull();
  });

  it("공유 화면에는 작은 테니스매치업 브랜드를 표시한다", () => {
    render(<PublicShell title="공유 대진표">본문</PublicShell>);

    expect(screen.getByText("테니스매치업").className).toContain("tennis-matchup-mini-brand");
  });
});
