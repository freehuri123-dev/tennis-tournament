import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TournamentState } from "../../store/tournament-store";
import { deleteTournament, fromDbScheduleFormat, loadPublicTournamentState, replaceTournamentState, toDbScheduleFormat, toDomainDate, updateMatchScore } from "./tournament-repository";

const { prisma } = vi.hoisted(() => ({
  prisma: {
    $transaction: vi.fn(),
    club: { findUnique: vi.fn() },
    member: { findMany: vi.fn() },
    match: { createMany: vi.fn(), deleteMany: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
    tournament: { delete: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    tournamentGroup: { createMany: vi.fn(), deleteMany: vi.fn() },
    tournamentGroupMember: { createMany: vi.fn(), deleteMany: vi.fn() },
    tournamentParticipant: { createMany: vi.fn(), deleteMany: vi.fn() }
  }
}));

vi.mock("../db", () => ({ prisma }));

describe("tournament repository mapping", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.$transaction.mockImplementation((callback) => callback(prisma));
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

  it("loads old tournaments by their new short numeric public code", async () => {
    prisma.club.findUnique.mockResolvedValue({ id: "club-1", slug: "stc" });
    prisma.tournament.findUnique.mockResolvedValue(null);
    prisma.tournament.findMany.mockResolvedValue([
      {
        id: "tournament-1",
        name: "Public Tournament",
        date: new Date("2026-05-24T00:00:00.000Z"),
        publicSlug: "tournament-tournament-1",
        status: "active",
        participants: [],
        groups: [],
        matches: []
      }
    ]);
    prisma.member.findMany.mockResolvedValue([]);

    const state = await loadPublicTournamentState("stc", "1001");

    expect(prisma.tournament.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { clubId_publicSlug: { clubId: "club-1", publicSlug: "1001" } }
      })
    );
    expect(state?.tournament.publicSlug).toBe("1001");
  });

  it("rejects crafted nested state before deleting existing tournament rows", async () => {
    const state: TournamentState = {
      version: 8,
      adminUnlocked: false,
      members: [],
      tournaments: [],
      currentTournamentId: "tournament-1",
      tournament: {
        id: "tournament-1",
        name: "Spring Tournament",
        date: "2026-05-24",
        publicSlug: "spring-tournament",
        status: "active"
      },
      groups: [
        {
          id: "group-1",
          tournamentId: "tournament-1",
          name: "A",
          scheduleFormat: "random",
          sortOrder: 1,
          seedPlayerIds: ["member-2"]
        }
      ],
      tournamentParticipantIds: { "tournament-1": ["member-1"] },
      groupMemberIds: { "group-1": ["member-1"] },
      matches: [
        {
          id: "match-1",
          tournamentId: "tournament-1",
          groupId: "group-1",
          matchNumber: 1,
          sideAPlayerIds: ["member-1", "member-2"],
          sideBPlayerIds: ["", ""],
          sideAScore: null,
          sideBScore: null,
          status: "scheduled",
          sortOrder: 1
        }
      ],
      deletedPublicSlugs: []
    };

    prisma.club.findUnique.mockResolvedValue({ id: "club-1", slug: "stc" });
    prisma.tournament.findFirst.mockResolvedValue({ id: "tournament-1" });
    prisma.member.findMany.mockResolvedValue([{ id: "member-1" }, { id: "member-2" }]);

    await expect(replaceTournamentState("stc", state)).rejects.toThrow("Seed player is not assigned to group: member-2");

    expect(prisma.tournament.update).not.toHaveBeenCalled();
    expect(prisma.match.deleteMany).not.toHaveBeenCalled();
    expect(prisma.tournamentGroupMember.deleteMany).not.toHaveBeenCalled();
    expect(prisma.tournamentGroup.deleteMany).not.toHaveBeenCalled();
    expect(prisma.tournamentParticipant.deleteMany).not.toHaveBeenCalled();
  });

  it("updates match scores only inside the requested club", async () => {
    prisma.club.findUnique.mockResolvedValue({ id: "club-1", slug: "stc" });
    prisma.match.findFirst.mockResolvedValue({
      id: "match-1",
      tournamentId: "tournament-1",
      groupId: "group-1",
      matchNumber: 1,
      sideAPlayerIds: ["member-1", "member-2"],
      sideBPlayerIds: ["member-3", "member-4"],
      sideAScore: null,
      sideBScore: null,
      status: "scheduled",
      sortOrder: 1
    });
    prisma.match.update.mockResolvedValue({
      id: "match-1",
      tournamentId: "tournament-1",
      groupId: "group-1",
      matchNumber: 1,
      sideAPlayerIds: ["member-1", "member-2"],
      sideBPlayerIds: ["member-3", "member-4"],
      sideAScore: 6,
      sideBScore: 4,
      status: "completed",
      sortOrder: 1
    });

    await expect(updateMatchScore("stc", { matchId: "match-1", sideAScore: 6, sideBScore: 4 })).resolves.toMatchObject({
      id: "match-1",
      sideAScore: 6,
      sideBScore: 4,
      status: "completed"
    });

    expect(prisma.match.findFirst).toHaveBeenCalledWith({
      where: { id: "match-1", tournament: { clubId: "club-1" } }
    });
    expect(prisma.match.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "match-1" }
      })
    );
  });

  it("rejects match score updates outside the requested club", async () => {
    prisma.club.findUnique.mockResolvedValue({ id: "club-1", slug: "stc" });
    prisma.match.findFirst.mockResolvedValue(null);

    await expect(updateMatchScore("stc", { matchId: "match-2", sideAScore: 6, sideBScore: 4 })).rejects.toThrow("Match not found: match-2");

    expect(prisma.match.findFirst).toHaveBeenCalledWith({
      where: { id: "match-2", tournament: { clubId: "club-1" } }
    });
    expect(prisma.match.update).not.toHaveBeenCalled();
  });

  it("deletes tournaments only inside the requested club", async () => {
    prisma.club.findUnique.mockResolvedValue({ id: "club-1", slug: "stc" });
    prisma.tournament.findFirst.mockResolvedValue({ id: "tournament-1" });
    prisma.tournament.delete.mockResolvedValue({ id: "tournament-1" });

    await expect(deleteTournament("stc", "tournament-1")).resolves.toBeUndefined();

    expect(prisma.tournament.findFirst).toHaveBeenCalledWith({
      where: { id: "tournament-1", clubId: "club-1" },
      select: { id: true }
    });
    expect(prisma.tournament.delete).toHaveBeenCalledWith({
      where: { id: "tournament-1" }
    });
  });
});
