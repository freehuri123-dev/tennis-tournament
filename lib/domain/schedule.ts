import type { Match, Member, TournamentGroup } from "./types";

type GenerateInitialMatchesInput = {
  tournamentId: string;
  groupId: string;
  format: TournamentGroup["scheduleFormat"];
  participants: Member[];
};

const PAIRING_PATTERNS: Record<TournamentGroup["scheduleFormat"], number[][]> = {
  "kdk-v2010": [
    [1, 4, 2, 3],
    [1, 2, 3, 5],
    [1, 5, 2, 4],
    [1, 3, 4, 5],
    [2, 5, 3, 4],
    [1, 4, 3, 6]
  ],
  "hanul-aa": [
    [1, 2, 3, 4],
    [1, 3, 2, 5],
    [1, 4, 5, 6],
    [2, 3, 4, 6],
    [1, 5, 2, 6],
    [3, 4, 1, 6]
  ]
};

export function generateInitialMatches(input: GenerateInitialMatchesInput): Match[] {
  const participantIds = input.participants.map((participant) => participant.id);
  if (participantIds.length < 4) return [];

  const pattern = PAIRING_PATTERNS[input.format];
  const matches: Match[] = [];

  pattern.forEach((slots, index) => {
    const ids = slots.map((slot) => participantIds[slot - 1]).filter((id): id is string => Boolean(id));
    const uniqueIds = new Set(ids);

    if (ids.length !== 4 || uniqueIds.size !== 4) {
      return;
    }

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
  });

  return matches;
}

export function getHanulSeedPlayers(participants: Member[]) {
  return participants.slice(0, Math.min(3, participants.length));
}
