import { describe, expect, it } from "vitest";
import { getTournamentStorageKey } from "./tournament-store";

describe("getTournamentStorageKey", () => {
  it("separates localStorage keys by club slug", () => {
    expect(getTournamentStorageKey("stc")).toBe("tennis-monthly-tournament-state:stc");
    expect(getTournamentStorageKey("otc")).toBe("tennis-monthly-tournament-state:otc");
    expect(getTournamentStorageKey("joogo")).toBe("tennis-monthly-tournament-state:joogo");
  });

  it("uses the legacy storage key when no club slug is provided", () => {
    expect(getTournamentStorageKey()).toBe("tennis-monthly-tournament-state");
  });
});
