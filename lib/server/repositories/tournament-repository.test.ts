import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TournamentState } from "../../store/tournament-store";
import { deleteTournament, fromDbScheduleFormat, listMembersByClub, listTournamentsByClub, loadClubRecordData, loadPublicTournamentState, loadTournamentStateFromDb, replaceTournamentState, toDbScheduleFormat, toDomainDate, updateMatchScore, updateTournamentMatchStates } from "./tournament-repository";

const { prisma } = vi.hoisted(() => ({
  prisma: {
    $transaction: vi.fn(),
    club: { findUnique: vi.fn() },
    member: { findMany: vi.fn() },
    match: { createMany: vi.fn(), deleteMany: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), update: vi.fn(), updateManyAndReturn: vi.fn() },
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
    prisma.$transaction.mockImplementation((input) => Array.isArray(input) ? Promise.all(input) : input(prisma));
  });

  it("maps schedule formats between domain and Prisma enum values", () => {
    expect(toDbScheduleFormat("hanul-aa")).toBe("hanul_aa");
    expect(toDbScheduleFormat("kdk-v2010")).toBe("kdk_v2010");
    expect(toDbScheduleFormat("random")).toBe("random");
    expect(toDbScheduleFormat("fixed-pair-league")).toBe("fixed_pair_league");
    expect(toDbScheduleFormat("fixed-pair-tournament")).toBe("fixed_pair_tournament");
    expect(toDbScheduleFormat("single-tournament")).toBe("single_tournament");
    expect(fromDbScheduleFormat("hanul_aa")).toBe("hanul-aa");
    expect(fromDbScheduleFormat("kdk_v2010")).toBe("kdk-v2010");
    expect(fromDbScheduleFormat("random")).toBe("random");
    expect(fromDbScheduleFormat("fixed_pair_league")).toBe("fixed-pair-league");
    expect(fromDbScheduleFormat("fixed_pair_tournament")).toBe("fixed-pair-tournament");
    expect(fromDbScheduleFormat("single_tournament")).toBe("single-tournament");
  });

  it("serializes DB dates as yyyy-mm-dd domain dates", () => {
    expect(toDomainDate(new Date("2026-05-24T00:00:00.000Z"))).toBe("2026-05-24");
  });
  it("maps persisted tournament policies, match rounds, and public slugs from the database", async () => {
    const tournament = {
      id: "tournament-1",
      name: "Summer Open",
      date: new Date("2026-05-24T00:00:00.000Z"),
      publicSlug: "summer-open-2026",
      status: "active" as const,
      type: "tournament" as const,
      scheduleLocked: true,
      rankingExcludedMemberIds: ["member-2"],
      includeInClubRecords: false
    };
    prisma.club.findUnique.mockResolvedValue({ id: "club-1", slug: "stc" });
    prisma.member.findMany.mockResolvedValue([]);
    prisma.tournament.findMany.mockResolvedValue([tournament]);
    prisma.tournament.findFirst.mockResolvedValue({
      ...tournament,
      participants: [],
      groups: [],
      matches: [{
        id: "match-1",
        tournamentId: "tournament-1",
        groupId: "group-1",
        matchNumber: 1,
        sideAPlayerIds: ["member-1"],
        sideBPlayerIds: ["member-2"],
        sideAScore: null,
        sideBScore: null,
        status: "scheduled",
        sortOrder: 1,
        roundNumber: 3
      }]
    });

    const state = await loadTournamentStateFromDb("stc");

    expect(state.tournament).toMatchObject({
      publicSlug: "summer-open-2026",
      scheduleLocked: true,
      rankingExcludedMemberIds: ["member-2"],
      includeInClubRecords: false
    });
    expect(state.tournaments).toEqual([expect.objectContaining({
      publicSlug: "summer-open-2026",
      scheduleLocked: true,
      rankingExcludedMemberIds: ["member-2"],
      includeInClubRecords: false
    })]);
    expect(state.matches).toEqual([expect.objectContaining({ roundNumber: 3 })]);
  });

  it("defaults omitted legacy database policy fields", async () => {
    const legacyTournament = {
      id: "tournament-1",
      name: "Legacy Open",
      date: new Date("2026-05-24T00:00:00.000Z"),
      publicSlug: "legacy-open",
      status: "active" as const,
      type: "general" as const
    };
    prisma.club.findUnique.mockResolvedValue({ id: "club-1", slug: "stc" });
    prisma.member.findMany.mockResolvedValue([]);
    prisma.tournament.findMany.mockResolvedValue([legacyTournament]);
    prisma.tournament.findFirst.mockResolvedValue({
      ...legacyTournament,
      participants: [],
      groups: [],
      matches: [{
        id: "match-1",
        tournamentId: "tournament-1",
        groupId: "group-1",
        matchNumber: 1,
        sideAPlayerIds: ["member-1"],
        sideBPlayerIds: ["member-2"],
        sideAScore: null,
        sideBScore: null,
        status: "scheduled",
        sortOrder: 1,
        roundNumber: null
      }]
    });

    const state = await loadTournamentStateFromDb("stc");

    expect(state.tournament).toMatchObject({
      scheduleLocked: false,
      rankingExcludedMemberIds: [],
      includeInClubRecords: true
    });
    expect(state.matches).toEqual([expect.objectContaining({ roundNumber: undefined })]);
  });

  it("persists tournament policies and match round numbers when replacing state", async () => {
    const state: TournamentState = {
      version: 9,
      adminUnlocked: false,
      members: [],
      tournaments: [],
      currentTournamentId: "tournament-1",
      tournament: {
        id: "tournament-1",
        name: "Summer Open",
        date: "2026-05-24",
        publicSlug: "summer-open-2026",
        status: "active",
        type: "tournament",
        scheduleLocked: true,
        rankingExcludedMemberIds: ["member-1"],
        includeInClubRecords: false
      },
      groups: [{
        id: "group-1",
        tournamentId: "tournament-1",
        name: "A",
        scheduleFormat: "random",
        sortOrder: 1
      }],
      tournamentParticipantIds: { "tournament-1": ["member-1"] },
      groupMemberIds: { "group-1": ["member-1"] },
      teamAssignments: {},
      matches: [{
        id: "match-1",
        tournamentId: "tournament-1",
        groupId: "group-1",
        matchNumber: 1,
        sideAPlayerIds: ["member-1"],
        sideBPlayerIds: [],
        sideAScore: null,
        sideBScore: null,
        status: "scheduled",
        sortOrder: 1,
        roundNumber: 4
      }],
      deletedPublicSlugs: []
    };
    prisma.club.findUnique.mockResolvedValue({ id: "club-1", slug: "stc" });
    prisma.tournament.findFirst.mockResolvedValue({ id: "tournament-1" });
    prisma.member.findMany.mockResolvedValue([{ id: "member-1" }]);

    await replaceTournamentState("stc", state);

    expect(prisma.tournament.update).toHaveBeenCalledWith({
      where: { id: "tournament-1" },
      data: expect.objectContaining({
        scheduleLocked: true,
        rankingExcludedMemberIds: ["member-1"],
        includeInClubRecords: false
      })
    });
    expect(prisma.match.createMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({ roundNumber: 4 })]
    });
  });
  it("sorts numeric member names in natural display order", async () => {
    prisma.club.findUnique.mockResolvedValue({ id: "club-1", slug: "army" });
    prisma.member.findMany.mockResolvedValue([
      { id: "member-10", name: "10", gender: null, level: null, notes: "", phone: null, active: true, deleted: false },
      { id: "member-2", name: "2", gender: null, level: null, notes: "", phone: null, active: true, deleted: false },
      { id: "member-1", name: "1", gender: null, level: null, notes: "", phone: null, active: true, deleted: false }
    ]);

    await expect(listMembersByClub("army")).resolves.toMatchObject([
      { name: "1" },
      { name: "2" },
      { name: "10" }
    ]);
  });

  it("loads team battle matches for club records", async () => {
    prisma.club.findUnique.mockResolvedValue({ id: "club-1", slug: "stc" });
    prisma.member.findMany.mockResolvedValue([]);
    prisma.tournament.findMany.mockResolvedValue([]);
    prisma.match.findMany.mockResolvedValue([]);

    await expect(loadClubRecordData("stc")).resolves.toEqual({ members: [], tournaments: [], matches: [] });

    expect(prisma.match.findMany).toHaveBeenCalledWith({
      where: { tournament: { clubId: "club-1" } },
      orderBy: [{ tournament: { date: "desc" } }, { sortOrder: "asc" }, { matchNumber: "asc" }, { id: "asc" }]
    });
  });
  it("retries the tournament management query once after a transient database connection error", async () => {
    const transientError = Object.assign(new Error("Failed to connect to upstream database."), { code: "P1001" });
    prisma.club.findUnique.mockRejectedValueOnce(transientError).mockResolvedValue({ id: "club-1", slug: "stc" });
    prisma.member.findMany.mockResolvedValue([]);
    prisma.tournament.findMany.mockResolvedValue([]);
    prisma.tournament.findFirst.mockResolvedValue(null);

    await expect(loadTournamentStateFromDb("stc")).resolves.toMatchObject({ matches: [], groups: [] });
    expect(prisma.club.findUnique).toHaveBeenCalledTimes(2);
  });
  it("retries the club home query up to a third attempt for the production connection timeout", async () => {
    const transientError = new Error("timeout exceeded when trying to connect");
    prisma.club.findUnique
      .mockRejectedValueOnce(transientError)
      .mockRejectedValueOnce(transientError)
      .mockResolvedValue({ id: "club-1", slug: "stc" });
    prisma.tournament.findMany.mockResolvedValue([]);

    await expect(listTournamentsByClub("stc")).resolves.toEqual([]);
    expect(prisma.club.findUnique).toHaveBeenCalledTimes(3);
  });
  it("retries a public tournament query once after a transient database connection error", async () => {
    const transientError = new Error("Connection terminated due to connection timeout");
    prisma.club.findUnique.mockRejectedValueOnce(transientError).mockResolvedValue({ id: "club-1", slug: "stc" });
    prisma.tournament.findUnique.mockResolvedValue(null);

    await expect(loadPublicTournamentState("stc", "missing-slug")).resolves.toBeNull();
    expect(prisma.club.findUnique).toHaveBeenCalledTimes(2);
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


  it("allows temporary active club members in team battle matches without adding them as participants", async () => {
    const state: TournamentState = {
      version: 9,
      adminUnlocked: false,
      members: [],
      tournaments: [],
      currentTournamentId: "tournament-1",
      tournament: {
        id: "tournament-1",
        name: "Team Battle",
        date: "2026-05-24",
        publicSlug: "team-battle",
        status: "active",
        type: "team-battle"
      },
      groups: [
        {
          id: "group-1",
          tournamentId: "tournament-1",
          name: "청백전",
          scheduleFormat: "team-battle",
          sortOrder: 1
        }
      ],
      tournamentParticipantIds: { "tournament-1": ["member-1", "member-2", "member-3", "member-4"] },
      groupMemberIds: { "group-1": ["member-1", "member-2", "member-3", "member-4"] },
      teamAssignments: { "tournament-1": { "member-1": "blue", "member-2": "blue", "member-3": "white", "member-4": "white" } },
      matches: [
        {
          id: "match-1",
          tournamentId: "tournament-1",
          groupId: "group-1",
          matchNumber: 1,
          sideAPlayerIds: ["member-5", "member-2"],
          sideBPlayerIds: ["member-3", "member-4"],
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
    prisma.member.findMany.mockResolvedValue([
      { id: "member-1" },
      { id: "member-2" },
      { id: "member-3" },
      { id: "member-4" },
      { id: "member-5" }
    ]);

    await expect(replaceTournamentState("stc", state)).resolves.toBeUndefined();

    expect(prisma.tournamentParticipant.createMany).toHaveBeenCalledWith({
      data: expect.not.arrayContaining([expect.objectContaining({ memberId: "member-5" })])
    });
    expect(prisma.match.createMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({ sideAPlayerIds: ["member-5", "member-2"] })]
    });
  });
  it("updates match scores only inside the requested club with one query", async () => {
    prisma.match.updateManyAndReturn.mockResolvedValue([{
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
    }]);

    await expect(updateMatchScore("stc", { matchId: "match-1", sideAScore: 6, sideBScore: 4 })).resolves.toMatchObject({
      id: "match-1",
      sideAScore: 6,
      sideBScore: 4,
      status: "completed"
    });

    expect(prisma.match.updateManyAndReturn).toHaveBeenCalledWith({
      where: { id: "match-1", tournament: { club: { slug: "stc" } } },
      data: { sideAScore: 6, sideBScore: 4, status: "completed" }
    });
    expect(prisma.club.findUnique).not.toHaveBeenCalled();
    expect(prisma.match.findFirst).not.toHaveBeenCalled();
  });
  it("rejects match score updates outside the requested club", async () => {
    prisma.match.updateManyAndReturn.mockResolvedValue([]);

    await expect(updateMatchScore("stc", { matchId: "match-2", sideAScore: 6, sideBScore: 4 })).rejects.toThrow("Match not found: match-2");

    expect(prisma.match.updateManyAndReturn).toHaveBeenCalledWith({
      where: { id: "match-2", tournament: { club: { slug: "stc" } } },
      data: { sideAScore: 6, sideBScore: 4, status: "completed" }
    });
  });
  it("updates only changed tournament matches inside the requested club", async () => {
    const updates = [{
      matchId: "match-1",
      sideAPlayerIds: ["member-1", "member-2"],
      sideBPlayerIds: ["member-3", "member-4"],
      sideAScore: 6,
      sideBScore: 4,
      status: "completed" as const
    }];
    prisma.match.findMany.mockResolvedValue([{ id: "match-1" }]);
    prisma.match.update.mockResolvedValue({ id: "match-1" });

    await expect(updateTournamentMatchStates("stc", updates)).resolves.toBeUndefined();

    expect(prisma.match.findMany).toHaveBeenCalledWith({
      where: { id: { in: ["match-1"] }, tournament: { club: { slug: "stc" } } },
      select: { id: true }
    });
    expect(prisma.match.update).toHaveBeenCalledWith({
      where: { id: "match-1" },
      data: {
        sideAPlayerIds: ["member-1", "member-2"],
        sideBPlayerIds: ["member-3", "member-4"],
        sideAScore: 6,
        sideBScore: 4,
        status: "completed"
      }
    });
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
