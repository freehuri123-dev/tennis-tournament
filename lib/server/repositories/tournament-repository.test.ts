import { beforeEach, describe, expect, it, vi } from "vitest";
import { fromDbScheduleFormat, loadPublicTournamentState, toDbScheduleFormat, toDomainDate } from "./tournament-repository";

const { prisma } = vi.hoisted(() => ({
  prisma: {
    club: { findUnique: vi.fn() },
    member: { findMany: vi.fn() },
    tournament: { findMany: vi.fn(), findUnique: vi.fn() }
  }
}));

vi.mock("../db", () => ({ prisma }));

describe("tournament repository mapping", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

  it("returns null for an unknown public slug without loading fallback tournament data", async () => {
    prisma.club.findUnique.mockResolvedValue({ id: "club-1", slug: "stc" });
    prisma.tournament.findUnique.mockResolvedValue(null);

    await expect(loadPublicTournamentState("stc", "missing-slug")).resolves.toBeNull();

    expect(prisma.tournament.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { clubId_publicSlug: { clubId: "club-1", publicSlug: "missing-slug" } }
      })
    );
    expect(prisma.member.findMany).not.toHaveBeenCalled();
    expect(prisma.tournament.findMany).not.toHaveBeenCalled();
  });

  it("returns only selected tournament members with public-safe fields", async () => {
    prisma.club.findUnique.mockResolvedValue({ id: "club-1", slug: "stc" });
    prisma.tournament.findUnique.mockResolvedValue({
      id: "tournament-1",
      name: "Public Tournament",
      date: new Date("2026-05-24T00:00:00.000Z"),
      publicSlug: "public-slug",
      status: "active",
      participants: [{ memberId: "member-1" }, { memberId: "member-2" }],
      groups: [
        {
          id: "group-1",
          tournamentId: "tournament-1",
          name: "A",
          scheduleFormat: "random",
          sortOrder: 0,
          seedPlayerIds: ["member-3"],
          members: [{ memberId: "member-2" }]
        }
      ],
      matches: [
        {
          id: "match-1",
          tournamentId: "tournament-1",
          groupId: "group-1",
          matchNumber: 1,
          sideAPlayerIds: ["member-1"],
          sideBPlayerIds: ["member-3"],
          sideAScore: null,
          sideBScore: null,
          status: "scheduled",
          sortOrder: 0
        }
      ]
    });
    prisma.tournament.findMany.mockResolvedValue([
      {
        id: "tournament-1",
        name: "Public Tournament",
        date: new Date("2026-05-24T00:00:00.000Z"),
        publicSlug: "public-slug",
        status: "active"
      }
    ]);
    prisma.member.findMany.mockResolvedValue([
      {
        id: "member-1",
        name: "One",
        gender: "male",
        level: "A",
        notes: "private note",
        phone: "010-0000-0001",
        active: true,
        deleted: false
      },
      {
        id: "member-2",
        name: "Two",
        gender: null,
        level: null,
        notes: "another private note",
        phone: "010-0000-0002",
        active: true,
        deleted: false
      },
      {
        id: "member-3",
        name: "Three",
        gender: "female",
        level: "B",
        notes: "seed private note",
        phone: null,
        active: false,
        deleted: false
      }
    ]);

    const state = await loadPublicTournamentState("stc", "public-slug");

    expect(prisma.member.findMany).toHaveBeenCalledWith({
      where: { clubId: "club-1", deleted: false, id: { in: ["member-1", "member-2", "member-3"] } },
      orderBy: [{ name: "asc" }, { id: "asc" }]
    });
    expect(state?.members).toEqual([
      { id: "member-1", name: "One", gender: "male", level: "A", notes: "", active: true, deleted: false },
      { id: "member-2", name: "Two", gender: undefined, level: undefined, notes: "", active: true, deleted: false },
      { id: "member-3", name: "Three", gender: "female", level: "B", notes: "", active: false, deleted: false }
    ]);
    expect(state?.currentTournamentId).toBe("tournament-1");
    expect(state?.tournament.publicSlug).toBe("public-slug");
  });
});
