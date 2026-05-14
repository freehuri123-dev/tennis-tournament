import { generateInitialMatches } from "./schedule";
import { withDateStatus } from "./tournament-status";
import type { Match, Member, Tournament, TournamentGroup } from "./types";

export const sampleMembers: Member[] = [
  { id: "m1", name: "김철수", gender: "male", notes: "", phone: "010-1234-1001" },
  { id: "m2", name: "박영희", gender: "female", notes: "", phone: "010-1234-1002" },
  { id: "m3", name: "이민수", gender: "male", notes: "", phone: "010-1234-1003" },
  { id: "m4", name: "최은정", gender: "female", notes: "", phone: "010-1234-1004" },
  { id: "m5", name: "정우진", gender: "male", notes: "", phone: "010-1234-1005" },
  { id: "m6", name: "한미라", gender: "female", notes: "", phone: "010-1234-1006" },
  { id: "m7", name: "오세훈", gender: "male", notes: "", phone: "010-1234-1007" },
  { id: "m8", name: "강지연", gender: "female", notes: "", phone: "010-1234-1008" },
  { id: "m9", name: "윤도현", gender: "male", notes: "", phone: "010-1234-1009" },
  { id: "m10", name: "서민재", gender: "female", notes: "", phone: "010-1234-1010" }
];

export const sampleTournament: Tournament = withDateStatus({
  id: "t1",
  name: "5월 월례대회",
  date: "2026-05-24",
  publicSlug: "tournament-t1",
  status: "draft"
});

export const sampleTournaments: Tournament[] = [
  sampleTournament,
  withDateStatus({
    id: "t0",
    name: "4월 월례대회",
    date: "2026-04-20",
    publicSlug: "tournament-t0",
    status: "completed"
  })
];

export const sampleGroups: TournamentGroup[] = [
  { id: "g1", tournamentId: "t1", name: "A조", scheduleFormat: "kdk-v2010", sortOrder: 1, seedPlayerIds: [] },
  { id: "g2", tournamentId: "t1", name: "B조", scheduleFormat: "hanul-aa", sortOrder: 2, seedPlayerIds: [] }
];

export const sampleGroupMemberIds: Record<string, string[]> = {
  g1: ["m1", "m2", "m3", "m4", "m5"],
  g2: ["m6", "m7", "m8", "m9", "m10"]
};

export function createSampleMatches(): Match[] {
  return sampleGroups.flatMap((group) =>
    generateInitialMatches({
      tournamentId: sampleTournament.id,
      groupId: group.id,
      format: group.scheduleFormat,
      seedPlayerIds: group.seedPlayerIds,
      participants: sampleMembers.filter((member) => sampleGroupMemberIds[group.id].includes(member.id))
    })
  );
}
