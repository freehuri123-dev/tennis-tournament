"use client";

import { createSampleMatches, sampleGroupMemberIds, sampleGroups, sampleMembers, sampleTournament, sampleTournaments } from "../domain/sample-data";
import { withDateStatus } from "../domain/tournament-status";
import type { Match, Member, TeamSide, Tournament, TournamentGroup, TournamentType } from "../domain/types";
import type { ClubSlug } from "../domain/club";

export type TournamentState = {
  version: number;
  adminUnlocked: boolean;
  members: Member[];
  tournaments: Tournament[];
  currentTournamentId: string;
  tournament: Tournament;
  groups: TournamentGroup[];
  tournamentParticipantIds: Record<string, string[]>;
  groupMemberIds: Record<string, string[]>;
  teamAssignments?: Record<string, Record<string, TeamSide>>;
  matches: Match[];
  deletedPublicSlugs: string[];
};

const STORAGE_KEY = "tennis-monthly-tournament-state";
const ADMIN_PASSWORD = "1234";
const STORAGE_VERSION = 9;

export function inferTournamentType(tournament: Partial<Tournament>, groups: TournamentGroup[]): TournamentType {
  if (tournament.type) return tournament.type;
  return groups.some((group) => group.scheduleFormat === "fixed-pair-tournament" || group.scheduleFormat === "single-tournament")
    ? "tournament"
    : groups.some((group) => group.scheduleFormat === "team-battle")
      ? "team-battle"
      : "general";
}

function normalizeTournamentType(tournament: Tournament, groups: TournamentGroup[]): Tournament {
  return { ...tournament, type: inferTournamentType(tournament, groups.filter((group) => group.tournamentId === tournament.id)) };
}

function collectParticipantIds(groupMemberIds: Record<string, string[]>) {
  return Array.from(new Set(Object.values(groupMemberIds).flat()));
}

export function getTournamentStorageKey(clubSlug?: ClubSlug) {
  return clubSlug ? `${STORAGE_KEY}:${clubSlug}` : STORAGE_KEY;
}

export function createInitialState(): TournamentState {
  return {
    version: STORAGE_VERSION,
    adminUnlocked: false,
    members: sampleMembers,
    tournaments: sampleTournaments.map((tournament) => withDateStatus(tournament)),
    currentTournamentId: sampleTournament.id,
    tournament: withDateStatus(sampleTournament),
    groups: sampleGroups,
    tournamentParticipantIds: { [sampleTournament.id]: collectParticipantIds(sampleGroupMemberIds) },
    groupMemberIds: sampleGroupMemberIds,
    teamAssignments: {},
    matches: createSampleMatches(),
    deletedPublicSlugs: []
  };
}

export function checkAdminPassword(password: string) {
  return password === ADMIN_PASSWORD;
}

export function loadTournamentState(clubSlug?: ClubSlug): TournamentState {
  if (typeof window === "undefined") return createInitialState();
  const saved = window.localStorage.getItem(getTournamentStorageKey(clubSlug));
  if (!saved) return createInitialState();
  const parsed = JSON.parse(saved) as Partial<TournamentState>;
  const initial = createInitialState();
  const loadedGroups = parsed.groups ?? initial.groups;
  const tournaments = (parsed.tournaments ?? [parsed.tournament ?? initial.tournament, ...initial.tournaments.filter((item) => item.id !== (parsed.tournament ?? initial.tournament).id)])
    .map((tournament) => normalizeTournamentType(withDateStatus(tournament), loadedGroups));
  const currentTournamentId = parsed.currentTournamentId ?? (parsed.tournament ?? initial.tournament).id;
  const tournament = normalizeTournamentType(withDateStatus(parsed.tournament ?? tournaments.find((item) => item.id === currentTournamentId) ?? initial.tournament), loadedGroups);

  return {
    ...initial,
    ...parsed,
    version: STORAGE_VERSION,
    tournaments,
    currentTournamentId,
    tournament,
    groups: loadedGroups,
    tournamentParticipantIds: parsed.tournamentParticipantIds ?? {
      [currentTournamentId]: collectParticipantIds(parsed.groupMemberIds ?? initial.groupMemberIds)
    },
    groupMemberIds: parsed.groupMemberIds ?? initial.groupMemberIds,
    teamAssignments: parsed.teamAssignments ?? {},
    matches: parsed.matches ?? initial.matches,
    members: parsed.members ?? initial.members,
    deletedPublicSlugs: parsed.deletedPublicSlugs ?? []
  };
}

export function saveTournamentState(state: TournamentState, clubSlug?: ClubSlug) {
  window.localStorage.setItem(getTournamentStorageKey(clubSlug), JSON.stringify(state));
}
