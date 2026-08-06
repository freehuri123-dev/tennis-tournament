import type { Match, Member, TournamentGroup } from "./types";

type GenerateInitialMatchesInput = {
  tournamentId: string;
  groupId: string;
  format: TournamentGroup["scheduleFormat"];
  participants: Member[];
  seedPlayerIds?: string[];
  courtNumbers?: string[];
  courtStartIndex?: number;
  randomGamesPerPlayer?: number;
};

type ScheduleFormat = TournamentGroup["scheduleFormat"];

const FORMAT_LABELS: Record<ScheduleFormat, string> = {
  "kdk-v2010": "KDK-V2010",
  "hanul-aa": "한울AA방식 KDK",
  random: "랜덤 KDK 방식",
  "fixed-pair-league": "고정 페어 리그",
  "fixed-pair-tournament": "복식 토너먼트",
  "single-tournament": "단식 토너먼트",
  "team-battle": "청백전 단체전"
};

const MIN_MAX: Record<ScheduleFormat, { min: number; max: number }> = {
  "kdk-v2010": { min: 5, max: 10 },
  "hanul-aa": { min: 5, max: 16 },
  random: { min: 4, max: Number.POSITIVE_INFINITY },
  "fixed-pair-league": { min: 8, max: 12 },
  "fixed-pair-tournament": { min: 4, max: Number.POSITIVE_INFINITY },
  "single-tournament": { min: 2, max: Number.POSITIVE_INFINITY },
  "team-battle": { min: 4, max: Number.POSITIVE_INFINITY }
};

const KDK_TEMPLATES: Record<number, string[]> = {
  5: ["14:23", "12:35", "15:24", "13:45", "25:34"],
  6: ["13:25", "26:45", "16:35", "23:46", "15:24", "14:36"],
  7: ["17:26", "25:36", "14:56", "27:45", "15:37", "34:67", "13:24"],
  8: ["18:27", "36:45", "16:25", "38:47", "17:46", "28:35", "26:37", "15:48"],
  9: ["18:27", "36:45", "16:79", "25:34", "58:69", "14:23", "57:68", "19:38", "29:47"],
  10: ["1A:29", "37:48", "19:56", "2A:38", "39:57", "28:46", "16:3A", "17:45", "26:58", "79:4A"]
};

const HANUL_TEMPLATES: Record<number, string[]> = {
  5: ["12:34", "13:25", "14:35", "15:24", "23:45"],
  6: ["12:34", "15:46", "23:56", "14:25", "24:36", "16:35"],
  7: ["12:34", "56:17", "35:24", "14:67", "23:57", "16:25", "46:37"],
  8: ["12:34", "56:78", "13:57", "24:68", "37:48", "15:26", "16:38", "25:47"],
  9: ["12:34", "56:78", "19:57", "23:68", "49:38", "15:26", "17:89", "36:45", "24:79"],
  10: ["12:34", "56:78", "23:6A", "19:58", "3A:45", "27:89", "4A:68", "13:79", "46:59", "17:2A"],
  11: ["12:34", "56:78", "1B:9A", "23:68", "4A:57", "26:9B", "13:5B", "49:8A", "17:28", "5A:6B", "39:47"],
  12: ["12:34", "56:78", "9A:BC", "37:48", "29:5A", "1B:6C", "13:57", "24:9B", "68:AC", "17:2B", "35:6A", "49:8C"],
  13: ["12:34", "56:78", "9A:BC", "1D:25", "37:4A", "68:9B", "CD:13", "26:5A", "47:8B", "9C:2D", "15:AB", "3C:67", "48:9D"],
  14: ["12:34", "56:78", "9A:BC", "DE:13", "24:57", "68:9B", "26:CD", "79:AE", "14:8B", "5E:6A", "3C:7B", "2D:89", "3E:45", "AC:1D"],
  15: ["12:34", "56:78", "9A:BC", "DE:1F", "23:57", "46:AB", "8D:9E", "4F:5C", "13:6B", "27:8A", "9C:5E", "36:DF", "1B:8C", "47:EF", "2A:9D"],
  16: ["12:34", "56:78", "9A:BC", "DE:FG", "13:57", "24:68", "9B:DF", "AC:EG", "15:9D", "37:BF", "26:AE", "48:CG", "19:2A", "5D:6E", "3B:4C", "7F:8G"]
};

const HANUL_SEED_SLOTS: Record<number, string[]> = {
  5: [],
  6: ["1", "3"],
  7: ["1", "5"],
  8: ["1", "7"],
  9: ["1", "4", "8"],
  10: ["1", "8", "A"],
  11: ["1", "5", "8", "9"],
  12: ["2", "3", "8", "A"],
  13: ["1", "4", "6", "B"],
  14: ["2", "5", "8", "C"],
  15: ["1", "4", "5", "A", "D"],
  16: ["1", "6", "B", "G", "7", "A"]
};

export function getScheduleRequirement(format: ScheduleFormat) {
  return { ...MIN_MAX[format], label: FORMAT_LABELS[format] };
}

export function validateScheduleParticipants(format: ScheduleFormat, count: number) {
  const requirement = getScheduleRequirement(format);
  if (format === "fixed-pair-league") {
    return [8, 10, 12].includes(count) ? "" : `${requirement.label} 방식은 8명, 10명, 12명일 때 대진표를 생성할 수 있습니다.`;
  }
  if (format === "fixed-pair-tournament") {
    if (count < requirement.min) return `${requirement.label} 방식은 ${requirement.min}명 이상일 때 대진표를 생성할 수 있습니다.`;
    return count % 2 === 1 ? `${requirement.label} 방식은 2명씩 페어를 만들어야 하므로 참가자 수가 짝수여야 합니다.` : "";
  }
  if (format === "single-tournament") {
    return count < requirement.min ? `${requirement.label} 방식은 ${requirement.min}명 이상일 때 대진표를 생성할 수 있습니다.` : "";
  }
  if (format === "team-battle") {
    return count < requirement.min ? "청백전은 청팀과 백팀에 각각 2명 이상 필요합니다." : "";
  }
  if (format === "random") {
    return count < requirement.min ? `${requirement.label} 방식은 ${requirement.min}명 이상일 때 대진표를 생성할 수 있습니다.` : "";
  }
  if (count < requirement.min || count > requirement.max) {
    return `${requirement.label} 방식은 ${requirement.min}~${requirement.max}명일 때 대진표를 생성할 수 있습니다.`;
  }
  return "";
}

export function getHanulSeedCount(participantCount: number) {
  return getHanulSeedSlots(participantCount).length;
}

export function getHanulSeedSlots(participantCount: number) {
  return [...(HANUL_SEED_SLOTS[participantCount] ?? [])];
}

export function getScheduleFormatLabel(format: ScheduleFormat) {
  return FORMAT_LABELS[format];
}

export function generateInitialMatches(input: GenerateInitialMatchesInput): Match[] {
  const participantCount = input.participants.length;
  const validationMessage = validateScheduleParticipants(input.format, participantCount);
  if (validationMessage) return [];
  if (input.format === "team-battle") return [];
  if (input.format === "random") return assignCourtNumbers(generateRandomMatches(input), input.courtNumbers, input.courtStartIndex);
  if (input.format === "fixed-pair-league") return assignCourtNumbers(generateFixedPairLeagueMatches(input), input.courtNumbers, input.courtStartIndex);
  if (input.format === "fixed-pair-tournament") return assignCourtNumbers(generateTournamentMatches(input, 2), input.courtNumbers, input.courtStartIndex);
  if (input.format === "single-tournament") return assignCourtNumbers(generateTournamentMatches(input, 1), input.courtNumbers, input.courtStartIndex);

  const playerMap = createDefaultSeedMap(input.participants);
  const templates = input.format === "kdk-v2010" ? KDK_TEMPLATES[participantCount] : HANUL_TEMPLATES[participantCount];

  return assignCourtNumbers(templates.map((template, index) => {
    const [sideA, sideB] = template.split(":");
    return {
      id: `${input.groupId}-match-${index + 1}`,
      tournamentId: input.tournamentId,
      groupId: input.groupId,
      matchNumber: index + 1,
      sideAPlayerIds: sideA.split("").map((slot) => playerMap[slot]).filter(Boolean),
      sideBPlayerIds: sideB.split("").map((slot) => playerMap[slot]).filter(Boolean),
      sideAScore: null,
      sideBScore: null,
      status: "scheduled",
      sortOrder: index + 1,
      courtNumber: null
    };
  }), input.courtNumbers, input.courtStartIndex);
}

function generateFixedPairLeagueMatches(input: GenerateInitialMatchesInput): Match[] {
  const teams = createTournamentTeams(input.participants, 2);
  const rotation: Array<string[] | null> = [...teams, null];
  const matches: Match[] = [];

  for (let round = 0; round < rotation.length - 1; round += 1) {
    for (let index = 0; index < rotation.length / 2; index += 1) {
      const sideA = rotation[index];
      const sideB = rotation[rotation.length - 1 - index];
      if (!sideA || !sideB) continue;
      matches.push(createMatch(input, matches.length + 1, sideA, sideB));
    }
    rotation.splice(1, 0, rotation.pop() ?? null);
  }

  return matches;
}

function generateRandomMatches(input: GenerateInitialMatchesInput): Match[] {
  const gamesPerPlayer = Math.max(1, Math.min(8, Math.floor(input.randomGamesPerPlayer ?? 4)));
  const shuffledParticipants = shuffle([...input.participants]);
  const targetAppearances = new Map(shuffledParticipants.map((member) => [member.id, gamesPerPlayer]));
  const totalTargetAppearances = input.participants.length * gamesPerPlayer;
  const roundedTargetAppearances = Math.ceil(totalTargetAppearances / 4) * 4;
  for (const member of shuffledParticipants.slice(0, roundedTargetAppearances - totalTargetAppearances)) {
    targetAppearances.set(member.id, (targetAppearances.get(member.id) ?? gamesPerPlayer) + 1);
  }

  const playCounts = new Map(input.participants.map((member) => [member.id, 0]));
  const partnerCounts = new Map<string, number>();
  const opponentCounts = new Map<string, number>();
  const matches: Match[] = [];
  const targetMatchCount = roundedTargetAppearances / 4;

  while (matches.length < targetMatchCount) {
    const preferredCandidates = shuffle([...input.participants])
      .filter((member) => (playCounts.get(member.id) ?? 0) < (targetAppearances.get(member.id) ?? gamesPerPlayer))
      .sort((left, right) => (playCounts.get(left.id) ?? 0) - (playCounts.get(right.id) ?? 0));
    const fillerCandidates = shuffle([...input.participants])
      .filter((member) => !preferredCandidates.some((candidate) => candidate.id === member.id))
      .sort((left, right) => (playCounts.get(left.id) ?? 0) - (playCounts.get(right.id) ?? 0));
    const candidatePool = [...preferredCandidates, ...fillerCandidates]
      .slice(0, Math.min(12, input.participants.length));
    const match = chooseBalancedRandomMatch(candidatePool, playCounts, partnerCounts, opponentCounts);
    if (!match) break;

    for (const playerId of [...match.sideAPlayerIds, ...match.sideBPlayerIds]) {
      playCounts.set(playerId, (playCounts.get(playerId) ?? 0) + 1);
    }
    bumpPairCount(partnerCounts, match.sideAPlayerIds[0], match.sideAPlayerIds[1]);
    bumpPairCount(partnerCounts, match.sideBPlayerIds[0], match.sideBPlayerIds[1]);
    for (const left of match.sideAPlayerIds) {
      for (const right of match.sideBPlayerIds) bumpPairCount(opponentCounts, left, right);
    }

    matches.push({
      id: `${input.groupId}-match-${matches.length + 1}`,
      tournamentId: input.tournamentId,
      groupId: input.groupId,
      matchNumber: matches.length + 1,
      sideAPlayerIds: match.sideAPlayerIds,
      sideBPlayerIds: match.sideBPlayerIds,
      sideAScore: null,
      sideBScore: null,
      status: "scheduled",
      sortOrder: matches.length + 1,
      courtNumber: null
    });
  }

  return matches;
}

function chooseBalancedRandomMatch(
  candidates: Member[],
  playCounts: Map<string, number>,
  partnerCounts: Map<string, number>,
  opponentCounts: Map<string, number>
): { sideAPlayerIds: string[]; sideBPlayerIds: string[] } | null {
  let best: { sideAPlayerIds: string[]; sideBPlayerIds: string[]; score: number } | null = null;
  for (const group of combinations(candidates, 4)) {
    const ids = group.map((member) => member.id);
    const pairings = [
      [[ids[0], ids[1]], [ids[2], ids[3]]],
      [[ids[0], ids[2]], [ids[1], ids[3]]],
      [[ids[0], ids[3]], [ids[1], ids[2]]]
    ];
    for (const [sideAPlayerIds, sideBPlayerIds] of pairings) {
      const score = randomMatchScore(group, sideAPlayerIds, sideBPlayerIds, playCounts, partnerCounts, opponentCounts);
      if (!best || score < best.score) best = { sideAPlayerIds, sideBPlayerIds, score };
    }
  }
  return best ? { sideAPlayerIds: best.sideAPlayerIds, sideBPlayerIds: best.sideBPlayerIds } : null;
}

function randomMatchScore(
  members: Member[],
  sideAPlayerIds: string[],
  sideBPlayerIds: string[],
  playCounts: Map<string, number>,
  partnerCounts: Map<string, number>,
  opponentCounts: Map<string, number>
) {
  const memberById = new Map(members.map((member) => [member.id, member]));
  const sideAStrength = sideAPlayerIds.reduce((sum, id) => sum + memberStrength(memberById.get(id)), 0);
  const sideBStrength = sideBPlayerIds.reduce((sum, id) => sum + memberStrength(memberById.get(id)), 0);
  const partnerRepeat = pairCount(partnerCounts, sideAPlayerIds[0], sideAPlayerIds[1]) + pairCount(partnerCounts, sideBPlayerIds[0], sideBPlayerIds[1]);
  const opponentRepeat = sideAPlayerIds.reduce((sum, left) => sum + sideBPlayerIds.reduce((inner, right) => inner + pairCount(opponentCounts, left, right), 0), 0);
  const countSpread = Math.max(...members.map((member) => playCounts.get(member.id) ?? 0)) - Math.min(...members.map((member) => playCounts.get(member.id) ?? 0));
  const totalPlayCount = members.reduce((sum, member) => sum + (playCounts.get(member.id) ?? 0), 0);
  return totalPlayCount * 160 + partnerRepeat * 80 + opponentRepeat * 18 + Math.abs(sideAStrength - sideBStrength) * 12 + countSpread * 5 + Math.random();
}

function memberStrength(member?: Member) {
  const level = member?.level?.trim().toUpperCase() ?? "";
  if (level.startsWith("A")) return 4;
  if (level.startsWith("C")) return 2;
  if (level.startsWith("D")) return 1;
  return 3;
}

function pairKey(left: string, right: string) {
  return [left, right].sort().join("|");
}

function pairCount(counts: Map<string, number>, left: string, right: string) {
  return counts.get(pairKey(left, right)) ?? 0;
}

function bumpPairCount(counts: Map<string, number>, left: string, right: string) {
  const key = pairKey(left, right);
  counts.set(key, (counts.get(key) ?? 0) + 1);
}

function combinations<T>(items: T[], size: number): T[][] {
  if (size === 0) return [[]];
  if (items.length < size) return [];
  const result: T[][] = [];
  for (let index = 0; index <= items.length - size; index += 1) {
    for (const rest of combinations(items.slice(index + 1), size - 1)) result.push([items[index], ...rest]);
  }
  return result;
}

function generateTournamentMatches(input: GenerateInitialMatchesInput, teamSize: 1 | 2): Match[] {
  const teams = createTournamentTeams(input.participants, teamSize);
  const matches: Match[] = [];
  let roundTeamCount = teams.length;

  for (let index = 0; index < teams.length; index += 2) {
    matches.push(createMatch(input, matches.length + 1, teams[index] ?? [], teams[index + 1] ?? []));
  }

  roundTeamCount = Math.ceil(roundTeamCount / 2);
  while (roundTeamCount > 1) {
    const roundMatchCount = Math.ceil(roundTeamCount / 2);
    for (let index = 0; index < roundMatchCount; index += 1) {
      matches.push(createMatch(input, matches.length + 1, [], []));
    }
    roundTeamCount = roundMatchCount;
  }

  return applyTournamentAdvancement(matches, input.groupId);
}

function createMatch(input: GenerateInitialMatchesInput, sortOrder: number, sideAPlayerIds: string[], sideBPlayerIds: string[]): Match {
  return {
    id: `${input.groupId}-match-${sortOrder}`,
    tournamentId: input.tournamentId,
    groupId: input.groupId,
    matchNumber: sortOrder,
    sideAPlayerIds,
    sideBPlayerIds,
    sideAScore: null,
    sideBScore: null,
    status: "scheduled",
    sortOrder,
    courtNumber: null
  };
}

export function assignCourtNumbers(matches: Match[], courtNumbers?: string[], startIndex = 0): Match[] {
  const normalizedCourtNumbers = (courtNumbers ?? []).map((court) => court.trim()).filter(Boolean);
  if (normalizedCourtNumbers.length === 0) {
    return matches.map((match) => ({ ...match, courtNumber: match.courtNumber ?? null }));
  }

  return matches.map((match, index) => ({
    ...match,
    courtNumber: normalizedCourtNumbers[(startIndex + index) % normalizedCourtNumbers.length]
  }));
}

function createTournamentTeams(participants: Member[], teamSize: 1 | 2) {
  const teams: string[][] = [];
  for (let index = 0; index < participants.length; index += teamSize) {
    teams.push(participants.slice(index, index + teamSize).map((member) => member.id));
  }
  return teams;
}

export function getFixedPairTournamentRoundCounts(totalMatches: number) {
  for (let firstRoundCount = 1; firstRoundCount <= totalMatches; firstRoundCount += 1) {
    const counts = createSequentialRoundCounts(firstRoundCount);
    if (counts.reduce((total, count) => total + count, 0) === totalMatches) return counts;
  }
  return [];
}

function createSequentialRoundCounts(firstRoundCount: number) {
  const counts: number[] = [];
  let roundCount = firstRoundCount;
  while (roundCount >= 1) {
    counts.push(roundCount);
    if (roundCount === 1) break;
    roundCount = Math.ceil(roundCount / 2);
  }
  return counts;
}

export function getTournamentRoundLabel(roundIndex: number, roundCounts: number[]) {
  if (roundIndex === roundCounts.length - 1) return "결승";
  if (roundIndex === roundCounts.length - 2) return "준결승";
  const firstRoundTeams = nextPowerOfTwo(roundCounts[0] * 2 - 1);
  return `${Math.max(2, firstRoundTeams / 2 ** roundIndex)}강`;
}

export function getFixedPairTournamentRoundLabel(roundIndex: number, roundCount: number) {
  return getTournamentRoundLabel(roundIndex, createSequentialRoundCounts(Math.ceil(2 ** roundCount / 2)));
}

export type TournamentByeSelectionOption = {
  roundIndex: number;
  byeMatchId: string;
  playMatchId: string;
  selectedSourceMatchId: string | null;
  options: Array<{
    sourceMatchId: string;
    teamIds: string[];
  }>;
};

export function getTournamentByeSelectionOptions(matches: Match[], groupId: string): TournamentByeSelectionOption[] {
  const groupMatches = matches.filter((match) => match.groupId === groupId).sort((a, b) => a.sortOrder - b.sortOrder);
  const roundCounts = getFixedPairTournamentRoundCounts(groupMatches.length);
  const options: TournamentByeSelectionOption[] = [];
  const updated = new Map(matches.map((match) => [match.id, { ...match }]));

  for (let roundIndex = 0; roundIndex < roundCounts.length - 1; roundIndex += 1) {
    const block = getManualByeBlock(roundCounts, roundIndex, groupMatches);
    if (block) {
      const choiceOptions = getByeEligibleSourceMatches(block, updated).map(({ match, winner }) => ({
        sourceMatchId: match.id,
        teamIds: winner
      }));
      const byeTarget = updated.get(block.byeMatch.id);
      const selectedSourceMatchId = choiceOptions.find((option) => sameIds(option.teamIds, byeTarget?.sideAPlayerIds ?? []))?.sourceMatchId ?? null;

      if (choiceOptions.length >= 2 && choiceOptions.every((option) => option.teamIds.length > 0)) {
        options.push({
          roundIndex,
          byeMatchId: block.byeMatch.id,
          playMatchId: block.playMatch.id,
          selectedSourceMatchId,
          options: choiceOptions
        });
      }
    }
  }

  return options;
}

export function selectTournamentBye(matches: Match[], groupId: string, roundIndex: number, sourceMatchId: string) {
  const groupMatches = matches.filter((match) => match.groupId === groupId).sort((a, b) => a.sortOrder - b.sortOrder);
  const roundCounts = getFixedPairTournamentRoundCounts(groupMatches.length);
  const updated = new Map(matches.map((match) => [match.id, { ...match }]));
  const block = getManualByeBlock(roundCounts, roundIndex, groupMatches);
  if (!block) return matches;

  const selected = getByeEligibleSourceMatches(block, updated).find(({ match }) => match.id === sourceMatchId);
  if (!selected || selected.winner.length === 0) return matches;

  setMatchSide(updated, block.byeMatch.id, "A", selected.winner);

  return applyTournamentAdvancement(matches.map((match) => updated.get(match.id) ?? match), groupId);
}

export function applyTournamentAdvancement(matches: Match[], groupId: string) {
  const groupMatches = matches.filter((match) => match.groupId === groupId).sort((a, b) => a.sortOrder - b.sortOrder);
  const roundCounts = getFixedPairTournamentRoundCounts(groupMatches.length);
  if (roundCounts.length === 0) return matches;

  const updated = new Map(matches.map((match) => [match.id, { ...match }]));
  const assignedSlots = new Set<string>();
  const selectedByeMatchIds = new Set<string>();
  let previousStart = 0;

  for (let roundIndex = 0; roundIndex < roundCounts.length - 1; roundIndex += 1) {
    const currentCount = roundCounts[roundIndex];
    const nextStart = previousStart + currentCount;
    const manualByeBlock = getManualByeBlock(roundCounts, roundIndex, groupMatches);

    for (let matchIndex = 0; matchIndex < currentCount; matchIndex += 1) {
      const source = updated.get(groupMatches[previousStart + matchIndex].id);
      if (manualByeBlock && matchIndex >= manualByeBlock.blockStart) {
        continue;
      }

      const nextSlot = getTournamentNextSlot(roundCounts, roundIndex, matchIndex, groupMatches, updated);
      const target = updated.get(groupMatches[nextStart + nextSlot.matchIndex].id);
      if (!source || !target) continue;

      const sourceAssignedThisRun = assignedSlots.has(`${source.id}:A`) || assignedSlots.has(`${source.id}:B`);
      const allowByeWinner = canUseByeWinner(roundCounts, roundIndex, matchIndex) && (
        selectedByeMatchIds.has(source.id) || !(roundCounts.length > 3 && hasOneSideOnly(source) && sourceAssignedThisRun)
      );
      const winner = getMatchWinnerPlayerIds(source, allowByeWinner);
      const key = nextSlot.side === "A" ? "sideAPlayerIds" : "sideBPlayerIds";
      assignMatchSide(updated, assignedSlots, target.id, key === "sideAPlayerIds" ? "A" : "B", winner);
    }

    if (manualByeBlock) applyManualByeBlock(manualByeBlock, roundCounts, groupMatches, updated, assignedSlots, selectedByeMatchIds);

    previousStart = nextStart;
  }

  clearUnassignedFutureSlots(groupMatches, roundCounts[0] ?? 0, updated, assignedSlots);

  return matches.map((match) => updated.get(match.id) ?? match);
}

export const applyFixedPairTournamentAdvancement = applyTournamentAdvancement;

function nextPowerOfTwo(value: number) {
  let size = 1;
  while (size < value) size *= 2;
  return size;
}

function getMatchWinnerPlayerIds(match: Match, allowBye: boolean) {
  const hasA = match.sideAPlayerIds.length > 0;
  const hasB = match.sideBPlayerIds.length > 0;
  if (allowBye && hasA && !hasB) return match.sideAPlayerIds;
  if (allowBye && !hasA && hasB) return match.sideBPlayerIds;
  if (!hasA || !hasB || match.sideAScore === null || match.sideBScore === null || match.sideAScore === match.sideBScore) return [];
  return match.sideAScore > match.sideBScore ? match.sideAPlayerIds : match.sideBPlayerIds;
}

function getTournamentNextSlot(
  roundCounts: number[],
  roundIndex: number,
  matchIndex: number,
  groupMatches: Match[],
  updated: Map<string, Match>
) {
  void roundCounts;
  void roundIndex;
  void groupMatches;
  void updated;

  return { matchIndex: Math.floor(matchIndex / 2), side: matchIndex % 2 === 0 ? "A" : "B" } as const;
}

function getManualByeBlock(roundCounts: number[], roundIndex: number, groupMatches: Match[]) {
  const currentCount = roundCounts[roundIndex];
  if (currentCount < 3 || currentCount % 2 === 0) return null;
  const roundStart = roundCounts.slice(0, roundIndex).reduce((total, count) => total + count, 0);
  const nextStart = roundStart + currentCount;
  const blockStart = currentCount - 3;
  const byeMatchIndex = Math.floor(blockStart / 2);
  return {
    roundIndex,
    blockStart,
    sourceMatches: [groupMatches[roundStart + blockStart], groupMatches[roundStart + blockStart + 1], groupMatches[roundStart + blockStart + 2]],
    byeMatch: groupMatches[nextStart + byeMatchIndex],
    playMatch: groupMatches[nextStart + byeMatchIndex + 1]
  };
}

function canUseByeWinner(roundCounts: number[], roundIndex: number, matchIndex: number) {
  if (roundIndex === 0) return true;
  return hasEmptyIncomingSlot(roundCounts, roundIndex, matchIndex);
}

function hasEmptyIncomingSlot(roundCounts: number[], roundIndex: number, matchIndex: number) {
  const previousRoundIndex = roundIndex - 1;
  if (previousRoundIndex < 0) return false;
  const sourceCount = roundCounts[previousRoundIndex];
  const filledSides = new Set<"A" | "B">();

  for (let sourceIndex = 0; sourceIndex < sourceCount; sourceIndex += 1) {
    const slot = getTournamentNextSlotFromCounts(roundCounts, previousRoundIndex, sourceIndex);
    if (slot.matchIndex === matchIndex) filledSides.add(slot.side);
  }

  return filledSides.size === 1;
}

function getTournamentNextSlotFromCounts(roundCounts: number[], roundIndex: number, matchIndex: number) {
  const currentCount = roundCounts[roundIndex];
  const shifted = currentCount >= 3 && currentCount % 2 === 1;
  if (shifted) {
    const lastThreeStart = currentCount - 3;
    if (matchIndex < lastThreeStart) {
      return { matchIndex: Math.floor(matchIndex / 2), side: matchIndex % 2 === 0 ? "A" : "B" } as const;
    }
    if (matchIndex === lastThreeStart) return { matchIndex: Math.floor(lastThreeStart / 2), side: "A" } as const;
    return { matchIndex: Math.floor(lastThreeStart / 2) + 1, side: matchIndex === lastThreeStart + 1 ? "A" : "B" } as const;
  }
  return { matchIndex: Math.floor(matchIndex / 2), side: matchIndex % 2 === 0 ? "A" : "B" } as const;
}

function hasOneSideOnly(match: Match) {
  return (match.sideAPlayerIds.length > 0 && match.sideBPlayerIds.length === 0) || (match.sideAPlayerIds.length === 0 && match.sideBPlayerIds.length > 0);
}

function getByeEligibleSourceMatches(block: NonNullable<ReturnType<typeof getManualByeBlock>>, updated: Map<string, Match>) {
  const sourceInfos = block.sourceMatches.map((match) => {
    const source = updated.get(match.id) ?? match;
    return {
      match,
      source,
      winner: getMatchWinnerPlayerIds(source, hasOneSideOnly(source))
    };
  });
  const oneSidedSources = sourceInfos.filter(({ source }) => hasOneSideOnly(source));
  return oneSidedSources.length > 0 ? sourceInfos.filter(({ source }) => !hasOneSideOnly(source)) : sourceInfos;
}

function applyManualByeBlock(
  block: NonNullable<ReturnType<typeof getManualByeBlock>>,
  roundCounts: number[],
  groupMatches: Match[],
  updated: Map<string, Match>,
  assignedSlots: Set<string>,
  selectedByeMatchIds: Set<string>
) {
  const sourceInfos = block.sourceMatches.map((match) => {
    const source = updated.get(match.id) ?? match;
    return {
      match,
      source,
      winner: getMatchWinnerPlayerIds(source, hasOneSideOnly(source))
    };
  });
  const eligibleSources = getByeEligibleSourceMatches(block, updated);
  const byeTarget = updated.get(block.byeMatch.id);
  const selected = byeTarget && byeTarget.sideAPlayerIds.length > 0
    ? eligibleSources.find(({ winner }) => winner.length > 0 && sameIds(winner, byeTarget.sideAPlayerIds))
    : undefined;

  assignMatchSide(updated, assignedSlots, block.byeMatch.id, "B", []);

  if (!selected) {
    assignMatchSide(updated, assignedSlots, block.byeMatch.id, "A", []);
    const oneSided = sourceInfos.find(({ source }) => hasOneSideOnly(source));
    const selectedManualBye = oneSided && isSelectedManualByeSource(block, oneSided.match, roundCounts, groupMatches);
    if (selectedManualBye) {
      assignMatchSide(updated, assignedSlots, block.byeMatch.id, "A", oneSided.winner);
      assignMatchSide(updated, assignedSlots, block.playMatch.id, "A", []);
      assignMatchSide(updated, assignedSlots, block.playMatch.id, "B", []);
      return;
    }
    assignMatchSide(updated, assignedSlots, block.playMatch.id, "A", []);
    assignMatchSide(updated, assignedSlots, block.playMatch.id, "B", block.roundIndex === 0 ? oneSided?.winner ?? [] : []);
    return;
  }

  const remaining = sourceInfos.filter(({ match }) => match.id !== selected.match.id);
  selectedByeMatchIds.add(block.byeMatch.id);
  assignMatchSide(updated, assignedSlots, block.byeMatch.id, "A", selected.winner);
  assignMatchSide(updated, assignedSlots, block.playMatch.id, "A", remaining[0]?.winner ?? []);
  assignMatchSide(updated, assignedSlots, block.playMatch.id, "B", remaining[1]?.winner ?? []);
}

function isSelectedManualByeSource(
  block: NonNullable<ReturnType<typeof getManualByeBlock>>,
  sourceMatch: Match,
  roundCounts: number[],
  groupMatches: Match[]
) {
  if (block.roundIndex === 0) return false;
  const previousBlock = getManualByeBlock(roundCounts, block.roundIndex - 1, groupMatches);
  return previousBlock?.byeMatch.id === sourceMatch.id;
}

function setMatchSide(updated: Map<string, Match>, matchId: string, side: "A" | "B", playerIds: string[]) {
  const target = updated.get(matchId);
  if (!target) return;
  const key = side === "A" ? "sideAPlayerIds" : "sideBPlayerIds";
  if (sameIds(target[key], playerIds)) return;
  updated.set(matchId, {
    ...target,
    [key]: playerIds,
    sideAScore: null,
    sideBScore: null,
    status: "scheduled"
  });
}

function assignMatchSide(updated: Map<string, Match>, assignedSlots: Set<string>, matchId: string, side: "A" | "B", playerIds: string[]) {
  assignedSlots.add(`${matchId}:${side}`);
  setMatchSide(updated, matchId, side, playerIds);
}

function clearUnassignedFutureSlots(groupMatches: Match[], firstRoundCount: number, updated: Map<string, Match>, assignedSlots: Set<string>) {
  for (const match of groupMatches.slice(firstRoundCount)) {
    if (!assignedSlots.has(`${match.id}:A`)) setMatchSide(updated, match.id, "A", []);
    if (!assignedSlots.has(`${match.id}:B`)) setMatchSide(updated, match.id, "B", []);
  }
}

function sameIds(left: string[], right: string[]) {
  return left.length === right.length && left.every((id, index) => id === right[index]);
}

function shuffle<T>(items: T[]) {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [next[index], next[target]] = [next[target], next[index]];
  }
  return next;
}

function createDefaultSeedMap(participants: Member[]) {
  return participants.reduce<Record<string, string>>((map, member, index) => {
    map[indexToSlot(index)] = member.id;
    return map;
  }, {});
}

function indexToSlot(index: number) {
  if (index < 9) return String(index + 1);
  return String.fromCharCode(65 + index - 9);
}
