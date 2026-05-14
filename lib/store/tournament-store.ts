"use client";

import { createSampleMatches, sampleGroupMemberIds, sampleGroups, sampleMembers, sampleTournament, sampleTournaments } from "@/lib/domain/sample-data";
import type { Match, Member, Tournament, TournamentGroup } from "@/lib/domain/types";

export type TournamentState = {
  version: number;
  adminUnlocked: boolean;
  members: Member[];
  tournaments: Tournament[];
  currentTournamentId: string;
  tournament: Tournament;
  groups: TournamentGroup[];
  groupMemberIds: Record<string, string[]>;
  matches: Match[];
};

const STORAGE_KEY = "tennis-monthly-tournament-state";
const ADMIN_PASSWORD = "1234";
const STORAGE_VERSION = 2;

export function createInitialState(): TournamentState {
  return {
    version: STORAGE_VERSION,
    adminUnlocked: false,
    members: sampleMembers,
    tournaments: sampleTournaments,
    currentTournamentId: sampleTournament.id,
    tournament: sampleTournament,
    groups: sampleGroups,
    groupMemberIds: sampleGroupMemberIds,
    matches: createSampleMatches()
  };
}

export function checkAdminPassword(password: string) {
  return password === ADMIN_PASSWORD;
}

export function loadTournamentState(): TournamentState {
  if (typeof window === "undefined") return createInitialState();
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (!saved) return createInitialState();
  const parsed = JSON.parse(saved) as Partial<TournamentState>;
  const initial = createInitialState();
  if (parsed.version !== STORAGE_VERSION) return initial;
  return {
    ...initial,
    ...parsed,
    tournaments: parsed.tournaments ?? [parsed.tournament ?? initial.tournament, ...initial.tournaments.filter((item) => item.id !== (parsed.tournament ?? initial.tournament).id)],
    currentTournamentId: parsed.currentTournamentId ?? (parsed.tournament ?? initial.tournament).id,
    tournament: parsed.tournament ?? initial.tournament,
    groups: parsed.groups ?? initial.groups,
    groupMemberIds: parsed.groupMemberIds ?? initial.groupMemberIds,
    matches: parsed.matches ?? initial.matches,
    members: parsed.members ?? initial.members
  };
}

export function saveTournamentState(state: TournamentState) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
