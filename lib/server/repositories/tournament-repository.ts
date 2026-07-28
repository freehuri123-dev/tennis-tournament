import type { ScheduleFormat } from "@prisma/client";
import type { z } from "zod";
import type { ClubSlug } from "../../domain/club";
import { createTournamentSlug } from "../../domain/public-access";
import { createSampleMatches, sampleGroupMemberIds, sampleGroups, sampleMembers, sampleTournament, sampleTournaments } from "../../domain/sample-data";
import { withDateStatus } from "../../domain/tournament-status";
import type { Match, Member, Tournament, TournamentGroup } from "../../domain/types";
import type { TournamentState } from "../../store/tournament-store";
import type { matchScoreInputSchema, memberInputSchema, tournamentInputSchema } from "../validation";

const memberNameCollator = new Intl.Collator("ko-KR", {
  numeric: true,
  sensitivity: "base"
});

function assertNever(value: never): never {
  throw new Error(`Unexpected schedule format: ${value}`);
}

export function toDbScheduleFormat(value: TournamentGroup["scheduleFormat"]): ScheduleFormat {
  switch (value) {
    case "hanul-aa":
      return "hanul_aa";
    case "kdk-v2010":
      return "kdk_v2010";
    case "random":
      return "random";
    case "fixed-pair-tournament":
      return "fixed_pair_tournament";
    case "single-tournament":
      return "single_tournament";
    default:
      return assertNever(value);
  }
}

export function fromDbScheduleFormat(value: ScheduleFormat): TournamentGroup["scheduleFormat"] {
  switch (value) {
    case "hanul_aa":
      return "hanul-aa";
    case "kdk_v2010":
      return "kdk-v2010";
    case "random":
      return "random";
    case "fixed_pair_tournament":
      return "fixed-pair-tournament";
    case "single_tournament":
      return "single-tournament";
    default:
      return assertNever(value);
  }
}

export function toDomainDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function toDbDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function toDomainMember(member: {
  id: string;
  name: string;
  gender: "male" | "female" | null;
  level: string | null;
  notes: string;
  phone: string | null;
  active: boolean;
  deleted: boolean;
}): Member {
  return {
    id: member.id,
    name: member.name,
    gender: member.gender ?? undefined,
    level: member.level ?? undefined,
    notes: member.notes,
    phone: member.phone ?? undefined,
    active: member.active,
    deleted: member.deleted
  };
}

function toPublicDomainMember(member: {
  id: string;
  name: string;
  gender: "male" | "female" | null;
  level: string | null;
  active: boolean;
  deleted: boolean;
}): Member {
  return {
    id: member.id,
    name: member.name,
    gender: member.gender ?? undefined,
    level: member.level ?? undefined,
    notes: "",
    active: member.active,
    deleted: member.deleted
  };
}

function sortMembersByDisplayName<T extends Pick<Member, "id" | "name">>(members: T[]): T[] {
  return [...members].sort((left, right) => {
    const byName = memberNameCollator.compare(left.name, right.name);
    return byName === 0 ? left.id.localeCompare(right.id) : byName;
  });
}

function toDomainTournament(tournament: {
  id: string;
  name: string;
  date: Date;
  publicSlug: string;
  status: "draft" | "active" | "completed";
}): Tournament {
  return withDateStatus({
    id: tournament.id,
    name: tournament.name,
    date: toDomainDate(tournament.date),
    publicSlug: createTournamentSlug(tournament.id),
    status: tournament.status
  });
}

function toDomainGroup(group: {
  id: string;
  tournamentId: string;
  name: string;
  scheduleFormat: ScheduleFormat;
  sortOrder: number;
  seedPlayerIds: string[];
}): TournamentGroup {
  return {
    id: group.id,
    tournamentId: group.tournamentId,
    name: group.name,
    scheduleFormat: fromDbScheduleFormat(group.scheduleFormat),
    sortOrder: group.sortOrder,
    seedPlayerIds: group.seedPlayerIds
  };
}

function collectPublicTournamentMemberIds(tournament: {
  participants: { memberId: string }[];
  groups: { seedPlayerIds: string[]; members: { memberId: string }[] }[];
  matches: { sideAPlayerIds: string[]; sideBPlayerIds: string[] }[];
}): string[] {
  const memberIds = new Set<string>();

  for (const participant of tournament.participants) memberIds.add(participant.memberId);
  for (const group of tournament.groups) {
    for (const member of group.members) memberIds.add(member.memberId);
    for (const memberId of group.seedPlayerIds) memberIds.add(memberId);
  }
  for (const match of tournament.matches) {
    for (const memberId of match.sideAPlayerIds) memberIds.add(memberId);
    for (const memberId of match.sideBPlayerIds) memberIds.add(memberId);
  }

  return [...memberIds];
}

function toDomainMatch(match: {
  id: string;
  tournamentId: string;
  groupId: string;
  matchNumber: number;
  sideAPlayerIds: string[];
  sideBPlayerIds: string[];
  sideAScore: number | null;
  sideBScore: number | null;
  status: "scheduled" | "completed";
  sortOrder: number;
  courtNumber?: string | null;
}): Match {
  return {
    id: match.id,
    tournamentId: match.tournamentId,
    groupId: match.groupId,
    matchNumber: match.matchNumber,
    sideAPlayerIds: match.sideAPlayerIds,
    sideBPlayerIds: match.sideBPlayerIds,
    sideAScore: match.sideAScore,
    sideBScore: match.sideBScore,
    status: match.status,
    sortOrder: match.sortOrder,
    courtNumber: match.courtNumber ?? null
  };
}

function emptyTournamentState(members: Member[]): TournamentState {
  return {
    version: 8,
    adminUnlocked: false,
    members,
    tournaments: [],
    currentTournamentId: "",
    tournament: {
      id: "",
      name: "?�???�음",
      date: toDomainDate(new Date()),
      publicSlug: "empty",
      status: "draft"
    },
    groups: [],
    tournamentParticipantIds: {},
    groupMemberIds: {},
    matches: [],
    deletedPublicSlugs: []
  };
}

async function getPrisma() {
  const { prisma } = await import("../db");
  return prisma;
}

type MemberInput = z.infer<typeof memberInputSchema>;
type MatchScoreInput = z.infer<typeof matchScoreInputSchema>;
type TournamentInput = z.infer<typeof tournamentInputSchema>;

function shouldUseLocalSampleData() {
  return !process.env.DATABASE_URL && !process.env.VERCEL && process.env.VITEST !== "true";
}

function localSampleState(): TournamentState {
  return {
    version: 8,
    adminUnlocked: false,
    members: sampleMembers,
    tournaments: sampleTournaments.map((tournament) => withDateStatus(tournament)),
    currentTournamentId: sampleTournament.id,
    tournament: withDateStatus(sampleTournament),
    groups: sampleGroups,
    tournamentParticipantIds: { [sampleTournament.id]: Array.from(new Set(Object.values(sampleGroupMemberIds).flat())) },
    groupMemberIds: sampleGroupMemberIds,
    matches: createSampleMatches(),
    deletedPublicSlugs: []
  };
}

function assertAllowedIds(ids: string[], allowedIds: Set<string>, message: string) {
  for (const id of ids) {
    if (!allowedIds.has(id)) throw new Error(`${message}: ${id}`);
  }
}

function matchPlayerIds(match: Match) {
  return [...match.sideAPlayerIds, ...match.sideBPlayerIds].filter((id) => id !== "");
}

export async function getClubOrThrow(clubSlug: ClubSlug) {
  const prisma = await getPrisma();
  const club = await prisma.club.findUnique({ where: { slug: clubSlug } });
  if (!club) throw new Error(`Club not found: ${clubSlug}`);
  return club;
}

export async function listMembersByClub(clubSlug: ClubSlug): Promise<Member[]> {
  if (shouldUseLocalSampleData()) return localSampleState().members;

  const prisma = await getPrisma();
  const club = await getClubOrThrow(clubSlug);
  const members = await prisma.member.findMany({
    where: { clubId: club.id, deleted: false },
    orderBy: [{ name: "asc" }, { id: "asc" }]
  });
  return sortMembersByDisplayName(members.map(toDomainMember));
}

export async function getMemberById(clubSlug: ClubSlug, memberId: string): Promise<Member | null> {
  if (shouldUseLocalSampleData()) {
    return localSampleState().members.find((member) => member.id === memberId) ?? null;
  }

  const prisma = await getPrisma();
  const club = await getClubOrThrow(clubSlug);
  const member = await prisma.member.findFirst({
    where: { id: memberId, clubId: club.id, deleted: false }
  });
  return member ? toDomainMember(member) : null;
}

export async function upsertMember(input: MemberInput): Promise<Member> {
  const prisma = await getPrisma();
  const club = await getClubOrThrow(input.clubSlug);
  const data = {
    clubId: club.id,
    name: input.name,
    gender: input.gender ?? null,
    level: input.level ?? null,
    phone: input.phone ?? null,
    notes: input.notes,
    active: input.active,
    deleted: false
  };

  if (!input.id) {
    return toDomainMember(await prisma.member.create({ data }));
  }

  const existing = await prisma.member.findFirst({
    where: { id: input.id, clubId: club.id }
  });
  if (!existing) throw new Error(`Member not found: ${input.id}`);

  return toDomainMember(
    await prisma.member.update({
      where: { id: input.id },
      data
    })
  );
}

export async function upsertTournament(input: TournamentInput): Promise<Tournament> {
  const prisma = await getPrisma();
  const club = await getClubOrThrow(input.clubSlug);
  const data = {
    name: input.name,
    date: toDbDate(input.date),
    publicSlug: input.publicSlug
  };

  if (!input.id) {
    return toDomainTournament(
      await prisma.tournament.create({
        data: {
          clubId: club.id,
          ...data,
          status: "draft"
        }
      })
    );
  }

  const existing = await prisma.tournament.findFirst({
    where: { id: input.id, clubId: club.id }
  });
  if (!existing) throw new Error(`Tournament not found: ${input.id}`);

  return toDomainTournament(
    await prisma.tournament.update({
      where: { id: input.id },
      data
    })
  );
}

export async function updateTournamentName(clubSlug: ClubSlug, tournamentId: string, name: string): Promise<Tournament> {
  const prisma = await getPrisma();
  const club = await getClubOrThrow(clubSlug);
  const normalizedName = name.trim();
  if (!normalizedName) throw new Error("Tournament name is required");

  const existing = await prisma.tournament.findFirst({
    where: { id: tournamentId, clubId: club.id },
    select: { id: true }
  });
  if (!existing) throw new Error(`Tournament not found: ${tournamentId}`);

  return toDomainTournament(
    await prisma.tournament.update({
      where: { id: tournamentId },
      data: { name: normalizedName }
    })
  );
}

export async function updateTournamentDate(clubSlug: ClubSlug, tournamentId: string, date: string): Promise<Tournament> {
  const prisma = await getPrisma();
  const club = await getClubOrThrow(clubSlug);
  const existing = await prisma.tournament.findFirst({
    where: { id: tournamentId, clubId: club.id },
    select: { id: true, name: true, publicSlug: true, status: true }
  });
  if (!existing) throw new Error(`Tournament not found: ${tournamentId}`);

  const nextTournament = withDateStatus({
    id: existing.id,
    name: existing.name,
    date,
    publicSlug: existing.publicSlug,
    status: existing.status
  });

  return toDomainTournament(
    await prisma.tournament.update({
      where: { id: tournamentId },
      data: {
        date: toDbDate(nextTournament.date),
        status: nextTournament.status
      }
    })
  );
}

export async function deleteTournament(clubSlug: ClubSlug, tournamentId: string): Promise<void> {
  const prisma = await getPrisma();
  const club = await getClubOrThrow(clubSlug);
  const existing = await prisma.tournament.findFirst({
    where: { id: tournamentId, clubId: club.id },
    select: { id: true }
  });
  if (!existing) throw new Error(`Tournament not found: ${tournamentId}`);

  await prisma.tournament.delete({ where: { id: tournamentId } });
}

export async function softDeleteMember(clubSlug: ClubSlug, memberId: string): Promise<void> {
  const prisma = await getPrisma();
  const club = await getClubOrThrow(clubSlug);
  const result = await prisma.member.updateMany({
    where: { id: memberId, clubId: club.id },
    data: { active: false, deleted: true }
  });

  if (result.count !== 1) throw new Error(`Member not found: ${memberId}`);
}

export async function updateMatchScore(clubSlug: ClubSlug, input: MatchScoreInput): Promise<Match> {
  const prisma = await getPrisma();
  const club = await getClubOrThrow(clubSlug);
  const existing = await prisma.match.findFirst({
    where: { id: input.matchId, tournament: { clubId: club.id } }
  });
  if (!existing) throw new Error(`Match not found: ${input.matchId}`);

  const status = input.sideAScore === null || input.sideBScore === null ? "scheduled" : "completed";
  const match = await prisma.match.update({
    where: { id: input.matchId },
    data: {
      sideAScore: input.sideAScore,
      sideBScore: input.sideBScore,
      status
    }
  });

  return toDomainMatch(match);
}

export async function listTournamentsByClub(clubSlug: ClubSlug): Promise<Tournament[]> {
  if (shouldUseLocalSampleData()) return localSampleState().tournaments;

  const prisma = await getPrisma();
  const club = await getClubOrThrow(clubSlug);
  const tournaments = await prisma.tournament.findMany({
    where: { clubId: club.id },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }, { id: "asc" }]
  });
  return tournaments.map(toDomainTournament);
}

export async function loadClubRecordData(clubSlug: ClubSlug): Promise<{ members: Member[]; tournaments: Tournament[]; matches: Match[] }> {
  if (shouldUseLocalSampleData()) {
    const state = localSampleState();
    return {
      members: state.members,
      tournaments: state.tournaments,
      matches: state.matches
    };
  }

  const prisma = await getPrisma();
  const club = await getClubOrThrow(clubSlug);
  const [members, tournaments, matches] = await Promise.all([
    prisma.member.findMany({
      where: { clubId: club.id, deleted: false },
      orderBy: [{ name: "asc" }, { id: "asc" }]
    }),
    prisma.tournament.findMany({
      where: { clubId: club.id },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }, { id: "asc" }]
    }),
    prisma.match.findMany({
      where: { tournament: { clubId: club.id } },
      orderBy: [{ tournament: { date: "desc" } }, { sortOrder: "asc" }, { matchNumber: "asc" }, { id: "asc" }]
    })
  ]);

  return {
    members: sortMembersByDisplayName(members.map(toDomainMember)),
    tournaments: tournaments.map(toDomainTournament),
    matches: matches.map(toDomainMatch)
  };
}

export async function loadTournamentStateFromDb(clubSlug: ClubSlug, tournamentId?: string): Promise<TournamentState> {
  if (shouldUseLocalSampleData()) return localSampleState();

  const prisma = await getPrisma();
  const club = await getClubOrThrow(clubSlug);
  const [members, tournaments, selectedTournament] = await Promise.all([
    prisma.member.findMany({
      where: { clubId: club.id, deleted: false },
      orderBy: [{ name: "asc" }, { id: "asc" }]
    }),
    prisma.tournament.findMany({
      where: { clubId: club.id },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }, { id: "asc" }]
    }),
    prisma.tournament.findFirst({
      where: { clubId: club.id, ...(tournamentId ? { id: tournamentId } : {}) },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }, { id: "asc" }],
      include: {
        participants: { orderBy: [{ sortOrder: "asc" }, { memberId: "asc" }] },
        groups: {
          orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
          include: {
            members: { orderBy: [{ sortOrder: "asc" }, { memberId: "asc" }] }
          }
        },
        matches: { orderBy: [{ sortOrder: "asc" }, { matchNumber: "asc" }, { id: "asc" }] }
      }
    })
  ]);

  const domainMembers = sortMembersByDisplayName(members.map(toDomainMember));
  if (!selectedTournament) return emptyTournamentState(domainMembers);

  const groups = selectedTournament.groups.map(toDomainGroup);
  const tournament = toDomainTournament(selectedTournament);
  const tournamentParticipantIds = {
    [selectedTournament.id]: selectedTournament.participants.map((participant) => participant.memberId)
  };
  const groupMemberIds = Object.fromEntries(
    selectedTournament.groups.map((group) => [group.id, group.members.map((member) => member.memberId)])
  );

  return {
    version: 8,
    adminUnlocked: false,
    members: domainMembers,
    tournaments: tournaments.map(toDomainTournament),
    currentTournamentId: selectedTournament.id,
    tournament,
    groups,
    tournamentParticipantIds,
    groupMemberIds,
    matches: selectedTournament.matches.map(toDomainMatch),
    deletedPublicSlugs: []
  };
}

export async function replaceTournamentState(clubSlug: ClubSlug, state: TournamentState): Promise<void> {
  const prisma = await getPrisma();
  const club = await getClubOrThrow(clubSlug);
  const tournament = withDateStatus(state.tournament);

  if (!tournament.id) throw new Error("Tournament id is required");

  await prisma.$transaction(async (tx) => {
    const existing = await tx.tournament.findFirst({
      where: { id: tournament.id, clubId: club.id },
      select: { id: true }
    });
    if (!existing) throw new Error(`Tournament not found: ${tournament.id}`);

    const clubMembers = await tx.member.findMany({
      where: { clubId: club.id, deleted: false },
      select: { id: true }
    });
    const clubMemberIds = new Set(clubMembers.map((member) => member.id));
    const participantIds = state.tournamentParticipantIds[tournament.id] ?? [];
    const participantIdSet = new Set(participantIds);

    for (const ids of Object.values(state.tournamentParticipantIds)) {
      assertAllowedIds(ids, clubMemberIds, "Tournament participant is not an active club member");
    }

    const groups = state.groups;
    const groupIds = new Set(groups.map((group) => group.id));
    for (const group of groups) {
      if (group.tournamentId !== tournament.id) throw new Error(`Group does not belong to tournament: ${group.id}`);
      const groupMemberIds = state.groupMemberIds[group.id] ?? [];
      assertAllowedIds(groupMemberIds, clubMemberIds, "Group member is not an active club member");
      assertAllowedIds(groupMemberIds, participantIdSet, "Group member is not a tournament participant");
      assertAllowedIds(group.seedPlayerIds ?? [], new Set(groupMemberIds), "Seed player is not assigned to group");
    }

    for (const [groupId, memberIds] of Object.entries(state.groupMemberIds)) {
      if (memberIds.length > 0 && !groupIds.has(groupId)) throw new Error(`Group members reference unknown group: ${groupId}`);
    }

    for (const match of state.matches) {
      if (match.tournamentId !== tournament.id) throw new Error(`Match does not belong to tournament: ${match.id}`);
      if (!groupIds.has(match.groupId)) throw new Error(`Match references unknown group: ${match.id}`);
      const groupMemberIds = new Set(state.groupMemberIds[match.groupId] ?? []);
      const playerIds = matchPlayerIds(match);
      assertAllowedIds(playerIds, clubMemberIds, "Match player is not an active club member");
      assertAllowedIds(playerIds, groupMemberIds, "Match player is not assigned to group");
    }

    await tx.tournament.update({
      where: { id: tournament.id },
      data: {
        name: tournament.name,
        date: toDbDate(tournament.date),
        publicSlug: tournament.publicSlug,
        status: tournament.status
      }
    });

    await tx.match.deleteMany({ where: { tournamentId: tournament.id } });
    await tx.tournamentGroupMember.deleteMany({
      where: { group: { tournamentId: tournament.id } }
    });
    await tx.tournamentGroup.deleteMany({ where: { tournamentId: tournament.id } });
    await tx.tournamentParticipant.deleteMany({ where: { tournamentId: tournament.id } });

    if (participantIds.length > 0) {
      await tx.tournamentParticipant.createMany({
        data: participantIds.map((memberId, index) => ({
          tournamentId: tournament.id,
          memberId,
          sortOrder: index + 1
        }))
      });
    }

    if (groups.length > 0) {
      await tx.tournamentGroup.createMany({
        data: groups.map((group, index) => ({
          id: group.id,
          tournamentId: tournament.id,
          name: group.name,
          scheduleFormat: toDbScheduleFormat(group.scheduleFormat),
          sortOrder: group.sortOrder || index + 1,
          seedPlayerIds: group.seedPlayerIds ?? []
        }))
      });
    }

    const groupMembers = groups.flatMap((group) =>
      (state.groupMemberIds[group.id] ?? []).map((memberId, index) => ({
        groupId: group.id,
        memberId,
        sortOrder: index + 1
      }))
    );
    if (groupMembers.length > 0) {
      await tx.tournamentGroupMember.createMany({ data: groupMembers });
    }

    const matches = state.matches;
    if (matches.length > 0) {
      await tx.match.createMany({
        data: matches.map((match, index) => ({
          id: match.id,
          tournamentId: tournament.id,
          groupId: match.groupId,
          matchNumber: match.matchNumber,
          sideAPlayerIds: match.sideAPlayerIds,
          sideBPlayerIds: match.sideBPlayerIds,
          sideAScore: match.sideAScore,
          sideBScore: match.sideBScore,
          status: match.status,
          sortOrder: match.sortOrder || index + 1,
          courtNumber: match.courtNumber ?? null
        }))
      });
    }
  });
}

export async function loadPublicTournamentState(clubSlug: ClubSlug, publicSlug: string): Promise<TournamentState | null> {
  if (shouldUseLocalSampleData()) {
    const state = localSampleState();
    return state.tournament.publicSlug === publicSlug ? state : null;
  }

  const prisma = await getPrisma();
  const club = await getClubOrThrow(clubSlug);
  const tournamentInclude = {
    participants: { orderBy: [{ sortOrder: "asc" as const }, { memberId: "asc" as const }] },
    groups: {
      orderBy: [{ sortOrder: "asc" as const }, { id: "asc" as const }],
      include: {
        members: { orderBy: [{ sortOrder: "asc" as const }, { memberId: "asc" as const }] }
      }
    },
    matches: { orderBy: [{ sortOrder: "asc" as const }, { matchNumber: "asc" as const }, { id: "asc" as const }] }
  };
  let selectedTournament = await prisma.tournament.findUnique({
    where: { clubId_publicSlug: { clubId: club.id, publicSlug } },
    include: tournamentInclude
  });

  if (!selectedTournament && /^\d{4}$/.test(publicSlug)) {
    const candidates = await prisma.tournament.findMany({
      where: { clubId: club.id },
      include: tournamentInclude
    });
    selectedTournament = candidates.find((tournament) => createTournamentSlug(tournament.id) === publicSlug) ?? null;
  }

  if (!selectedTournament) return null;

  const memberIds = collectPublicTournamentMemberIds(selectedTournament);
  const members =
    memberIds.length > 0
      ? await prisma.member.findMany({
          where: { clubId: club.id, deleted: false, id: { in: memberIds } },
          orderBy: [{ name: "asc" }, { id: "asc" }]
        })
      : [];
  const tournament = { ...toDomainTournament(selectedTournament), publicSlug };
  const groups = selectedTournament.groups.map(toDomainGroup);
  const tournamentParticipantIds = {
    [selectedTournament.id]: selectedTournament.participants.map((participant) => participant.memberId)
  };
  const groupMemberIds = Object.fromEntries(
    selectedTournament.groups.map((group) => [group.id, group.members.map((member) => member.memberId)])
  );

  return {
    version: 8,
    adminUnlocked: false,
    members: members.map(toPublicDomainMember),
    tournaments: [tournament],
    currentTournamentId: selectedTournament.id,
    tournament,
    groups,
    tournamentParticipantIds,
    groupMemberIds,
    matches: selectedTournament.matches.map(toDomainMatch),
    deletedPublicSlugs: []
  };
}
