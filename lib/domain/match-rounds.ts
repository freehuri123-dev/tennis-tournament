import type { Match } from "./types";

export type ExplicitMatchRound = {
  roundNumber: number;
  matches: Match[];
};

export function groupMatchesByExplicitRound(matches: Match[]): ExplicitMatchRound[] {
  const rounds = new Map<number, Match[]>();

  for (const match of matches) {
    if (!Number.isInteger(match.roundNumber) || (match.roundNumber ?? 0) < 1) continue;
    const roundNumber = match.roundNumber as number;
    const roundMatches = rounds.get(roundNumber) ?? [];
    roundMatches.push(match);
    rounds.set(roundNumber, roundMatches);
  }

  return [...rounds.entries()]
    .sort(([left], [right]) => left - right)
    .map(([roundNumber, roundMatches]) => ({
      roundNumber,
      matches: [...roundMatches].sort((left, right) => left.sortOrder - right.sortOrder)
    }));
}
