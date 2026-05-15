import type { TournamentGroup } from "./types";

type FilterGroupMembersInput = {
  participantIds: string[];
  groups: TournamentGroup[];
  groupMemberIds: Record<string, string[]>;
};

export function filterGroupMembersByTournamentParticipants({ participantIds, groups, groupMemberIds }: FilterGroupMembersInput) {
  const participantSet = new Set(participantIds);

  return {
    groups: groups.map((group) => ({ ...group, seedPlayerIds: [] })),
    groupMemberIds: Object.fromEntries(
      Object.entries(groupMemberIds).map(([groupId, memberIds]) => [
        groupId,
        memberIds.filter((memberId) => participantSet.has(memberId))
      ])
    )
  };
}

export function updateTournamentParticipantSelection({ currentParticipantIds, memberId }: { currentParticipantIds: string[]; memberId: string }) {
  const removed = currentParticipantIds.includes(memberId);

  return {
    removed,
    participantIds: removed
      ? currentParticipantIds.filter((id) => id !== memberId)
      : [...currentParticipantIds, memberId]
  };
}

export function canAddTournamentGroup(participantIds: string[]) {
  return participantIds.length > 0;
}
