import type { ScheduleFormat } from "@prisma/client";
import type { z } from "zod";
import type { ClubSlug } from "../../domain/club";
import { withDateStatus } from "../../domain/tournament-status";
import type { Match, Member, Tournament, TournamentGroup } from "../../domain/types";
import type { TournamentState } from "../../store/tournament-store";
import type { matchScoreInputSchema, memberInputSchema, tournamentInputSchema } from "../validation";

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
    publicSlug: tournament.publicSlug,
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
    sortOrder: match.sortOrder
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
      name: "대회 없음",
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

export async function getClubOrThrow(clubSlug: ClubSlug) {
  const prisma = await getPrisma();
  const club = await prisma.club.findUnique({ where: { slug: clubSlug } });
  if (!club) throw new Error(`Club not found: ${clubSlug}`);
  return club;
}

export async function listMembersByClub(clubSlug: ClubSlug): Promise<Member[]> {
  const prisma = await getPrisma();
  const club = await getClubOrThrow(clubSlug);
  const members = await prisma.member.findMany({
    where: { clubId: club.id, deleted: false },
    orderBy: [{ name: "asc" }, { id: "asc" }]
  });
  return members.map(toDomainMember);
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

export async function softDeleteMember(memberId: string): Promise<void> {
  const prisma = await getPrisma();
  await prisma.member.update({
    where: { id: memberId },
    data: { active: false, deleted: true }
  });
}

export async function updateMatchScore(input: MatchScoreInput): Promise<Match> {
  const prisma = await getPrisma();
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
  const prisma = await getPrisma();
  const club = await getClubOrThrow(clubSlug);
  const tournaments = await prisma.tournament.findMany({
    where: { clubId: club.id },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }, { id: "asc" }]
  });
  return tournaments.map(toDomainTournament);
}

export async function loadTournamentStateFromDb(clubSlug: ClubSlug, tournamentId?: string): Promise<TournamentState> {
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

  const domainMembers = members.map(toDomainMember);
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

export async function loadPublicTournamentState(clubSlug: ClubSlug, publicSlug: string): Promise<TournamentState | null> {
  const prisma = await getPrisma();
  const club = await getClubOrThrow(clubSlug);
  const selectedTournament = await prisma.tournament.findUnique({
    where: { clubId_publicSlug: { clubId: club.id, publicSlug } },
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
  });

  if (!selectedTournament) return null;

  const memberIds = collectPublicTournamentMemberIds(selectedTournament);
  const members =
    memberIds.length > 0
      ? await prisma.member.findMany({
          where: { clubId: club.id, deleted: false, id: { in: memberIds } },
          orderBy: [{ name: "asc" }, { id: "asc" }]
        })
      : [];
  const tournament = toDomainTournament(selectedTournament);
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
