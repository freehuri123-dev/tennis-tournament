import type { Match, Member, TournamentGroup } from "./types";

type GenerateInitialMatchesInput = {
  tournamentId: string;
  groupId: string;
  format: TournamentGroup["scheduleFormat"];
  participants: Member[];
};

// 1차 프로토타입은 참고 이미지의 운영 방식을 경기 목록으로 옮기는 구조다.
// 정확한 전체 인원수별 패턴은 회장님 검토 후 실제 운영 규칙에 맞춰 확장한다.
const PAIRING_PATTERNS: Record<TournamentGroup["scheduleFormat"], number[][]> = {
  "hanul-aa": [
    [1, 2, 3, 4],
    [1, 3, 2, 5],
    [1, 4, 5, 6],
    [2, 3, 4, 6],
    [1, 5, 2, 6],
    [3, 4, 1, 6]
  ],
  "kdk-v2010": [
    [1, 4, 2, 3],
    [1, 2, 3, 5],
    [1, 5, 2, 4],
    [1, 3, 4, 5],
    [2, 5, 3, 4],
    [1, 4, 3, 6]
  ]
};

export function generateInitialMatches(input: GenerateInitialMatchesInput): Match[] {
  const pattern = PAIRING_PATTERNS[input.format];
  const participantIds = input.participants.map((participant) => participant.id);

  return pattern
    .map((slots, index) => {
      const ids = slots.map((slot) => participantIds[(slot - 1) % participantIds.length]);
      return {
        id: `${input.groupId}-match-${index + 1}`,
        tournamentId: input.tournamentId,
        groupId: input.groupId,
        matchNumber: index + 1,
        sideAPlayerIds: [ids[0], ids[1]],
        sideBPlayerIds: [ids[2], ids[3]],
        sideAScore: null,
        sideBScore: null,
        status: "scheduled" as const,
        sortOrder: index + 1
      };
    })
    .filter((match) => new Set([...match.sideAPlayerIds, ...match.sideBPlayerIds]).size === 4);
}
