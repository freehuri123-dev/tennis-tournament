import type { Match, Member, TeamBattleMatchMode, TeamSide } from "./types";

export const TEAM_BATTLE_MAXIMUM_GAMES = 4;

export type TeamBattleSideGamePlan = {
  baseGames: number;
  extraGamePlayerCount: number;
  totalAppearances: number;
};

export type TeamBattleResult = {
  blueWins: number;
  whiteWins: number;
  draws: number;
  completedMatches: number;
};

export type TeamGrade = "A" | "B" | "C" | "D";

export function normalizeTeamGrade(level?: string): TeamGrade {
  const normalized = level?.trim().toUpperCase() ?? "";
  if (normalized.startsWith("A")) return "A";
  if (normalized.startsWith("C")) return "C";
  if (normalized.startsWith("D")) return "D";
  return "B";
}

function numericTeamLevel(level?: string): number | null {
  const value = level?.trim() ?? "";
  if (!/^[1-7]$/.test(value)) return null;
  return Number(value);
}

export function teamGradeWeight(member: Pick<Member, "level">): number {
  return numericTeamLevel(member.level) ?? { A: 4, B: 3, C: 2, D: 1 }[normalizeTeamGrade(member.level)];
}

function assignmentBalance(
  members: Member[],
  assignments: Partial<Record<string, TeamSide>>
): { countDifference: number; averageDifferenceScore: number } | null {
  const totals: Record<TeamSide, { count: number; strength: number }> = {
    blue: { count: 0, strength: 0 },
    white: { count: 0, strength: 0 }
  };
  for (const member of members) {
    const side = assignments[member.id];
    if (!side) return null;
    totals[side].count += 1;
    totals[side].strength += teamGradeWeight(member);
  }
  return {
    countDifference: Math.abs(totals.blue.count - totals.white.count),
    averageDifferenceScore: totals.blue.count === 0 || totals.white.count === 0
      ? Number.MAX_SAFE_INTEGER
      : Math.abs(totals.blue.strength * totals.white.count - totals.white.strength * totals.blue.count)
  };
}

export function balanceTeamAssignments(
  members: Member[],
  previousAssignments: Partial<Record<string, TeamSide>> = {}
): Record<string, TeamSide> {
  const ordered = [...members].sort((left, right) =>
    teamGradeWeight(right) - teamGradeWeight(left) || left.name.localeCompare(right.name, "ko") || left.id.localeCompare(right.id)
  );
  const blueCount = Math.ceil(ordered.length / 2);
  const totalStrength = ordered.reduce((sum, member) => sum + teamGradeWeight(member), 0);
  const combinations = Array.from({ length: blueCount + 1 }, () => new Map<number, string[]>());
  combinations[0].set(0, []);
  for (const member of ordered) {
    const weight = teamGradeWeight(member);
    for (let count = blueCount; count >= 1; count -= 1) {
      for (const [strength, memberIds] of [...combinations[count - 1].entries()]) {
        const nextStrength = strength + weight;
        if (!combinations[count].has(nextStrength)) combinations[count].set(nextStrength, [...memberIds, member.id]);
      }
    }
  }

  let bestBlueIds: string[] = [];
  let bestScore = Number.MAX_SAFE_INTEGER;
  let bestKey = "";
  for (const [blueStrength, memberIds] of combinations[blueCount]) {
    const whiteCount = ordered.length - blueCount;
    const whiteStrength = totalStrength - blueStrength;
    const score = whiteCount === 0 ? 0 : Math.abs(blueStrength * whiteCount - whiteStrength * blueCount);
    const key = memberIds.join("|");
    if (score < bestScore || (score === bestScore && (bestKey === "" || key < bestKey))) {
      bestBlueIds = memberIds;
      bestScore = score;
      bestKey = key;
    }
  }
  const blueIdSet = new Set(bestBlueIds);
  const assignments = Object.fromEntries(ordered.map((member) => [
    member.id,
    blueIdSet.has(member.id) ? "blue" : "white"
  ])) as Record<string, TeamSide>;

  const optimalBalance = assignmentBalance(members, assignments);
  const previousBalance = assignmentBalance(members, previousAssignments);
  if (!optimalBalance || !previousBalance
    || optimalBalance.countDifference !== previousBalance.countDifference
    || optimalBalance.averageDifferenceScore !== previousBalance.averageDifferenceScore) {
    return assignments;
  }

  const blueMembers = members.filter((member) => previousAssignments[member.id] === "blue");
  const whiteMembers = members.filter((member) => previousAssignments[member.id] === "white");
  const swaps: Array<{ blueIds: string[]; whiteIds: string[] }> = [];
  for (const blueMember of blueMembers) {
    for (const whiteMember of whiteMembers) {
      if (teamGradeWeight(blueMember) === teamGradeWeight(whiteMember)) {
        swaps.push({ blueIds: [blueMember.id], whiteIds: [whiteMember.id] });
      }
    }
  }
  if (swaps.length === 0) {
    for (const bluePair of pairs(blueMembers)) {
      for (const whitePair of pairs(whiteMembers)) {
        const blueStrength = teamGradeWeight(bluePair[0]) + teamGradeWeight(bluePair[1]);
        const whiteStrength = teamGradeWeight(whitePair[0]) + teamGradeWeight(whitePair[1]);
        if (blueStrength === whiteStrength) {
          swaps.push({ blueIds: bluePair.map((member) => member.id), whiteIds: whitePair.map((member) => member.id) });
        }
      }
    }
  }
  if (swaps.length === 0) {
    return Object.fromEntries(members.map((member) => [
      member.id,
      previousAssignments[member.id] === "blue" ? "white" : "blue"
    ]));
  }

  const selectedSwap = swaps[Math.floor(Math.random() * swaps.length)];
  const nextAssignments = { ...previousAssignments } as Record<string, TeamSide>;
  selectedSwap.blueIds.forEach((memberId) => { nextAssignments[memberId] = "white"; });
  selectedSwap.whiteIds.forEach((memberId) => { nextAssignments[memberId] = "blue"; });
  return nextAssignments;
}
function pairs<T>(items: T[]): Array<[T, T]> {
  const result: Array<[T, T]> = [];
  for (let left = 0; left < items.length - 1; left += 1) {
    for (let right = left + 1; right < items.length; right += 1) result.push([items[left], items[right]]);
  }
  return result;
}

function pairKey(ids: string[]) {
  return [...ids].sort().join("|");
}

type TeamBattleBalanceScore = {
  similarLevelViolationCount: number;
  severeMatchCount: number;
  maximumGap: number;
  squaredGapTotal: number;
  partnerRepeatPenalty: number;
  opponentRepeatPenalty: number;
};

function compareTeamBattleBalanceScore(left: TeamBattleBalanceScore, right: TeamBattleBalanceScore) {
  return left.similarLevelViolationCount - right.similarLevelViolationCount
    || left.severeMatchCount - right.severeMatchCount
    || left.maximumGap - right.maximumGap
    || left.squaredGapTotal - right.squaredGapTotal
    || left.partnerRepeatPenalty - right.partnerRepeatPenalty
    || left.opponentRepeatPenalty - right.opponentRepeatPenalty;
}

function repeatedCombinationPenalty(counts: Map<string, number>) {
  return [...counts.values()].reduce((sum, count) => sum + Math.max(0, count - 1) ** 2, 0);
}

type FeaturedSameGradeMatch = {
  grade: string;
  blueIds: [string, string];
  whiteIds: [string, string];
};

function normalizedTeamLevel(level?: string): string {
  return String(numericTeamLevel(level) ?? normalizeTeamGrade(level));
}

function findFeaturedSameGradeMatch(blueMembers: Member[], whiteMembers: Member[]): FeaturedSameGradeMatch | null {
  const levels = [...new Set([...blueMembers, ...whiteMembers].map((member) => normalizedTeamLevel(member.level)))]
    .sort((left, right) => teamGradeWeight({ level: right }) - teamGradeWeight({ level: left }));
  for (const grade of levels) {
    const blueIds = blueMembers.filter((member) => normalizedTeamLevel(member.level) === grade).map((member) => member.id);
    const whiteIds = whiteMembers.filter((member) => normalizedTeamLevel(member.level) === grade).map((member) => member.id);
    if (blueIds.length >= 2 && whiteIds.length >= 2) {
      return { grade, blueIds: [blueIds[0], blueIds[1]], whiteIds: [whiteIds[0], whiteIds[1]] };
    }
  }
  return null;
}

function isFeaturedSameGradeMatch(match: Pick<Match, "sideAPlayerIds" | "sideBPlayerIds">, featuredMatch: FeaturedSameGradeMatch | null) {
  if (!featuredMatch) return false;
  return pairKey(match.sideAPlayerIds) === pairKey(featuredMatch.blueIds)
    && pairKey(match.sideBPlayerIds) === pairKey(featuredMatch.whiteIds);
}

function similarLevelViolationCount(blue: Member[], white: Member[]) {
  const blueWeights = blue.map(teamGradeWeight);
  const whiteWeights = white.map(teamGradeWeight);
  const bluePairGap = Math.abs(blueWeights[0] - blueWeights[1]);
  const whitePairGap = Math.abs(whiteWeights[0] - whiteWeights[1]);
  const strengthGap = Math.abs(blueWeights[0] + blueWeights[1] - whiteWeights[0] - whiteWeights[1]);
  return Number(bluePairGap > 1) + Number(whitePairGap > 1) + Number(strengthGap > 1);
}

function teamBattleBalanceScore(matches: Match[], membersById: Map<string, Member>, matchingMode: TeamBattleMatchMode): TeamBattleBalanceScore {
  const partnerCounts = new Map<string, number>();
  const opponentCounts = new Map<string, number>();
  let similarLevelViolations = 0;
  let severeMatchCount = 0;
  let maximumGap = 0;
  let squaredGapTotal = 0;

  for (const match of matches) {
    if (matchingMode === "similar-level") {
      const blueMembers = match.sideAPlayerIds.map((memberId) => membersById.get(memberId)!).filter(Boolean);
      const whiteMembers = match.sideBPlayerIds.map((memberId) => membersById.get(memberId)!).filter(Boolean);
      if (blueMembers.length === 2 && whiteMembers.length === 2) {
        similarLevelViolations += similarLevelViolationCount(blueMembers, whiteMembers);
      }
    }
    const blueStrength = match.sideAPlayerIds.reduce((sum, memberId) => sum + teamGradeWeight(membersById.get(memberId)!), 0);
    const whiteStrength = match.sideBPlayerIds.reduce((sum, memberId) => sum + teamGradeWeight(membersById.get(memberId)!), 0);
    const gap = Math.abs(blueStrength - whiteStrength);
    if (gap >= 3) severeMatchCount += 1;
    maximumGap = Math.max(maximumGap, gap);
    squaredGapTotal += gap ** 2;

    for (const side of [match.sideAPlayerIds, match.sideBPlayerIds]) {
      if (side.length === 2) partnerCounts.set(pairKey(side), (partnerCounts.get(pairKey(side)) ?? 0) + 1);
    }
    for (const blueId of match.sideAPlayerIds) {
      for (const whiteId of match.sideBPlayerIds) {
        const key = `${blueId}|${whiteId}`;
        opponentCounts.set(key, (opponentCounts.get(key) ?? 0) + 1);
      }
    }
  }

  return {
    similarLevelViolationCount: similarLevelViolations,
    severeMatchCount,
    maximumGap,
    squaredGapTotal,
    partnerRepeatPenalty: repeatedCombinationPenalty(partnerCounts),
    opponentRepeatPenalty: repeatedCombinationPenalty(opponentCounts)
  };
}

function playerAppearsElsewhereInRound(matches: Match[], roundSize: number, matchIndex: number, memberId: string) {
  const roundStart = Math.floor(matchIndex / roundSize) * roundSize;
  const roundEnd = Math.min(matches.length, roundStart + roundSize);
  for (let index = roundStart; index < roundEnd; index += 1) {
    if (index === matchIndex) continue;
    if ([...matches[index].sideAPlayerIds, ...matches[index].sideBPlayerIds].includes(memberId)) return true;
  }
  return false;
}

function optimizeTeamBattleMatchBalance(matches: Match[], members: Member[], roundSize: number, matchingMode: TeamBattleMatchMode, protectedMatchIds = new Set<string>()): Match[] {
  if (matches.length < 2) return matches;
  const membersById = new Map(members.map((member) => [member.id, member]));
  let optimized = matches.map((match) => ({
    ...match,
    sideAPlayerIds: [...match.sideAPlayerIds],
    sideBPlayerIds: [...match.sideBPlayerIds]
  }));
  let currentScore = teamBattleBalanceScore(optimized, membersById, matchingMode);
  const maximumIterations = Math.min(16, Math.max(1, matches.length * 2));

  for (let iteration = 0; iteration < maximumIterations; iteration += 1) {
    let best: { matches: Match[]; score: TeamBattleBalanceScore; key: string } | null = null;
    for (let leftIndex = 0; leftIndex < optimized.length - 1; leftIndex += 1) {
      if (protectedMatchIds.has(optimized[leftIndex].id)) continue;
      for (let rightIndex = leftIndex + 1; rightIndex < optimized.length; rightIndex += 1) {
        if (protectedMatchIds.has(optimized[rightIndex].id)) continue;
        const sameRound = Math.floor(leftIndex / roundSize) === Math.floor(rightIndex / roundSize);
        for (const sideKey of ["sideAPlayerIds", "sideBPlayerIds"] as const) {
          for (let leftSlot = 0; leftSlot < 2; leftSlot += 1) {
            for (let rightSlot = 0; rightSlot < 2; rightSlot += 1) {
              const leftMemberId = optimized[leftIndex][sideKey][leftSlot];
              const rightMemberId = optimized[rightIndex][sideKey][rightSlot];
              if (!leftMemberId || !rightMemberId || leftMemberId === rightMemberId) continue;
              if (!sameRound
                && (playerAppearsElsewhereInRound(optimized, roundSize, leftIndex, rightMemberId)
                  || playerAppearsElsewhereInRound(optimized, roundSize, rightIndex, leftMemberId))) continue;

              const leftSide = [...optimized[leftIndex][sideKey]];
              const rightSide = [...optimized[rightIndex][sideKey]];
              leftSide[leftSlot] = rightMemberId;
              rightSide[rightSlot] = leftMemberId;
              if (new Set(leftSide).size !== leftSide.length || new Set(rightSide).size !== rightSide.length) continue;

              const candidate = [...optimized];
              candidate[leftIndex] = { ...candidate[leftIndex], [sideKey]: leftSide };
              candidate[rightIndex] = { ...candidate[rightIndex], [sideKey]: rightSide };
              const score = teamBattleBalanceScore(candidate, membersById, matchingMode);
              if (compareTeamBattleBalanceScore(score, currentScore) >= 0) continue;
              const key = `${leftIndex}:${rightIndex}:${sideKey}:${leftSlot}:${rightSlot}`;
              if (!best || compareTeamBattleBalanceScore(score, best.score) < 0
                || (compareTeamBattleBalanceScore(score, best.score) === 0 && key < best.key)) {
                best = { matches: candidate, score, key };
              }
            }
          }
        }
      }
    }
    if (!best) break;
    optimized = best.matches;
    currentScore = best.score;
  }

  return optimized;
}

export function calculateTeamBattleSideGamePlan(memberCount: number, totalAppearances: number): TeamBattleSideGamePlan {
  if (memberCount <= 0) return { baseGames: 0, extraGamePlayerCount: 0, totalAppearances: 0 };
  const safeTotal = Math.max(0, totalAppearances);
  return {
    baseGames: Math.floor(safeTotal / memberCount),
    extraGamePlayerCount: safeTotal % memberCount,
    totalAppearances: safeTotal
  };
}

export function getTeamBattleTargetAppearances(roundCount: number, courtCount: number): number {
  return Math.max(0, roundCount) * Math.max(0, courtCount) * 2;
}

export function generateTeamBattleMatches({
  tournamentId,
  groupId,
  blueMembers,
  whiteMembers,
  existingMatches = [],
  targetGamesByMemberId,
  courtNumbers = [],
  roundCount,
  matchingMode = "balanced"
}: {
  tournamentId: string;
  groupId: string;
  blueMembers: Member[];
  whiteMembers: Member[];
  existingMatches?: Match[];
  targetGamesByMemberId?: Record<string, number>;
  courtNumbers?: string[];
  roundCount?: number;
  matchingMode?: TeamBattleMatchMode;
}): Match[] {
  if (blueMembers.length < 2 || whiteMembers.length < 2) throw new Error("청팀과 백팀에 각각 최소 2명이 필요합니다.");

  const activeIds = new Set([...blueMembers, ...whiteMembers].map((member) => member.id));
  const preserved = existingMatches
    .filter((match) => match.status === "completed")
    .sort((left, right) => left.sortOrder - right.sortOrder);
  const appearances = new Map<string, number>([...activeIds].map((id) => [id, 0]));
  const partnerCounts = new Map<string, number>();
  const opponentCounts = new Map<string, number>();

  function register(match: Pick<Match, "sideAPlayerIds" | "sideBPlayerIds">) {
    for (const id of [...match.sideAPlayerIds, ...match.sideBPlayerIds]) {
      if (activeIds.has(id)) appearances.set(id, (appearances.get(id) ?? 0) + 1);
    }
    for (const side of [match.sideAPlayerIds, match.sideBPlayerIds]) {
      if (side.length === 2) partnerCounts.set(pairKey(side), (partnerCounts.get(pairKey(side)) ?? 0) + 1);
    }
    for (const blueId of match.sideAPlayerIds) {
      for (const whiteId of match.sideBPlayerIds) {
        const key = `${blueId}|${whiteId}`;
        opponentCounts.set(key, (opponentCounts.get(key) ?? 0) + 1);
      }
    }
  }
  preserved.forEach(register);

  const bluePairs = pairs(blueMembers);
  const whitePairs = pairs(whiteMembers);
  const generated: Match[] = [];
  const existingMatchIds = new Set(preserved.map((match) => match.id));
  const generationId = Date.now().toString(36);
  const requestedRoundSize = Math.max(1, courtNumbers.length);
  if (requestedRoundSize > Math.floor(blueMembers.length / 2) || requestedRoundSize > Math.floor(whiteMembers.length / 2)) {
    throw new Error("한 라운드에 같은 선수가 중복되지 않으려면 팀별 인원에 맞게 코트 수를 줄여주세요.");
  }
  const legacyTotalAppearances = Math.min(blueMembers.length, whiteMembers.length) * TEAM_BATTLE_MAXIMUM_GAMES;
  const targetMatchCount = roundCount === undefined
    ? legacyTotalAppearances / 2
    : Math.max(1, Math.floor(roundCount)) * requestedRoundSize;
  const totalAppearances = targetMatchCount * 2;
  const defaultTargets = (members: Member[]) => {
    const plan = calculateTeamBattleSideGamePlan(members.length, totalAppearances);
    return Object.fromEntries(members.map((member, index) => [
      member.id,
      plan.baseGames + (index < plan.extraGamePlayerCount ? 1 : 0)
    ]));
  };
  const targets = {
    ...defaultTargets(blueMembers),
    ...defaultTargets(whiteMembers),
    ...targetGamesByMemberId
  };
  const featuredMatch = findFeaturedSameGradeMatch(blueMembers, whiteMembers);
  const featuredAlreadyExists = preserved.some((match) => isFeaturedSameGradeMatch(match, featuredMatch));
  const protectedGeneratedMatchIds = new Set<string>();

  while (preserved.length + generated.length < targetMatchCount) {
    const remainingMatches = targetMatchCount - preserved.length - generated.length;
    const roundSize = Math.min(
      requestedRoundSize,
      Math.floor(blueMembers.length / 2),
      Math.floor(whiteMembers.length / 2),
      remainingMatches
    );
    const usedBlueIds = new Set<string>();
    const usedWhiteIds = new Set<string>();

    for (let courtIndex = 0; courtIndex < roundSize; courtIndex += 1) {
      let best: { blue: [Member, Member]; white: [Member, Member]; score: number; key: string } | null = null;
      const shouldUseFeaturedMatch = featuredMatch
        && !featuredAlreadyExists
        && !generated.some((match) => isFeaturedSameGradeMatch(match, featuredMatch))
        && generated.length === 0
        && courtIndex === 0;
      for (const blue of bluePairs) {
        if (blue.some((member) => usedBlueIds.has(member.id))) continue;
        for (const white of whitePairs) {
          if (white.some((member) => usedWhiteIds.has(member.id))) continue;
          const selected = [...blue, ...white];
          if (selected.some((member) => (appearances.get(member.id) ?? 0) >= (targets[member.id] ?? 0))) continue;
          const candidateMatch = {
            sideAPlayerIds: blue.map((member) => member.id),
            sideBPlayerIds: white.map((member) => member.id)
          };
          const isFeaturedCandidate = isFeaturedSameGradeMatch(candidateMatch, featuredMatch);
          if (shouldUseFeaturedMatch && !isFeaturedCandidate) continue;
          if (!shouldUseFeaturedMatch && isFeaturedCandidate && (featuredAlreadyExists || generated.some((match) => isFeaturedSameGradeMatch(match, featuredMatch)))) continue;
          const unmet = selected.reduce((sum, member) => sum + Math.max(0, (targets[member.id] ?? 0) - (appearances.get(member.id) ?? 0)), 0);
          const currentAppearances = selected.reduce((sum, member) => sum + (appearances.get(member.id) ?? 0), 0);
          const blueStrength = teamGradeWeight(blue[0]) + teamGradeWeight(blue[1]);
          const whiteStrength = teamGradeWeight(white[0]) + teamGradeWeight(white[1]);
          const partnerRepeats = (partnerCounts.get(pairKey(blue.map((member) => member.id))) ?? 0) + (partnerCounts.get(pairKey(white.map((member) => member.id))) ?? 0);
          const opponentRepeats = blue.reduce((sum, blueMember) => sum + white.reduce((inner, whiteMember) => inner + (opponentCounts.get(`${blueMember.id}|${whiteMember.id}`) ?? 0), 0), 0);

          const key = `${blue.map((member) => member.id).join("|")}:${white.map((member) => member.id).join("|")}`;
          const strengthGap = Math.abs(blueStrength - whiteStrength);
          const balancePenalty = (strengthGap >= 3 ? 5000 : 0) + strengthGap ** 2 * 100;
          const score = -unmet * 10000 + currentAppearances * 100 + balancePenalty + partnerRepeats * 5 + opponentRepeats;
          if (!best || score < best.score || (score === best.score && key < best.key)) best = { blue, white, score, key };
        }
      }
      if (!best) {
        if (courtIndex === 0) throw new Error("선택한 경기 수로 대진을 완성할 수 없습니다. 출전 선수 선택을 확인해 주세요.");
        break;
      }
      const order = preserved.length + generated.length + 1;
      let matchId = `${groupId}-team-${order}-${generationId}`;
      while (existingMatchIds.has(matchId)) matchId = `${matchId}-next`;
      existingMatchIds.add(matchId);
      const match: Match = {
        id: matchId,
        tournamentId,
        groupId,
        matchNumber: order,
        sideAPlayerIds: best.blue.map((member) => member.id),
        sideBPlayerIds: best.white.map((member) => member.id),
        sideAScore: null,
        sideBScore: null,
        status: "scheduled",
        sortOrder: order,
        courtNumber: courtNumbers[courtIndex] ?? null
      };
      generated.push(match);
      if (isFeaturedSameGradeMatch(match, featuredMatch)) protectedGeneratedMatchIds.add(match.id);
      best.blue.forEach((member) => usedBlueIds.add(member.id));
      best.white.forEach((member) => usedWhiteIds.add(member.id));
      register(match);
    }
  }
  const balancedGenerated = optimizeTeamBattleMatchBalance(generated, [...blueMembers, ...whiteMembers], requestedRoundSize, matchingMode, protectedGeneratedMatchIds);
  return [...preserved, ...balancedGenerated].map((match, index) => ({ ...match, matchNumber: index + 1, sortOrder: index + 1 }));
}

export function getTeamBattleRoundNumber(matches: Match[], matchId: string): number {
  let roundNumber = 1;
  const usedCourtNumbers = new Set<string>();
  for (const match of [...matches].sort((left, right) => left.sortOrder - right.sortOrder)) {
    if (!match.courtNumber) {
      if (usedCourtNumbers.size > 0) {
        roundNumber += 1;
        usedCourtNumbers.clear();
      }
    } else if (usedCourtNumbers.has(match.courtNumber)) {
      roundNumber += 1;
      usedCourtNumbers.clear();
    }
    if (match.courtNumber) usedCourtNumbers.add(match.courtNumber);
    if (match.id === matchId) return roundNumber;
    if (!match.courtNumber) roundNumber += 1;
  }
  return roundNumber;
}
export function groupTeamBattleMatchesByRound(matches: Match[]): Array<{ roundNumber: number; matches: Match[] }> {
  const rounds = new Map<number, Match[]>();
  let roundNumber = 1;
  const usedCourtNumbers = new Set<string>();
  for (const match of [...matches].sort((left, right) => left.sortOrder - right.sortOrder)) {
    if (!match.courtNumber) {
      if (usedCourtNumbers.size > 0) {
        roundNumber += 1;
        usedCourtNumbers.clear();
      }
    } else if (usedCourtNumbers.has(match.courtNumber)) {
      roundNumber += 1;
      usedCourtNumbers.clear();
    }
    if (match.courtNumber) usedCourtNumbers.add(match.courtNumber);
    rounds.set(roundNumber, [...(rounds.get(roundNumber) ?? []), match]);
    if (!match.courtNumber) roundNumber += 1;
  }
  return [...rounds.entries()].map(([round, roundMatches]) => ({ roundNumber: round, matches: roundMatches }));
}
export function calculateTeamBattleResult(matches: Match[]): TeamBattleResult {
  return matches.reduce<TeamBattleResult>((result, match) => {
    if (match.status !== "completed" || match.sideAScore === null || match.sideBScore === null) return result;
    result.completedMatches += 1;
    if (match.sideAScore > match.sideBScore) result.blueWins += 1;
    else if (match.sideBScore > match.sideAScore) result.whiteWins += 1;
    else result.draws += 1;
    return result;
  }, { blueWins: 0, whiteWins: 0, draws: 0, completedMatches: 0 });
}