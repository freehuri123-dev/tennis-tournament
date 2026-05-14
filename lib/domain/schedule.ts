import type { Match, Member, TournamentGroup } from "./types";

type GenerateInitialMatchesInput = {
  tournamentId: string;
  groupId: string;
  format: TournamentGroup["scheduleFormat"];
  participants: Member[];
};

const MIN_MAX: Record<TournamentGroup["scheduleFormat"], { min: number; max: number; label: string }> = {
  "kdk-v2010": { min: 5, max: 10, label: "KDK-V2010" },
  "hanul-aa": { min: 5, max: 16, label: "한울AA" }
};

export function getScheduleRequirement(format: TournamentGroup["scheduleFormat"]) {
  return MIN_MAX[format];
}

export function validateScheduleParticipants(format: TournamentGroup["scheduleFormat"], count: number) {
  const requirement = getScheduleRequirement(format);
  if (count < requirement.min || count > requirement.max) {
    return `${requirement.label} 방식은 ${requirement.min}~${requirement.max}명일 때 대진표를 생성할 수 있습니다.`;
  }
  return "";
}

export function generateInitialMatches(input: GenerateInitialMatchesInput): Match[] {
  const participantIds = input.participants.map((participant) => participant.id);
  const validationMessage = validateScheduleParticipants(input.format, participantIds.length);
  if (validationMessage) return [];

  const matchCount = input.format === "kdk-v2010" ? participantIds.length : Math.max(participantIds.length, 6);
  const matches: Match[] = [];

  for (let index = 0; index < matchCount; index += 1) {
    const ids = pickFourUnique(participantIds, index);
    if (ids.length !== 4) continue;

    matches.push({
      id: `${input.groupId}-match-${index + 1}`,
      tournamentId: input.tournamentId,
      groupId: input.groupId,
      matchNumber: index + 1,
      sideAPlayerIds: [ids[0], ids[1]],
      sideBPlayerIds: [ids[2], ids[3]],
      sideAScore: null,
      sideBScore: null,
      status: "scheduled",
      sortOrder: index + 1
    });
  }

  return matches;
}

function pickFourUnique(participantIds: string[], roundIndex: number) {
  const offsets = [0, 2, 1, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  const picked: string[] = [];

  for (const offset of offsets) {
    const id = participantIds[(roundIndex + offset) % participantIds.length];
    if (!picked.includes(id)) picked.push(id);
    if (picked.length === 4) break;
  }

  return picked;
}

export function getHanulSeedCount(participantCount: number) {
  if (participantCount < 5) return 0;
  if (participantCount <= 5) return 1;
  if (participantCount <= 8) return 2;
  if (participantCount <= 12) return 3;
  return 4;
}
