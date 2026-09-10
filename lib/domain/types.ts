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

export type TournamentType = "general" | "team-battle" | "tournament";
export type TeamSide = "blue" | "white";
export type TeamBattleMatchMode = "balanced" | "similar-level";

export type Tournament = {
  id: string;
  name: string;
  date: string;
  publicSlug: string;
  status: "draft" | "active" | "completed";
  type?: TournamentType;
  scheduleLocked?: boolean;
  rankingExcludedMemberIds?: string[];
  includeInClubRecords?: boolean;
};

export type TournamentGroup = {
  id: string;
  tournamentId: string;
  name: string;
  scheduleFormat: "hanul-aa" | "kdk-v2010" | "random" | "fixed-pair-league" | "fixed-pair-tournament" | "single-tournament" | "team-battle";
  sortOrder: number;
  seedPlayerIds?: string[];
  randomCourtCount?: number;
  randomGamesPerPlayer?: number;
  kdkPlayerGameCounts?: Record<string, number>;
  teamBattleMatchMode?: TeamBattleMatchMode;
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
  courtNumber?: string | null;
  roundNumber?: number | null;
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

export type TeamRankingRow = {
  teamId: string;
  memberIds: string[];
  name: string;
  rank: number;
  matchesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  pointDiff: number;
};
