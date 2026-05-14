"use client";

import { createSampleMatches, sampleGroupMemberIds, sampleGroups, sampleMembers, sampleTournament, sampleTournaments } from "@/lib/domain/sample-data";
import { withDateStatus } from "@/lib/domain/tournament-status";
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
const STORAGE_VERSION = 5;

export function createInitialState(): TournamentState {
  return {
    version: STORAGE_VERSION,
    adminUnlocked: false,
    members: sampleMembers,
    tournaments: sampleTournaments.map((tournament) => withDateStatus(tournament)),
    currentTournamentId: sampleTournament.id,
    tournament: withDateStatus(sampleTournament),
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
  const tournaments = (parsed.tournaments ?? [parsed.tournament ?? initial.tournament, ...initial.tournaments.filter((item) => item.id !== (parsed.tournament ?? initial.tournament).id)]).map((tournament) => withDateStatus(tournament));
  const currentTournamentId = parsed.currentTournamentId ?? (parsed.tournament ?? initial.tournament).id;
  const tournament = withDateStatus(parsed.tournament ?? tournaments.find((item) => item.id === currentTournamentId) ?? initial.tournament);

  return {
    ...initial,
    ...parsed,
    tournaments,
    currentTournamentId,
    tournament,
    groups: parsed.groups ?? initial.groups,
    groupMemberIds: parsed.groupMemberIds ?? initial.groupMemberIds,
    matches: parsed.matches ?? initial.matches,
    members: parsed.members ?? initial.members
  };
}

export function saveTournamentState(state: TournamentState) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
