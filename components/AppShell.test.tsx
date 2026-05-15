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
});
