import type { ScheduleFormat } from "@prisma/client";
import type { ClubSlug } from "../../domain/club";
import { withDateStatus } from "../../domain/tournament-status";
import type { Match, Member, Tournament, TournamentGroup } from "../../domain/types";
import type { TournamentState } from "../../store/tournament-store";

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
