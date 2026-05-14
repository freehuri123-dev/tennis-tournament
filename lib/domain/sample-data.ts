import { generateInitialMatches } from "./schedule";
import type { Match, Member, Tournament, TournamentGroup } from "./types";

export const sampleMembers: Member[] = [
  { id: "m1", name: "김철수", level: "A", notes: "" },
  { id: "m2", name: "박영희", level: "A", notes: "" },
  { id: "m3", name: "이민수", level: "B", notes: "" },
  { id: "m4", name: "최은정", level: "B", notes: "" },
  { id: "m5", name: "정우진", level: "C", notes: "" },
  { id: "m6", name: "한미라", level: "C", notes: "" },
  { id: "m7", name: "오세훈", level: "B", notes: "" },
  { id: "m8", name: "강지연", level: "C", notes: "" }
];

export const sampleTournament: Tournament = {
  id: "t1",
  name: "5월 월례대회",
  date: "2026-05-24",
  publicSlug: "monthly-demo",
  status: "active"
};

export const sampleGroups: TournamentGroup[] = [
  { id: "g1", tournamentId: "t1", name: "A조", scheduleFormat: "hanul-aa", sortOrder: 1 },
  { id: "g2", tournamentId: "t1", name: "B조", scheduleFormat: "kdk-v2010", sortOrder: 2 }
];

export const sampleGroupMemberIds: Record<string, string[]> = {
  g1: ["m1", "m2", "m3", "m4"],
  g2: ["m5", "m6", "m7", "m8"]
};

export function createSampleMatches(): Match[] {
  return sampleGroups.flatMap((group) =>
    generateInitialMatches({
      tournamentId: sampleTournament.id,
      groupId: group.id,
      format: group.scheduleFormat,
      participants: sampleMembers.filter((member) => sampleGroupMemberIds[group.id].includes(member.id))
    })
  );
}
