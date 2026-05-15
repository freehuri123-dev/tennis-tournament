import { describe, expect, it } from "vitest";
import { fromDbScheduleFormat, toDbScheduleFormat, toDomainDate } from "./tournament-repository";

describe("tournament repository mapping", () => {
  it("maps schedule formats between domain and Prisma enum values", () => {
    expect(toDbScheduleFormat("hanul-aa")).toBe("hanul_aa");
    expect(toDbScheduleFormat("kdk-v2010")).toBe("kdk_v2010");
    expect(toDbScheduleFormat("random")).toBe("random");
    expect(fromDbScheduleFormat("hanul_aa")).toBe("hanul-aa");
    expect(fromDbScheduleFormat("kdk_v2010")).toBe("kdk-v2010");
    expect(fromDbScheduleFormat("random")).toBe("random");
  });

  it("serializes DB dates as yyyy-mm-dd domain dates", () => {
    expect(toDomainDate(new Date("2026-05-24T00:00:00.000Z"))).toBe("2026-05-24");
  });
});
