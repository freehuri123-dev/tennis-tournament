import type { Match } from "./types";

type IndexedMatch = {
  match: Match;
  originalIndex: number;
  playerIds: Set<string>;
};

function overlaps(left: Set<string>, right: Set<string>) {
  return [...left].some((id) => right.has(id));
}

function selectRoundMatches(remaining: IndexedMatch[], courtCount: number, previousPlayerIds: Set<string>) {
  const conflictCounts = new Map(remaining.map((candidate) => [
    candidate.match.id,
    remaining.filter((other) => candidate !== other && overlaps(candidate.playerIds, other.playerIds)).length
  ]));
  const candidates = [...remaining].sort((left, right) =>
    (conflictCounts.get(right.match.id) ?? 0) - (conflictCounts.get(left.match.id) ?? 0)
      || left.originalIndex - right.originalIndex
  );
  let best: IndexedMatch[] = [];
  let bestRestPenalty = Number.POSITIVE_INFINITY;
  let bestConflictScore = -1;
  let bestOrderScore = Number.POSITIVE_INFINITY;
  let visits = 0;

  function consider(selected: IndexedMatch[]) {
    const restPenalty = selected.reduce((sum, candidate) =>
      sum + [...candidate.playerIds].filter((id) => previousPlayerIds.has(id)).length, 0);
    const conflictScore = selected.reduce((sum, candidate) => sum + (conflictCounts.get(candidate.match.id) ?? 0), 0);
    const orderScore = selected.reduce((sum, candidate) => sum + candidate.originalIndex, 0);
    if (selected.length > best.length
      || (selected.length === best.length && restPenalty < bestRestPenalty)
      || (selected.length === best.length && restPenalty === bestRestPenalty && conflictScore > bestConflictScore)
      || (selected.length === best.length && restPenalty === bestRestPenalty && conflictScore === bestConflictScore && orderScore < bestOrderScore)) {
      best = [...selected];
      bestRestPenalty = restPenalty;
      bestConflictScore = conflictScore;
      bestOrderScore = orderScore;
    }
  }

  function search(startIndex: number, selected: IndexedMatch[], usedPlayerIds: Set<string>) {
    visits += 1;
    if (visits > 50_000) return;
    consider(selected);
    if (selected.length >= courtCount) return;
    for (let index = startIndex; index < candidates.length; index += 1) {
      const candidate = candidates[index];
      if (overlaps(candidate.playerIds, usedPlayerIds)) continue;
      search(index + 1, [...selected, candidate], new Set([...usedPlayerIds, ...candidate.playerIds]));
    }
  }

  search(0, [], new Set());
  return best.length > 0 ? best : [remaining[0]];
}

export function scheduleMatchesAcrossCourts(matches: Match[], courtNumbers: string[]): Match[] {
  if (matches.length === 0 || courtNumbers.length === 0) return matches;

  let remaining: IndexedMatch[] = matches.map((match, originalIndex) => ({
    match,
    originalIndex,
    playerIds: new Set([...match.sideAPlayerIds, ...match.sideBPlayerIds].filter(Boolean))
  }));
  const scheduled: Match[] = [];
  let previousPlayerIds = new Set<string>();
  let roundNumber = 1;

  while (remaining.length > 0) {
    const selected = selectRoundMatches(remaining, courtNumbers.length, previousPlayerIds);
    selected.sort((left, right) => left.originalIndex - right.originalIndex).forEach((candidate, courtIndex) => {
      scheduled.push({
        ...candidate.match,
        roundNumber,
        courtNumber: courtNumbers[(roundNumber - 1 + courtIndex) % courtNumbers.length]
      });
    });
    const selectedIds = new Set(selected.map((candidate) => candidate.match.id));
    previousPlayerIds = new Set(selected.flatMap((candidate) => [...candidate.playerIds]));
    remaining = remaining.filter((candidate) => !selectedIds.has(candidate.match.id));
    roundNumber += 1;
  }

  const groupMatchNumbers = new Map<string, number>();
  return scheduled.map((match) => {
    const nextNumber = (groupMatchNumbers.get(match.groupId) ?? 0) + 1;
    groupMatchNumbers.set(match.groupId, nextNumber);
    return { ...match, matchNumber: nextNumber, sortOrder: nextNumber };
  });
}
