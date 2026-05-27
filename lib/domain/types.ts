export type Member = {
  id: string;
  name: string;
  gender?: "male" | "female";
  level?: string;
  notes: string;
  phone?: string;
  active?: boolean;
  deleted?: boolean;
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
  scheduleFormat: "hanul-aa" | "kdk-v2010" | "random" | "fixed-pair-tournament" | "single-tournament";
  sortOrder: number;
  seedPlayerIds?: string[];
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
  draws: number;
  losses: number;
  rankingPoints: number;
  pointsFor: number;
  pointsAgainst: number;
  pointDiff: number;
};
