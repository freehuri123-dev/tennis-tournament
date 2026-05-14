export type Member = {
  id: string;
  name: string;
  level: string;
  notes: string;
  phone?: string;
  active?: boolean;
};

export type Tournament = {
  id: string;
  name: string;
  date: string;
  publicSlug: string;
  status: "draft" | "active" | "completed";
};

export type TournamentGroup = {
  id: string;
  tournamentId: string;
  name: string;
  scheduleFormat: "hanul-aa" | "kdk-v2010";
  sortOrder: number;
};

export type MatchStatus = "scheduled" | "completed";

export type Match = {
  id: string;
  tournamentId: string;
  groupId: string;
  matchNumber: number;
  sideAPlayerIds: string[];
  sideBPlayerIds: string[];
  sideAScore: number | null;
  sideBScore: number | null;
  status: MatchStatus;
  sortOrder: number;
};

export type RankingRow = {
  memberId: string;
  name: string;
  rank: number;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  pointDiff: number;
};
