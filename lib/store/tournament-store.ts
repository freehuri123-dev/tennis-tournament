"use client";

import { createSampleMatches, sampleGroupMemberIds, sampleGroups, sampleMembers, sampleTournament } from "@/lib/domain/sample-data";
import type { Match, Member, Tournament, TournamentGroup } from "@/lib/domain/types";

export type TournamentState = {
  adminUnlocked: boolean;
  members: Member[];
  tournament: Tournament;
  groups: TournamentGroup[];
  groupMemberIds: Record<string, string[]>;
  matches: Match[];
};

const STORAGE_KEY = "tennis-monthly-tournament-state";
const ADMIN_PASSWORD = "1234";

export function createInitialState(): TournamentState {
  return {
    adminUnlocked: false,
    members: sampleMembers,
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
  return JSON.parse(saved) as TournamentState;
}

export function saveTournamentState(state: TournamentState) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
