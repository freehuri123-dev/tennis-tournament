import type { Match, Member, TournamentGroup } from "./types";

type GenerateInitialMatchesInput = {
  tournamentId: string;
  groupId: string;
  format: TournamentGroup["scheduleFormat"];
  participants: Member[];
  seedPlayerIds?: string[];
};

type ScheduleFormat = TournamentGroup["scheduleFormat"];

const FORMAT_LABELS: Record<ScheduleFormat, string> = {
  "kdk-v2010": "KDK-V2010",
  "hanul-aa": "한울AA방식 KDK"
};

const MIN_MAX: Record<ScheduleFormat, { min: number; max: number }> = {
  "kdk-v2010": { min: 5, max: 10 },
  "hanul-aa": { min: 5, max: 16 }
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
  13: ["1", "4", "5", "A"],
  14: ["2", "5", "8", "C"],
  15: ["1", "4", "5", "A", "D", "F"],
  16: ["1", "6", "B", "G", "7", "A"]
};

export function getScheduleRequirement(format: ScheduleFormat) {
  return { ...MIN_MAX[format], label: FORMAT_LABELS[format] };
}

export function validateScheduleParticipants(format: ScheduleFormat, count: number) {
  const requirement = getScheduleRequirement(format);
  if (count < requirement.min || count > requirement.max) {
    return `${requirement.label} 방식은 ${requirement.min}~${requirement.max}명일 때 대진표를 생성할 수 있습니다.`;
  }
  return "";
}

export function getHanulSeedCount(participantCount: number) {
  if (participantCount <= 5) return 0;
  if (participantCount <= 8) return 2;
  if (participantCount <= 10) return 3;
  if (participantCount <= 14) return 4;
  if (participantCount <= 16) return 6;
  return 0;
}

export function getScheduleFormatLabel(format: ScheduleFormat) {
  return FORMAT_LABELS[format];
}

export function generateInitialMatches(input: GenerateInitialMatchesInput): Match[] {
  const participantCount = input.participants.length;
  const validationMessage = validateScheduleParticipants(input.format, participantCount);
  if (validationMessage) return [];

  const playerMap = input.format === "hanul-aa"
    ? createHanulSeedMap(input.participants, input.seedPlayerIds ?? [])
    : createDefaultSeedMap(input.participants);
  const templates = input.format === "kdk-v2010" ? KDK_TEMPLATES[participantCount] : HANUL_TEMPLATES[participantCount];

  return templates.map((template, index) => {
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
      sortOrder: index + 1
    };
  });
}

function createDefaultSeedMap(participants: Member[]) {
  return participants.reduce<Record<string, string>>((map, member, index) => {
    map[indexToSlot(index)] = member.id;
    return map;
  }, {});
}

function createHanulSeedMap(participants: Member[], seedPlayerIds: string[]) {
  const seedSlots = HANUL_SEED_SLOTS[participants.length] ?? [];
  const map: Record<string, string> = {};
  const seedSet = new Set(seedPlayerIds);
  const selectedSeeds = seedPlayerIds
    .map((id) => participants.find((member) => member.id === id))
    .filter((member): member is Member => Boolean(member))
    .slice(0, seedSlots.length);
  const regulars = participants.filter((member) => !seedSet.has(member.id));

  seedSlots.forEach((slot, index) => {
    const member = selectedSeeds[index];
    if (member) map[slot] = member.id;
  });

  let regularIndex = 0;
  for (let index = 0; index < participants.length; index += 1) {
    const slot = indexToSlot(index);
    if (map[slot]) continue;
    const member = regulars[regularIndex] ?? selectedSeeds.find((seed) => !Object.values(map).includes(seed.id));
    if (member) map[slot] = member.id;
    regularIndex += 1;
  }

  return map;
}

function indexToSlot(index: number) {
  if (index < 9) return String(index + 1);
  return String.fromCharCode(65 + index - 9);
}
