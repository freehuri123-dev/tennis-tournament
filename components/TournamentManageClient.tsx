"use client";

import { ChevronDown, ChevronUp, ClipboardList, HelpCircle, Plus, Share2, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { AppShell } from "@/components/AppShell";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { RankingTable } from "@/components/RankingTable";
import { TeamRankingTable } from "@/components/TeamRankingTable";
import { TeamBattleContributionDetails, TeamBattleRoster } from "@/components/TeamBattleDetails";
import { StatusBadge } from "@/components/StatusBadge";
import { getClubBySlug, type ClubSlug } from "@/lib/domain/club";
import { getClubShareContent } from "@/lib/domain/club-share";
import { openKakaoTournamentShare } from "@/lib/domain/kakao-share";
import { groupMatchesByExplicitRound } from "@/lib/domain/match-rounds";
import { getMemberLevelLabel } from "@/lib/domain/member-level";
import { calculateFixedPairRankings, calculateRankings } from "@/lib/domain/ranking";
import { applyTournamentAdvancement, generateInitialMatches, getFixedPairTournamentRoundCounts, getHanulSeedSlots, getScheduleFormatLabel, getTournamentByeSelectionOptions, getTournamentRoundLabel, selectTournamentBye, validateScheduleParticipants } from "@/lib/domain/schedule";
import { normalizeMatchScore } from "@/lib/domain/score";
import { balanceTeamAssignments, calculateTeamBattleResult, calculateTeamBattleSideGamePlan, generateTeamBattleMatches, getTeamBattleTargetAppearances, groupTeamBattleMatchesByRound } from "@/lib/domain/team-battle";
import { shareTournamentLink } from "@/lib/domain/share";
import { canAddTournamentGroup, filterGroupMembersByTournamentParticipants, updateTournamentParticipantSelection } from "@/lib/domain/tournament-participants";
import { isScheduleLocked, rankingMembersForTournament } from "@/lib/domain/tournament-policy";
import { withDateStatus } from "@/lib/domain/tournament-status";
import type { Match, TeamSide, TournamentGroup } from "@/lib/domain/types";
import { updateMatchScoreAction, updateTournamentMatchStatesAction } from "@/lib/server/actions/match-actions";
import { persistTournamentStateAction, updateTournamentDateAction, updateTournamentNameAction } from "@/lib/server/actions/tournament-actions";
import type { TournamentState } from "@/lib/store/tournament-store";

type TabId = "setup" | "draw" | "ranking";
type HelpImage = "kdk-v2010" | "hanul-aa" | null;
type ScoreSaveStatus = "dirty" | "saving" | "saved" | "error" | "resetting" | "reset" | "reset-error";

const COURT_NUMBER_OPTIONS = ["1", "2", "3", "4", "5", "6", "7", "8"];
const COURT_COUNT_OPTIONS = [1, 2, 3, 4, 5, 6];
const RANDOM_GAMES_PER_PLAYER_OPTIONS = [2, 3, 4, 5, 6, 7, 8];
function changedMatchStatePayload(previousMatches: Match[], nextMatches: Match[]) {
  return nextMatches.filter((nextMatch) => {
    const previousMatch = previousMatches.find((item) => item.id === nextMatch.id);
    return !previousMatch
      || previousMatch.sideAScore !== nextMatch.sideAScore
      || previousMatch.sideBScore !== nextMatch.sideBScore
      || previousMatch.status !== nextMatch.status
      || previousMatch.sideAPlayerIds.join("\u0000") !== nextMatch.sideAPlayerIds.join("\u0000")
      || previousMatch.sideBPlayerIds.join("\u0000") !== nextMatch.sideBPlayerIds.join("\u0000");
  }).map((item) => ({
    matchId: item.id,
    sideAPlayerIds: item.sideAPlayerIds,
    sideBPlayerIds: item.sideBPlayerIds,
    sideAScore: item.sideAScore,
    sideBScore: item.sideBScore,
    status: item.status
  }));
}
const TEAM_BATTLE_ROUND_OPTIONS = Array.from({ length: 12 }, (_, index) => index + 1);

function teamBattleSelectionRule(memberCount: number, baseGames: number, extraGamePlayerCount: number) {
  const selectLowerGamePlayers = extraGamePlayerCount > memberCount / 2;
  return {
    selectionCount: selectLowerGamePlayers ? memberCount - extraGamePlayerCount : extraGamePlayerCount,
    selectedGames: selectLowerGamePlayers ? baseGames : baseGames + 1,
    unselectedGames: selectLowerGamePlayers ? baseGames + 1 : baseGames
  };
}

const helpImages = {
  "kdk-v2010": { src: "/KDK-V2010.png", title: "KDK-V2010 대진방식" },
  "hanul-aa": { src: "/한울AA.png", title: "한울AA방식 KDK" }
} as const;

function assignedCourtNumbersFromMatches(matches: Match[]) {
  const ordered = [...matches].sort((a, b) => a.sortOrder - b.sortOrder);
  const courtNumbers: string[] = [];
  for (const match of ordered) {
    if (!match.courtNumber || !COURT_NUMBER_OPTIONS.includes(match.courtNumber) || courtNumbers.includes(match.courtNumber)) continue;
    courtNumbers.push(match.courtNumber);
    if (courtNumbers.length >= 6) break;
  }
  return courtNumbers;
}

type TournamentManageClientProps = {
  initialState: TournamentState;
  clubSlug: ClubSlug;
};

export function TournamentManageClient({ initialState, clubSlug }: TournamentManageClientProps) {
  const initialCourtNumbers = assignedCourtNumbersFromMatches(initialState.matches);
  const initialIsTeamBattle = initialState.tournament.type === "team-battle"
    || initialState.groups.some((group) => group.scheduleFormat === "team-battle");
  const initialTeamBattleRoundCount = initialIsTeamBattle
    ? groupTeamBattleMatchesByRound(initialState.matches).length
    : 0;
  const [state, setState] = useState(initialState);
  const scheduleLocked = isScheduleLocked(state.tournament);
  const [, startTransition] = useTransition();
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>(scheduleLocked ? "draw" : "setup");
  const [helpImage, setHelpImage] = useState<HelpImage>(null);
  const [participantPanelOpen, setParticipantPanelOpen] = useState(false);
  const [activeDrawGroupId, setActiveDrawGroupId] = useState<string | null>(null);
  const [activeRankingGroupId, setActiveRankingGroupId] = useState<string | null>(null);
  const [activeSetupGroupId, setActiveSetupGroupId] = useState<string | null>(initialState.groups[0]?.id ?? null);
  const [openPlayerEditMatchId, setOpenPlayerEditMatchId] = useState<string | null>(null);
  const [draggingMember, setDraggingMember] = useState<{ groupId: string; memberId: string } | null>(null);
  const [scoreSaveStatusByMatchId, setScoreSaveStatusByMatchId] = useState<Record<string, ScoreSaveStatus>>({});
  const [courtAssignmentEnabled, setCourtAssignmentEnabled] = useState(initialIsTeamBattle || (initialState.groups.length === 1 && initialCourtNumbers.length > 0));
  const [courtCount, setCourtCount] = useState(Math.min(6, Math.max(1, initialCourtNumbers.length || (initialIsTeamBattle ? 3 : 2))));
  const [teamBattleRoundCount, setTeamBattleRoundCount] = useState(initialTeamBattleRoundCount || 5);
  const [selectedCourtNumbers, setSelectedCourtNumbers] = useState<string[]>(initialCourtNumbers.length > 0 ? initialCourtNumbers : initialIsTeamBattle ? ["1", "2", "3"] : []);
  const [teamBattleExtraGamePlayerIds, setTeamBattleExtraGamePlayerIds] = useState<Record<TeamSide, string[]>>({ blue: [], white: [] });
  const [teamBattleScheduleError, setTeamBattleScheduleError] = useState("");
  const pendingScrollMatchId = useRef<string | null>(null);
  const saveQueueRef = useRef(Promise.resolve());
  const scoreSaveQueuesRef = useRef(new Map<string, Promise<void>>());
  const lastSavedTournamentNameRef = useRef(initialState.tournament.name);

  const membersById = useMemo(() => new Map(state.members.map((member) => [member.id, member])), [state.members]);
  const matchesByGroupId = useMemo(() => {
    const grouped = new Map(state.groups.map((group) => [group.id, [] as Match[]]));
    for (const match of state.matches) {
      const matches = grouped.get(match.groupId);
      if (matches) matches.push(match);
    }
    return grouped;
  }, [state.groups, state.matches]);
  const groupMembersByGroupId = useMemo(() => {
    return new Map(state.groups.map((group) => {
      const memberIds = state.groupMemberIds[group.id] ?? [];
      const members = memberIds.map((id) => membersById.get(id)).filter((member): member is typeof state.members[number] => Boolean(member));
      return [group.id, members] as const;
    }));
  }, [membersById, state.groupMemberIds, state.groups]);
  const tournament = withDateStatus(state.tournament);
  const tournamentType = tournament.type ?? (state.groups.some((group) => group.scheduleFormat === "team-battle")
    ? "team-battle"
    : state.groups.some((group) => group.scheduleFormat === "fixed-pair-tournament" || group.scheduleFormat === "single-tournament")
      ? "tournament"
      : "general");
  const isCompleted = tournament.status === "completed";
  const tournamentParticipantIds = state.tournamentParticipantIds[tournament.id] ?? [];
  const isRandomKdkTournament = tournamentType === "general" && state.groups.some((group) => group.scheduleFormat === "random");
  const canUseCourtAssignment = tournamentType === "team-battle" || (state.groups.length === 1 && !isRandomKdkTournament);

  const tournamentParticipants = useMemo(
    () => tournamentParticipantIds.map((id) => membersById.get(id)).filter((member): member is typeof state.members[number] => Boolean(member)),
    [membersById, tournamentParticipantIds]
  );
  const teamAssignment = state.teamAssignments?.[tournament.id] ?? {};
  const blueTeamMembers = tournamentParticipants.filter((member) => teamAssignment[member.id] === "blue");
  const whiteTeamMembers = tournamentParticipants.filter((member) => teamAssignment[member.id] === "white");
  const unassignedTeamMembers = tournamentParticipants.filter((member) => !teamAssignment[member.id]);
  const teamBattleGroup = state.groups.find((group) => group.scheduleFormat === "team-battle");
  const persistedTeamBattleExtraGamePlayerIds = teamBattleGroup?.seedPlayerIds ?? [];
  const teamBattleTotalAppearances = getTeamBattleTargetAppearances(teamBattleRoundCount, courtCount);
  const teamBattleSidePlans = {
    blue: calculateTeamBattleSideGamePlan(blueTeamMembers.length, teamBattleTotalAppearances),
    white: calculateTeamBattleSideGamePlan(whiteTeamMembers.length, teamBattleTotalAppearances)
  };
  const blueTeamRosterKey = blueTeamMembers.map((member) => member.id).join("|");
  const whiteTeamRosterKey = whiteTeamMembers.map((member) => member.id).join("|");
  const teamBattleSelectionComplete = (["blue", "white"] as const).every((side) => {
    const members = side === "blue" ? blueTeamMembers : whiteTeamMembers;
    const plan = teamBattleSidePlans[side];
    return teamBattleExtraGamePlayerIds[side].length
      === teamBattleSelectionRule(members.length, plan.baseGames, plan.extraGamePlayerCount).selectionCount;
  });
  const maximumTeamBattleCourtCount = Math.floor(Math.min(blueTeamMembers.length, whiteTeamMembers.length) / 2);
  const teamBattleCourtCountValid = courtCount <= maximumTeamBattleCourtCount;
  const teamBattleResult = useMemo(() => calculateTeamBattleResult(state.matches), [state.matches]);
  const drawGroupId = activeDrawGroupId && state.groups.some((group) => group.id === activeDrawGroupId) ? activeDrawGroupId : state.groups[0]?.id;
  const rankingGroupId = activeRankingGroupId && state.groups.some((group) => group.id === activeRankingGroupId) ? activeRankingGroupId : state.groups[0]?.id;
  const setupGroupId = activeSetupGroupId && state.groups.some((group) => group.id === activeSetupGroupId) ? activeSetupGroupId : state.groups[0]?.id ?? null;
  const visibleSetupGroups = scheduleLocked ? state.groups : state.groups.filter((group) => group.id === setupGroupId);
  const assignedGroupMemberIds = new Set(state.groups.flatMap((group) => state.groupMemberIds[group.id] ?? []));
  const unassignedGroupMembers = tournamentParticipants.filter((member) => !assignedGroupMemberIds.has(member.id));

  useEffect(() => {
    const appearanceCounts = new Map<string, number>();
    state.matches.forEach((match) => {
      [...match.sideAPlayerIds, ...match.sideBPlayerIds].forEach((memberId) => appearanceCounts.set(memberId, (appearanceCounts.get(memberId) ?? 0) + 1));
    });
    setTeamBattleExtraGamePlayerIds((current) => {
      const reconcile = (side: TeamSide, members: typeof tournamentParticipants) => {
        const plan = teamBattleSidePlans[side];
        const selectionRule = teamBattleSelectionRule(members.length, plan.baseGames, plan.extraGamePlayerCount);
        const required = selectionRule.selectionCount;
        const memberIds = new Set(members.map((member) => member.id));
        const persisted = persistedTeamBattleExtraGamePlayerIds.filter((memberId) => memberIds.has(memberId)).slice(0, required);
        const preferred = current[side].length > 0 ? current[side] : persisted;
        const retained = preferred.filter((memberId) => memberIds.has(memberId)).slice(0, required);
        const candidates = members
          .filter((member) => !retained.includes(member.id))
          .sort((left, right) => {
            const leftGames = appearanceCounts.get(left.id) ?? 0;
            const rightGames = appearanceCounts.get(right.id) ?? 0;
            return Math.abs(leftGames - selectionRule.selectedGames) - Math.abs(rightGames - selectionRule.selectedGames)
              || (selectionRule.selectedGames < selectionRule.unselectedGames ? leftGames - rightGames : rightGames - leftGames)
              || left.id.localeCompare(right.id);
          });
        return [...retained, ...candidates.slice(0, Math.max(0, required - retained.length)).map((member) => member.id)];
      };
      return { blue: reconcile("blue", blueTeamMembers), white: reconcile("white", whiteTeamMembers) };
    });
    setTeamBattleScheduleError("");
  // The roster keys intentionally reset selections only when participants move between teams.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blueTeamRosterKey, whiteTeamRosterKey, persistedTeamBattleExtraGamePlayerIds.join("|"), teamBattleSidePlans.blue.baseGames, teamBattleSidePlans.blue.extraGamePlayerCount, teamBattleSidePlans.white.baseGames, teamBattleSidePlans.white.extraGamePlayerCount]);

  useEffect(() => {
    if (tournamentType !== "team-battle" || maximumTeamBattleCourtCount <= 0 || courtCount <= maximumTeamBattleCourtCount) return;
    setCourtCount(maximumTeamBattleCourtCount);
    setSelectedCourtNumbers((current) => {
      const next = current.slice(0, maximumTeamBattleCourtCount);
      for (const courtNumber of COURT_NUMBER_OPTIONS) {
        if (next.length >= maximumTeamBattleCourtCount) break;
        if (!next.includes(courtNumber)) next.push(courtNumber);
      }
      return next;
    });
  }, [courtCount, maximumTeamBattleCourtCount, tournamentType]);

  useEffect(() => {
    if (!helpImage) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [helpImage]);

  useEffect(() => {
    if (!pendingScrollMatchId.current) return;
    const target = document.getElementById(pendingScrollMatchId.current);
    pendingScrollMatchId.current = null;
    target?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [state.matches.length]);

  const rankings = useMemo(() => {
    return state.groups.map((group) => {
      const groupMembers = groupMembersByGroupId.get(group.id) ?? [];
      const members = rankingMembersForTournament(tournament, groupMembers);
      const matches = matchesByGroupId.get(group.id) ?? [];
      return {
        group,
        rows: group.scheduleFormat === "fixed-pair-league" ? [] : calculateRankings(members, matches),
        teamRows: group.scheduleFormat === "fixed-pair-league" ? calculateFixedPairRankings(members, matches) : []
      };
    });
  }, [groupMembersByGroupId, matchesByGroupId, state.groups, tournament]);

  function normalizeState(next: TournamentState) {
    const nextTournament = withDateStatus(next.tournament);
    return {
      ...next,
      tournament: nextTournament,
      tournaments: next.tournaments.map((item) => withDateStatus(item.id === nextTournament.id ? nextTournament : item))
    };
  }

  function updateLocal(next: TournamentState) {
    setState(normalizeState(next));
  }

  function persist(next: TournamentState) {
    const normalized = normalizeState(next);
    setState(normalized);
    startTransition(() => {
      setIsSaving(true);
      const saveTask = saveQueueRef.current
        .catch(() => undefined)
        .then(async () => {
          await persistTournamentStateAction(clubSlug, normalized);
        })
        .catch(() => {
          window.alert("Failed to save tournament changes. Please refresh and try again.");
        })
        .finally(() => {
          if (saveQueueRef.current === saveTask) setIsSaving(false);
        });
      saveQueueRef.current = saveTask;
    });
  }

  function persistDate(tournamentId: string, date: string) {
    startTransition(() => {
      setIsSaving(true);
      const saveTask = saveQueueRef.current
        .catch(() => undefined)
        .then(async () => {
          await updateTournamentDateAction(clubSlug, tournamentId, date);
        })
        .catch(() => {
          window.alert("Failed to save tournament date. Please refresh and try again.");
        })
        .finally(() => {
          if (saveQueueRef.current === saveTask) setIsSaving(false);
        });
      saveQueueRef.current = saveTask;
    });
  }

  function persistName(tournamentId: string, name: string) {
    const trimmedName = name.trim();
    if (!trimmedName || trimmedName === lastSavedTournamentNameRef.current) return;
    startTransition(() => {
      setIsSaving(true);
      const saveTask = saveQueueRef.current
        .catch(() => undefined)
        .then(async () => {
          await updateTournamentNameAction(clubSlug, tournamentId, trimmedName);
          lastSavedTournamentNameRef.current = trimmedName;
        })
        .catch(() => {
          window.alert("Failed to save tournament name. Please refresh and try again.");
        })
        .finally(() => {
          if (saveQueueRef.current === saveTask) setIsSaving(false);
        });
      saveQueueRef.current = saveTask;
    });
  }

  function setScoreSaveStatus(matchId: string, status: ScoreSaveStatus) {
    setScoreSaveStatusByMatchId((current) => ({ ...current, [matchId]: status }));
  }

  function queueMatchSave(
    matchId: string,
    save: () => Promise<void>,
    options: {
      pendingStatus?: ScoreSaveStatus;
      successStatus?: ScoreSaveStatus;
      errorStatus?: ScoreSaveStatus;
      onSuccess?: () => void;
    } = {}
  ) {
    const pendingStatus = options.pendingStatus ?? "saving";
    const successStatus = options.successStatus ?? "saved";
    const errorStatus = options.errorStatus ?? "error";
    setScoreSaveStatus(matchId, pendingStatus);
    const previous = scoreSaveQueuesRef.current.get(matchId) ?? Promise.resolve();
    const current = previous.catch(() => undefined).then(save);

    scoreSaveQueuesRef.current.set(matchId, current);
    current
      .then(() => {
        if (scoreSaveQueuesRef.current.get(matchId) !== current) return;
        options.onSuccess?.();
        setScoreSaveStatus(matchId, successStatus);
      })
      .catch(() => {
        if (scoreSaveQueuesRef.current.get(matchId) === current) setScoreSaveStatus(matchId, errorStatus);
      });
  }

  function completeMatchScore(matchId: string) {
    if (isCompleted) return;
    const match = state.matches.find((item) => item.id === matchId);
    if (!match || match.sideAScore === null || match.sideBScore === null) return;

    const completedMatch = { ...match, status: "completed" as const };
    const nextState = {
      ...state,
      matches: state.matches.map((item) => item.id === matchId ? completedMatch : item)
    };
    const matchGroup = state.groups.find((group) => group.id === match.groupId);
    const shouldAdvanceTournament = Boolean(matchGroup && isTournamentFormat(matchGroup));
    const completedState = shouldAdvanceTournament
      ? { ...nextState, matches: applyTournamentAdvancement(nextState.matches, match.groupId) }
      : nextState;

    updateLocal(completedState);
    queueMatchSave(matchId, async () => {
      if (shouldAdvanceTournament) {
        await updateTournamentMatchStatesAction({
          publicSlug: state.tournament.publicSlug,
          matches: changedMatchStatePayload(state.matches, completedState.matches)
        }, clubSlug);
        return;
      }
      await updateMatchScoreAction(
        { matchId, sideAScore: completedMatch.sideAScore, sideBScore: completedMatch.sideBScore },
        clubSlug
      );
    });
  }

  function resetMatchScore(matchId: string) {
    if (isCompleted) return;
    const match = state.matches.find((item) => item.id === matchId);
    if (!match || match.status !== "completed" || match.sideAScore === null || match.sideBScore === null) return;

    const matchGroup = state.groups.find((group) => group.id === match.groupId);
    const shouldAdvanceTournament = Boolean(matchGroup && isTournamentFormat(matchGroup));
    const confirmation = shouldAdvanceTournament
      ? "이 경기와 연결된 이후 라운드의 진출자 및 점수도 함께 초기화됩니다. 계속할까요?"
      : "이 경기의 입력 점수를 초기화할까요?";
    if (!window.confirm(confirmation)) return;

    const clearedMatch = { ...match, sideAScore: null, sideBScore: null, status: "scheduled" as const };
    const nextState = {
      ...state,
      matches: state.matches.map((item) => item.id === matchId ? clearedMatch : item)
    };
    const resetState = shouldAdvanceTournament
      ? { ...nextState, matches: applyTournamentAdvancement(nextState.matches, match.groupId) }
      : nextState;
    const changedMatches = changedMatchStatePayload(state.matches, resetState.matches);
    const changedMatchIds = new Set(changedMatches.map((item) => item.matchId));
    const resetMatchesById = new Map(resetState.matches.filter((item) => changedMatchIds.has(item.id)).map((item) => [item.id, item]));

    queueMatchSave(matchId, async () => {
      if (shouldAdvanceTournament) {
        await updateTournamentMatchStatesAction({
          publicSlug: state.tournament.publicSlug,
          matches: changedMatches
        }, clubSlug);
        return;
      }
      await updateMatchScoreAction({ matchId, sideAScore: null, sideBScore: null }, clubSlug);
    }, {
      pendingStatus: "resetting",
      successStatus: "reset",
      errorStatus: "reset-error",
      onSuccess: () => {
        setState((current) => ({
          ...current,
          matches: current.matches.map((item) => resetMatchesById.get(item.id) ?? item)
        }));
      }
    });
  }


  function moveTeamBattleRound(groupId: string, roundNumber: number, direction: "up" | "down") {
    if (isCompleted) return;
    const groupMatches = [...(matchesByGroupId.get(groupId) ?? [])].sort((left, right) => left.sortOrder - right.sortOrder);
    const rounds = groupTeamBattleMatchesByRound(groupMatches);
    const currentIndex = rounds.findIndex((round) => round.roundNumber === roundNumber);
    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= rounds.length) return;

    const reorderedRounds = [...rounds];
    [reorderedRounds[currentIndex], reorderedRounds[targetIndex]] = [reorderedRounds[targetIndex], reorderedRounds[currentIndex]];
    const reorderedGroupMatches = reorderedRounds.flatMap((round) => round.matches).map((match, index) => ({
      ...match,
      matchNumber: index + 1,
      sortOrder: index + 1
    }));
    let groupInserted = false;
    const nextMatches = state.matches.flatMap((match) => {
      if (match.groupId !== groupId) return [match];
      if (groupInserted) return [];
      groupInserted = true;
      return reorderedGroupMatches;
    });
    persist({ ...state, matches: nextMatches });
  }
  function displayGroupName(group: TournamentGroup) {
    return tournamentType === "team-battle" ? "청백전" : state.groups.length === 1 ? "전체" : group.name;
  }

  function groupParticipants(groupId: string) {
    return groupMembersByGroupId.get(groupId) ?? [];
  }

  function memberName(id: string) {
    return membersById.get(id)?.name ?? "미정";
  }

  function teamLabel(ids: string[]) {
    return ids.map(memberName).join(", ") || "선수 미정";
  }

  function defaultCourtNumbers(nextCount = courtCount) {
    return COURT_NUMBER_OPTIONS.slice(0, nextCount);
  }

  function selectedCourtNumbersForSchedule(nextCount = courtCount, forceCourtAssignment = false) {
    if (!forceCourtAssignment && (!canUseCourtAssignment || !courtAssignmentEnabled)) return [];
    const numbers = selectedCourtNumbers.length >= nextCount ? selectedCourtNumbers : defaultCourtNumbers(nextCount);
    return numbers.slice(0, nextCount);
  }

  function randomGroupCourtNumbers(_group: TournamentGroup) {
    return [];
  }

  function toggleCourtAssignment() {
    if (isCompleted || !canUseCourtAssignment) return;
    setCourtAssignmentEnabled((enabled) => {
      const nextEnabled = !enabled;
      if (nextEnabled) {
        setSelectedCourtNumbers((current) => current.length >= courtCount ? current.slice(0, courtCount) : defaultCourtNumbers(courtCount));
      }
      return nextEnabled;
    });
  }

  function toggleCourtNumber(courtNumber: string) {
    if (isCompleted) return;
    setSelectedCourtNumbers((current) => {
      if (current.includes(courtNumber)) return current.filter((item) => item !== courtNumber);
      if (current.length >= courtCount) {
        window.alert(`코트는 ${courtCount}개까지만 선택할 수 있습니다.`);
        return current;
      }
      return [...current, courtNumber];
    });
  }

  function updateCourtCount(nextCount: number) {
    setCourtCount(nextCount);
    setSelectedCourtNumbers((current) => {
      if (current.length >= nextCount) return current.slice(0, nextCount);
      const next = [...current];
      for (const option of COURT_NUMBER_OPTIONS) {
        if (next.length >= nextCount) break;
        if (!next.includes(option)) next.push(option);
      }
      return next;
    });
  }

  function courtLabel(match: Match) {
    return match.courtNumber ? `${match.courtNumber}번 코트` : "코트 미정";
  }

  function tournamentTeamLabel(ids: string[], fallback = "승자 대기") {
    return ids.length > 0 ? ids.map(memberName).join(", ") : fallback;
  }

  function isTournamentFormat(group: TournamentGroup) {
    return group.scheduleFormat === "fixed-pair-tournament" || group.scheduleFormat === "single-tournament";
  }

  function isFixedPairLeagueFormat(group: TournamentGroup) {
    return group.scheduleFormat === "fixed-pair-league";
  }

  function usesFixedPairs(group: TournamentGroup) {
    return group.scheduleFormat === "fixed-pair-tournament" || isFixedPairLeagueFormat(group);
  }

  function tournamentTeamSize(group: TournamentGroup) {
    return group.scheduleFormat === "single-tournament" ? 1 : 2;
  }

  function tournamentRoundSections(group: TournamentGroup) {
    const matches = [...(matchesByGroupId.get(group.id) ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);
    const counts = getFixedPairTournamentRoundCounts(matches.length);
    let start = 0;
    return counts.map((count, roundIndex) => {
      const roundMatches = matches.slice(start, start + count);
      start += count;
      return {
        label: getTournamentRoundLabel(roundIndex, counts),
        matches: roundMatches
      };
    });
  }

  function tournamentMatchRoundLabel(group: TournamentGroup, match: Match) {
    const matches = [...(matchesByGroupId.get(group.id) ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);
    const counts = getFixedPairTournamentRoundCounts(matches.length);
    let start = 0;
    for (let roundIndex = 0; roundIndex < counts.length; roundIndex += 1) {
      const end = start + counts[roundIndex];
      if (matches.slice(start, end).some((item) => item.id === match.id)) return getTournamentRoundLabel(roundIndex, counts);
      start = end;
    }
    return "";
  }

  function tournamentByeSelections(group: TournamentGroup) {
    return getTournamentByeSelectionOptions(state.matches, group.id);
  }

  function tournamentSideFallback(group: TournamentGroup, match: Match, side: "A" | "B") {
    const firstRoundCount = getFixedPairTournamentRoundCounts(matchesByGroupId.get(group.id)?.length ?? 0)[0] ?? 0;
    const sideIds = side === "A" ? match.sideAPlayerIds : match.sideBPlayerIds;
    const otherIds = side === "A" ? match.sideBPlayerIds : match.sideAPlayerIds;
    const selectedByeMatch = tournamentByeSelections(group).some((selection) => selection.byeMatchId === match.id && selection.selectedSourceMatchId);
    if (selectedByeMatch && sideIds.length === 0 && otherIds.length > 0) return "BYE";
    return match.sortOrder <= firstRoundCount && sideIds.length === 0 && otherIds.length > 0 ? "BYE" : "승자 대기";
  }

  function isInitialAutoByeTeam(group: TournamentGroup, memberIndex: number, memberCount: number) {
    if (!isTournamentFormat(group)) return false;
    const teamSize = tournamentTeamSize(group);
    if (memberCount % teamSize !== 0) return false;
    const teamCount = memberCount / teamSize;
    if (teamCount < 3 || teamCount % 2 === 0) return false;
    return Math.floor(memberIndex / teamSize) === teamCount - 1;
  }

  function tournamentSeedNote(group: TournamentGroup, memberIndex: number, memberCount: number) {
    const base = group.scheduleFormat === "single-tournament"
      ? `${memberIndex + 1}시드`
      : usesFixedPairs(group)
        ? `${Math.floor(memberIndex / 2) + 1}페어`
        : group.scheduleFormat === "hanul-aa" && getHanulSeedSlots(memberCount).includes(orderSlotLabel(memberIndex))
          ? "자동 시드"
          : "참여";
    return isInitialAutoByeTeam(group, memberIndex, memberCount) ? `${base} · 자동 부전승` : base;
  }

  function canEnterMatchScore(match: Match) {
    return match.sideAPlayerIds.length > 0 && match.sideBPlayerIds.length > 0;
  }

  function shuffle<T>(items: T[]) {
    const next = [...items];
    for (let index = next.length - 1; index > 0; index -= 1) {
      const target = Math.floor(Math.random() * (index + 1));
      [next[index], next[target]] = [next[target], next[index]];
    }
    return next;
  }

  function openHelpImage(format: TournamentGroup["scheduleFormat"]) {
    if (format === "random" || format === "fixed-pair-league" || format === "fixed-pair-tournament" || format === "single-tournament" || format === "team-battle") return;
    setHelpImage(format);
  }

  function applyTournamentParticipantSelection(participantIds: string[]) {
    if (isCompleted) return;
    const nextParticipantIdSet = new Set(participantIds);
    const removed = tournamentParticipantIds.some((id) => !nextParticipantIdSet.has(id));
    if (removed && state.matches.length > 0 && !window.confirm(tournamentType === "team-battle" ? "참가자를 제외하면 완료 경기는 유지되고 예정 대진만 다시 편성해야 합니다. 계속할까요?" : "참가자를 제외하면 기존 대진표와 경기결과가 초기화됩니다. 계속할까요?")) return;
    const synced = filterGroupMembersByTournamentParticipants({
      participantIds,
      groups: state.groups,
      groupMemberIds: state.groupMemberIds
    });

    const nextAssignments = Object.fromEntries(
      Object.entries(teamAssignment).filter(([memberId]) => nextParticipantIdSet.has(memberId))
    );
    updateLocal({
      ...state,
      tournamentParticipantIds: { ...state.tournamentParticipantIds, [tournament.id]: participantIds },
      groups: synced.groups,
      groupMemberIds: synced.groupMemberIds,
      teamAssignments: { ...(state.teamAssignments ?? {}), [tournament.id]: nextAssignments },
      matches: removed ? (tournamentType === "team-battle" ? state.matches.filter((match) => match.status === "completed") : []) : state.matches
    });
  }

  function toggleTournamentParticipant(memberId: string) {
    const nextSelection = updateTournamentParticipantSelection({ currentParticipantIds: tournamentParticipantIds, memberId });
    applyTournamentParticipantSelection(nextSelection.participantIds);
  }

  function selectTournamentParticipantsByGender(gender: "male" | "female") {
    const genderParticipantIds = state.members
      .filter((member) => member.gender === gender && (!member.deleted || tournamentParticipantIds.includes(member.id)))
      .map((member) => member.id);
    const genderParticipantIdSet = new Set(genderParticipantIds);
    const allGenderSelected = genderParticipantIds.length > 0 && genderParticipantIds.every((id) => tournamentParticipantIds.includes(id));
    const participantIds = allGenderSelected
      ? tournamentParticipantIds.filter((id) => !genderParticipantIdSet.has(id))
      : Array.from(new Set([...tournamentParticipantIds, ...genderParticipantIds]));

    applyTournamentParticipantSelection(participantIds);
  }

  function setTeamSide(memberId: string, side: TeamSide) {
    if (isCompleted) return;
    updateLocal({
      ...state,
      teamAssignments: {
        ...(state.teamAssignments ?? {}),
        [tournament.id]: { ...teamAssignment, [memberId]: side }
      }
    });
  }

  function autoBalanceTeams() {
    if (isCompleted || tournamentParticipants.length < 4) return;
    updateLocal({
      ...state,
      teamAssignments: {
        ...(state.teamAssignments ?? {}),
        [tournament.id]: balanceTeamAssignments(tournamentParticipants, teamAssignment)
      }
    });
  }

  function toggleTeamBattleExtraGamePlayer(side: TeamSide, memberId: string) {
    if (isCompleted) return;
    const members = side === "blue" ? blueTeamMembers : whiteTeamMembers;
    const plan = teamBattleSidePlans[side];
    const required = teamBattleSelectionRule(members.length, plan.baseGames, plan.extraGamePlayerCount).selectionCount;
    setTeamBattleExtraGamePlayerIds((current) => {
      const selected = current[side];
      const next = selected.includes(memberId)
        ? selected.filter((id) => id !== memberId)
        : selected.length < required
          ? [...selected, memberId]
          : [...selected.slice(1), memberId];
      return { ...current, [side]: next };
    });
    setTeamBattleScheduleError("");
  }

  function teamBattleTargetGames() {
    return Object.fromEntries((["blue", "white"] as const).flatMap((side) => {
      const members = side === "blue" ? blueTeamMembers : whiteTeamMembers;
      const selectedIds = new Set(teamBattleExtraGamePlayerIds[side]);
      const plan = teamBattleSidePlans[side];
      const rule = teamBattleSelectionRule(members.length, plan.baseGames, plan.extraGamePlayerCount);
      return members.map((member) => [
        member.id,
        selectedIds.has(member.id) ? rule.selectedGames : rule.unselectedGames
      ] as const);
    }));
  }
  async function shareTournament() {
    const url = `${window.location.origin}/public/${clubSlug}/${tournament.publicSlug}`;
    const clubName = getClubBySlug(clubSlug)?.name ?? "테니스 클럽";
    const clubShare = getClubShareContent(clubSlug);
    const shareData = {
      title: `${clubName} - ${tournament.name}`,
      text: clubShare.description,
      url
    };

    const sharedToKakao = await openKakaoTournamentShare({
      javascriptKey: process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY ?? "",
      title: shareData.title,
      description: shareData.text,
      url,
      imageUrl: `${window.location.origin}${clubShare.imagePath}`
    });
    if (sharedToKakao) return;

    await shareTournamentLink({
      ...shareData,
      share: navigator.share?.bind(navigator),
      writeText: navigator.clipboard?.writeText.bind(navigator.clipboard),
      notify: (message) => window.alert(message)
    });
  }

  function groupValidation(group: TournamentGroup) {
    const participants = groupParticipants(group.id);
    const rangeMessage = validateScheduleParticipants(group.scheduleFormat, participants.length);
    if (rangeMessage) return rangeMessage;
    if (group.scheduleFormat === "hanul-aa") {
      const seedSlots = getHanulSeedSlots(participants.length);
      if (seedSlots.length > 0 && participants.length > 0) return "";
    }
    return "";
  }

  function updateTournament(field: "name" | "date", value: string) {
    if (isCompleted && field !== "date") return;
    const nextTournament = withDateStatus({ ...tournament, [field]: value });
    updateLocal({
      ...state,
      tournament: nextTournament,
      tournaments: state.tournaments.map((item) => (item.id === nextTournament.id ? nextTournament : item))
    });
    if (field === "date") persistDate(nextTournament.id, nextTournament.date);
  }

  function addGroup() {
    if (isCompleted || tournamentType === "team-battle") return;
    if ((tournamentType === "tournament" || state.groups.some((group) => group.scheduleFormat === "random" || group.scheduleFormat === "fixed-pair-league")) && state.groups.length > 0) return;
    if (state.groups.some(isTournamentFormat)) {
      window.alert("토너먼트 방식은 한 그룹으로만 진행할 수 있습니다.");
      return;
    }
    if (!canAddTournamentGroup(tournamentParticipantIds)) {
      window.alert("참가자를 먼저 선택해주세요.");
      setParticipantPanelOpen(true);
      return;
    }
    const groupId = `group-${Date.now()}`;
    const nextGroupNumber = state.groups.length + 1;
    setActiveSetupGroupId(groupId);
    setCourtAssignmentEnabled(false);
    updateLocal({
      ...state,
      groups: [
        ...state.groups,
        {
          id: groupId,
          tournamentId: tournament.id,
          name: tournamentType === "tournament" ? "전체" : `${String.fromCharCode(64 + nextGroupNumber)}조`,
          scheduleFormat: tournamentType === "tournament" ? "fixed-pair-tournament" : "kdk-v2010",
          sortOrder: nextGroupNumber,
          seedPlayerIds: []
        }
      ],
      groupMemberIds: { ...state.groupMemberIds, [groupId]: [] }
    });
  }

  function deleteGroup(groupId: string) {
    if (isCompleted) return;
    if (!window.confirm("그룹을 삭제할까요? 이 그룹의 경기와 결과도 함께 삭제됩니다.")) return;
    const nextGroupMemberIds = { ...state.groupMemberIds };
    const remainingGroups = state.groups
      .filter((group) => group.id !== groupId)
      .map((group, index) => tournamentType === "general"
        ? { ...group, name: `${String.fromCharCode(65 + index)}조`, sortOrder: index + 1 }
        : group);
    delete nextGroupMemberIds[groupId];
    if (setupGroupId === groupId) setActiveSetupGroupId(remainingGroups[0]?.id ?? null);
    updateLocal({
      ...state,
      groups: remainingGroups,
      groupMemberIds: nextGroupMemberIds,
      matches: state.matches.filter((match) => match.groupId !== groupId)
    });
  }

  function updateGroupFormat(groupId: string, scheduleFormat: TournamentGroup["scheduleFormat"]) {
    if (isCompleted) return;
    const targetGroup = state.groups.find((group) => group.id === groupId);
    const tournamentMode = scheduleFormat === "fixed-pair-tournament" || scheduleFormat === "single-tournament";
    const singleGroupMode = tournamentMode || scheduleFormat === "random" || scheduleFormat === "fixed-pair-league";
    if (singleGroupMode && state.groups.length > 1) return;
    const nextGroups = singleGroupMode && targetGroup
      ? [{ ...targetGroup, scheduleFormat, seedPlayerIds: [], name: "전체", sortOrder: 1 }]
      : state.groups.map((group) => (group.id === groupId ? { ...group, scheduleFormat, seedPlayerIds: [] } : group));
    const nextGroupIds = new Set(nextGroups.map((group) => group.id));
    const nextGroupMemberIds = Object.fromEntries(
      Object.entries(state.groupMemberIds).filter(([targetId]) => nextGroupIds.has(targetId))
    );
    updateLocal({
      ...state,
      groups: nextGroups,
      groupMemberIds: nextGroupMemberIds,
      matches: state.matches.filter((match) => nextGroupIds.has(match.groupId))
    });
  }

  function updateRandomGroupOption(groupId: string, field: "randomCourtCount" | "randomGamesPerPlayer", value: number) {
    if (isCompleted) return;
    const normalized = field === "randomCourtCount"
      ? Math.max(1, Math.min(6, value))
      : Math.max(1, Math.min(8, value));
    updateLocal({
      ...state,
      groups: state.groups.map((group) => (group.id === groupId ? { ...group, [field]: normalized, seedPlayerIds: field === "randomGamesPerPlayer" ? [] : group.seedPlayerIds } : group)),
      matches: state.matches.filter((match) => match.groupId !== groupId)
    });
  }


  function randomExtraGameCount(memberCount: number, minimumGames: number) {
    const total = memberCount * minimumGames;
    return Math.ceil(total / 4) * 4 - total;
  }

  function randomExtraGamePlayerIds(group: TournamentGroup, members: typeof state.members) {
    const extraCount = randomExtraGameCount(members.length, group.randomGamesPerPlayer ?? 2);
    if (extraCount <= 0) return [];
    const memberIds = new Set(members.map((member) => member.id));
    const selected = (group.seedPlayerIds ?? []).filter((memberId) => memberIds.has(memberId)).slice(0, extraCount);
    return selected.length > 0 ? selected : members.slice(0, extraCount).map((member) => member.id);
  }

  function toggleRandomExtraGamePlayer(groupId: string, memberId: string) {
    if (isCompleted) return;
    const group = state.groups.find((item) => item.id === groupId);
    if (!group) return;
    const members = groupParticipants(groupId);
    const extraCount = randomExtraGameCount(members.length, group.randomGamesPerPlayer ?? 2);
    if (extraCount <= 0) return;
    const current = randomExtraGamePlayerIds(group, members);
    const next = current.includes(memberId)
      ? current
      : current.length < extraCount
        ? [...current, memberId]
        : [...current.slice(1), memberId];
    updateLocal({
      ...state,
      groups: state.groups.map((item) => (item.id === groupId ? { ...item, seedPlayerIds: next } : item)),
      matches: state.matches.filter((match) => match.groupId !== groupId)
    });
  }
  function randomizeTournamentSeeds(groupId: string) {
    if (isCompleted) return;
    const shuffledIds = shuffle(state.groupMemberIds[groupId] ?? []);
    updateLocal({
      ...state,
      groupMemberIds: { ...state.groupMemberIds, [groupId]: shuffledIds },
      groups: state.groups.map((group) => (group.id === groupId ? { ...group, seedPlayerIds: [] } : group))
    });
  }

  function isAssignedToOtherGroup(memberId: string, groupId: string) {
    return Object.entries(state.groupMemberIds).some(([targetGroupId, ids]) => targetGroupId !== groupId && ids.includes(memberId));
  }

  function toggleGroupMember(groupId: string, memberId: string) {
    if (isCompleted || scheduleLocked || isAssignedToOtherGroup(memberId, groupId)) return;
    const currentIds = state.groupMemberIds[groupId] ?? [];
    const nextIds = currentIds.includes(memberId) ? currentIds.filter((id) => id !== memberId) : [...currentIds, memberId];
    updateLocal({
      ...state,
      groupMemberIds: { ...state.groupMemberIds, [groupId]: nextIds },
      groups: state.groups.map((group) => (group.id === groupId ? { ...group, seedPlayerIds: [] } : group))
    });
  }

  function moveGroupMember(groupId: string, memberId: string, targetMemberId: string) {
    if (isCompleted || scheduleLocked || memberId === targetMemberId) return;
    const currentIds = state.groupMemberIds[groupId] ?? [];
    const fromIndex = currentIds.indexOf(memberId);
    const toIndex = currentIds.indexOf(targetMemberId);
    if (fromIndex < 0 || toIndex < 0) return;
    const nextIds = [...currentIds];
    [nextIds[fromIndex], nextIds[toIndex]] = [nextIds[toIndex], nextIds[fromIndex]];
    updateLocal({
      ...state,
      groupMemberIds: { ...state.groupMemberIds, [groupId]: nextIds },
      groups: state.groups.map((group) => (group.id === groupId ? { ...group, seedPlayerIds: [] } : group))
    });
  }

  function generateAllSchedules() {
    if (isCompleted) return;
    if (tournamentType === "team-battle") {
      if (blueTeamMembers.length < 2 || whiteTeamMembers.length < 2 || unassignedTeamMembers.length > 0) return;
      if (!teamBattleCourtCountValid) {
        setTeamBattleScheduleError(`현재 팀 인원으로는 한 라운드에 최대 ${maximumTeamBattleCourtCount}개 코트만 사용할 수 있습니다.`);
        return;
      }
      const group: TournamentGroup = state.groups.find((item) => item.scheduleFormat === "team-battle") ?? {
        id: `team-battle-${tournament.id}`,
        tournamentId: tournament.id,
        name: "청백전",
        scheduleFormat: "team-battle",
        sortOrder: 1,
        seedPlayerIds: []
      };
      const teamBattleSeedPlayerIds = [
        ...teamBattleExtraGamePlayerIds.blue,
        ...teamBattleExtraGamePlayerIds.white
      ];
      const message = state.matches.length > 0 ? "기존 청백전 대진과 경기 결과를 모두 초기화하고 새 대진을 만들까요?" : "청백전 대진표를 생성할까요?";
      if (courtAssignmentEnabled && selectedCourtNumbers.length < courtCount) {
        window.alert(`${courtCount}개 코트를 사용하려면 코트 번호 ${courtCount}개를 선택해주세요.`);
        return;
      }
      if (!window.confirm(message)) return;
      try {
        const matches = generateTeamBattleMatches({
          tournamentId: tournament.id,
          groupId: group.id,
          blueMembers: blueTeamMembers,
          whiteMembers: whiteTeamMembers,
          existingMatches: [],
          targetGamesByMemberId: teamBattleTargetGames(),
          courtNumbers: selectedCourtNumbersForSchedule(),
          roundCount: teamBattleRoundCount
        });
        setTeamBattleScheduleError("");
        persist({
          ...state,
          tournament: { ...tournament, type: "team-battle" },
          groups: [{ ...group, seedPlayerIds: teamBattleSeedPlayerIds }],
          groupMemberIds: { [group.id]: tournamentParticipantIds },
          matches
        });
      } catch (error) {
        setTeamBattleScheduleError(error instanceof Error ? error.message : "선택한 경기 수로 대진을 만들 수 없습니다.");
        return;
      }
      setActiveDrawGroupId(group.id);
      setActiveTab("draw");
      return;
    }
    const invalid = state.groups.find((group) => groupValidation(group));
    if (invalid) return;
    const message = state.matches.length > 0
      ? "기존 경기결과는 초기화되고 새로운 대진표가 만들어집니다. 계속할까요?"
      : "대진표를 생성할까요?";
    if (!window.confirm(message)) return;

    if (canUseCourtAssignment && courtAssignmentEnabled && selectedCourtNumbers.length < courtCount) {
      window.alert(`${courtCount}개 코트를 사용하려면 코트 번호 ${courtCount}개를 선택해주세요.`);
      return;
    }

    const courtNumbers = selectedCourtNumbersForSchedule();
    let courtStartIndex = 0;
    const generated = state.groups.flatMap((group) => {
      const participants = groupParticipants(group.id);
      const groupCourtNumbers = group.scheduleFormat === "random" ? randomGroupCourtNumbers(group) : courtNumbers;
      const matches = generateInitialMatches({
        tournamentId: tournament.id,
        groupId: group.id,
        format: group.scheduleFormat,
        seedPlayerIds: group.scheduleFormat === "random" ? randomExtraGamePlayerIds(group, participants) : group.seedPlayerIds,
        participants,
        courtNumbers: groupCourtNumbers,
        courtStartIndex,
        randomGamesPerPlayer: group.randomGamesPerPlayer ?? 2
      });
      courtStartIndex += matches.length;
      return matches;
    });

    persist({
      ...state,
      tournament,
      matches: generated
    });
    setActiveDrawGroupId(generated[0]?.groupId ?? state.groups[0]?.id ?? null);
    setActiveTab("draw");
  }

  function addMatch(groupId: string) {
    if (isCompleted) return;
    const group = state.groups.find((item) => item.id === groupId);
    if (!group || isTournamentFormat(group) || isFixedPairLeagueFormat(group) || group.scheduleFormat === "team-battle") return;
    const groupMatches = matchesByGroupId.get(groupId) ?? [];
    const nextNumber = groupMatches.length + 1;
    const matchId = `${groupId}-manual-${Date.now()}`;
    pendingScrollMatchId.current = `match-${matchId}`;
    setOpenPlayerEditMatchId(matchId);
    updateLocal({
      ...state,
      matches: [
        ...state.matches,
        {
          id: matchId,
          tournamentId: tournament.id,
          groupId,
          matchNumber: nextNumber,
          sideAPlayerIds: ["", ""],
          sideBPlayerIds: ["", ""],
          sideAScore: null,
          sideBScore: null,
          status: "scheduled",
          sortOrder: nextNumber,
          courtNumber: selectedCourtNumbersForSchedule()[(nextNumber - 1) % Math.max(selectedCourtNumbersForSchedule().length, 1)] ?? null
        }
      ]
    });
  }

  function updateMatch(matchId: string, patch: Partial<Match>) {
    if (isCompleted) return;
    updateLocal({
      ...state,
      matches: state.matches.map((match) => match.id === matchId ? { ...match, ...patch } : match)
    });
    if ("sideAScore" in patch || "sideBScore" in patch) setScoreSaveStatus(matchId, "dirty");
  }
  function chooseTournamentBye(groupId: string, roundIndex: number, sourceMatchId: string) {
    if (isCompleted || !sourceMatchId) return;
    persist({
      ...state,
      matches: selectTournamentBye(state.matches, groupId, roundIndex, sourceMatchId)
    });
  }

  function deleteMatch(matchId: string) {
    if (isCompleted) return;
    if (!window.confirm("경기를 삭제할까요? 입력된 점수도 함께 삭제됩니다.")) return;
    updateLocal({ ...state, matches: state.matches.filter((match) => match.id !== matchId) });
  }

  function replacePlayer(matchId: string, side: "A" | "B", index: number, memberId: string) {
    if (isCompleted) return;
    const selectedMatch = state.matches.find((match) => match.id === matchId);
    if (!selectedMatch) return;

    const sourceKey = side === "A" ? "sideAPlayerIds" : "sideBPlayerIds";
    const sourceIds = [...selectedMatch[sourceKey]];
    const sourceMemberId = sourceIds[index];
    if (!sourceMemberId || sourceMemberId === memberId) return;

    const targetSide = selectedMatch.sideAPlayerIds.includes(memberId)
      ? "A"
      : selectedMatch.sideBPlayerIds.includes(memberId)
        ? "B"
        : null;
    if (!targetSide || targetSide === side) return;

    const targetKey = targetSide === "A" ? "sideAPlayerIds" : "sideBPlayerIds";
    const targetIds = [...selectedMatch[targetKey]];
    const targetIndex = targetIds.indexOf(memberId);
    if (targetIndex === -1) return;

    sourceIds[index] = memberId;
    targetIds[targetIndex] = sourceMemberId;

    const updatedMatch = {
      ...selectedMatch,
      sideAPlayerIds: sourceKey === "sideAPlayerIds" ? sourceIds : targetIds,
      sideBPlayerIds: sourceKey === "sideBPlayerIds" ? sourceIds : targetIds
    };

    persist({
      ...state,
      matches: state.matches.map((match) => match.id === matchId ? updatedMatch : match)
    });
  }

  function assignedMembersForMatch(match: Match, side: "A" | "B", selected?: string) {
    const opposingIds = side === "A" ? match.sideBPlayerIds : match.sideAPlayerIds;
    return [selected, ...opposingIds]
      .filter((id): id is string => Boolean(id))
      .map((id) => membersById.get(id))
      .filter((member): member is typeof state.members[number] => Boolean(member));
  }

  function teamBattleReplacementCandidateGroups(roundMatches: Match[], match: Match, side: "A" | "B", selected?: string) {
    const sideKey = side === "A" ? "sideAPlayerIds" : "sideBPlayerIds";
    const playingIds = new Set(roundMatches.flatMap((roundMatch) => [...roundMatch.sideAPlayerIds, ...roundMatch.sideBPlayerIds]));
    const teamMembers = side === "A" ? blueTeamMembers : whiteTeamMembers;
    const tournamentParticipantIdSet = new Set(tournamentParticipantIds);
    const temporaryMembers = [
      ...tournamentParticipants.filter((member) => !teamAssignment[member.id]),
      ...state.members.filter((member) => !member.deleted && member.active !== false && !tournamentParticipantIdSet.has(member.id))
    ];
    const selectedMember = selected ? membersById.get(selected) : undefined;
    const otherMatchCandidates = new Map<string, { member: typeof state.members[number]; matchNumber: number }>();

    roundMatches
      .filter((roundMatch) => roundMatch.id !== match.id && roundMatch.status !== "completed")
      .forEach((roundMatch) => {
        roundMatch[sideKey].forEach((memberId) => {
          const member = membersById.get(memberId);
          if (member) otherMatchCandidates.set(member.id, { member, matchNumber: roundMatch.matchNumber });
        });
      });

    const groups: Array<{ label: string; candidates: Array<{ member: typeof state.members[number]; matchNumber?: number }> }> = [
      { label: "현재 선수", candidates: selectedMember ? [{ member: selectedMember }] : [] },
      { label: "다른 경기 출전", candidates: [...otherMatchCandidates.values()] },
      { label: "휴식 선수", candidates: teamMembers.filter((member) => !playingIds.has(member.id)).map((member) => ({ member })) },
      { label: "미참여 선수", candidates: temporaryMembers.filter((member) => !playingIds.has(member.id)).map((member) => ({ member })) }
    ];

    return groups.filter((group) => group.candidates.length > 0);
  }

  function replaceTeamBattlePlayer(matchId: string, roundMatches: Match[], side: "A" | "B", index: number, memberId: string) {
    if (isCompleted) return;
    const selectedMatch = state.matches.find((match) => match.id === matchId);
    if (!selectedMatch || selectedMatch.status === "completed") return;
    const sourceKey = side === "A" ? "sideAPlayerIds" : "sideBPlayerIds";
    const sourceIds = [...selectedMatch[sourceKey]];
    const sourceMemberId = sourceIds[index];
    if (!sourceMemberId || sourceMemberId === memberId) return;

    const targetMatch = roundMatches.find((roundMatch) =>
      roundMatch.id !== matchId &&
      roundMatch.status !== "completed" &&
      roundMatch[sourceKey].includes(memberId)
    );
    if (targetMatch) {
      const targetIds = [...targetMatch[sourceKey]];
      const targetIndex = targetIds.indexOf(memberId);
      sourceIds[index] = memberId;
      targetIds[targetIndex] = sourceMemberId;
      persist({
        ...state,
        matches: state.matches.map((match) => {
          if (match.id === matchId) return { ...match, [sourceKey]: sourceIds };
          if (match.id === targetMatch.id) return { ...match, [sourceKey]: targetIds };
          return match;
        })
      });
      return;
    }

    const expectedTeam: TeamSide = side === "A" ? "blue" : "white";
    const roundPlayingIds = new Set(roundMatches.flatMap((match) => [...match.sideAPlayerIds, ...match.sideBPlayerIds]));
    const replacementMember = membersById.get(memberId);
    const canUseTemporaryMember = Boolean(replacementMember && !replacementMember.deleted && replacementMember.active !== false && !teamAssignment[memberId]);
    if ((teamAssignment[memberId] !== expectedTeam && !canUseTemporaryMember) || roundPlayingIds.has(memberId)) return;

    sourceIds[index] = memberId;
    persist({
      ...state,
      matches: state.matches.map((match) => match.id === matchId ? { ...match, [sourceKey]: sourceIds } : match)
    });
  }

  function orderSlotLabel(index: number) {
    if (index < 9) return String(index + 1);
    return String.fromCharCode(65 + index - 9);
  }

  function groupSeedSlots(group: TournamentGroup) {
    return group.scheduleFormat === "hanul-aa" ? new Set(getHanulSeedSlots(groupParticipants(group.id).length)) : new Set<string>();
  }

  function renderGroupTabs(activeGroupId: string | undefined, onChange: (groupId: string) => void) {
    if (state.groups.length <= 1) return null;
    return (
      <div className="group-tab-row" aria-label="그룹 선택">
        {state.groups.map((group) => (
          <button className={`group-tab ${activeGroupId === group.id ? "active" : ""}`} key={group.id} onClick={() => onChange(group.id)} type="button">
            {group.name}
          </button>
        ))}
      </div>
    );
  }

  const hasInvalidGroup = state.groups.some((group) => groupValidation(group));
  const visibleDrawGroups = useMemo(() => state.groups.filter((group) => state.groups.length === 1 || group.id === drawGroupId), [drawGroupId, state.groups]);
  const visibleRankingGroups = useMemo(() => rankings.filter(({ group }) => state.groups.length === 1 || group.id === rankingGroupId), [rankingGroupId, rankings, state.groups.length]);
  const duplicateTeamsByGroupId = useMemo(() => {
    return new Map(state.groups.map((group) => {
      const teams = new Map<string, { label: string; matchOrders: number[] }>();
      for (const match of [...(matchesByGroupId.get(group.id) ?? [])].sort((a, b) => a.sortOrder - b.sortOrder)) {
        for (const playerIds of [match.sideAPlayerIds, match.sideBPlayerIds]) {
          if (playerIds.length !== 2) continue;
          const key = [...playerIds].sort().join(":");
          const existing = teams.get(key);
          if (existing) {
            existing.matchOrders.push(match.sortOrder);
          } else {
            teams.set(key, {
              label: playerIds.map((id) => membersById.get(id)?.name ?? "미정").join(" · "),
              matchOrders: [match.sortOrder]
            });
          }
        }
      }
      return [group.id, [...teams.values()].filter((team) => team.matchOrders.length > 1)] as const;
    }));
  }, [matchesByGroupId, membersById, state.groups]);

  return (
    <AppShell title="대회 상세관리" subtitle="참가자 편성, 대진표, 순위를 관리합니다" active="tournaments" clubSlug={clubSlug}>
      {isSaving ? <LoadingOverlay label="저장 중..." /> : null}
      <div className="page">
        <section className="hero-card">
          <span className="badge">{isCompleted ? "완료 대회" : "현재 대회"}</span>
          <h1>{tournament.name}</h1>
          <p className="lead">{tournament.date} · {state.groups.length}개 그룹 · {state.matches.length}경기</p>
          <div className="today-card-top" style={{ marginTop: 12 }}>
            <StatusBadge status={tournament.status} />
            <button className="ghost-button" onClick={shareTournament} type="button">
              <Share2 size={18} />
              카카오톡 공유
            </button>
          </div>
          {isCompleted && <p className="notice-text" style={{ marginTop: 12 }}>완료된 대회는 날짜만 수정할 수 있습니다. 날짜를 오늘 또는 이후로 바꾸면 다시 수정할 수 있습니다.</p>}
        </section>

        <section className="section-card">
          <div className="tab-row">
            {[["setup", "설정"], ["draw", "대진표"], ["ranking", "순위"]].map(([id, label]) => (
              <button className={`tab-button ${activeTab === id ? "active" : ""}`} key={id} onClick={() => setActiveTab(id as TabId)} type="button">
                {label}
              </button>
            ))}
          </div>
        </section>

        {activeTab === "setup" && (
          <div className="tab-panel stack" key="setup">
            {scheduleLocked && <p className="notice-text event-lock-notice" role="note">이벤트 대회는 수정 불가합니다. J.H.Park에게 문의해주세요.</p>}
            <fieldset className="locked-setup-fields stack" disabled={scheduleLocked}>
            <section className="section-card stack">
              <div className="today-card-top"><strong className="section-head">대회 기본정보</strong><span className="group-format-badge">{tournamentType === "general" ? "일반 대회" : tournamentType === "team-battle" ? "청백전 · 단체전" : "토너먼트"}</span></div>
              <label className="field boxed-field">
                <span>대회명</span>
                <input disabled={isCompleted} onBlur={(event) => persistName(tournament.id, event.target.value)} onChange={(event) => updateTournament("name", event.target.value)} value={tournament.name} />
              </label>
              <label className="field boxed-field">
                <span>날짜</span>
                <input onChange={(event) => updateTournament("date", event.target.value)} type="date" value={tournament.date} />
              </label>

            </section>

            <section className="section-card stack">
              <button className="accordion-head" onClick={() => setParticipantPanelOpen((open) => !open)} type="button">
                <span>
                  <strong className="section-head">대회 참가자</strong>
                  <small>선택됨 {tournamentParticipants.length}명</small>
                </span>
                <b>{scheduleLocked ? "참가자 명단" : participantPanelOpen ? "닫기" : "참가자등록"}</b>
              </button>
              {(participantPanelOpen || scheduleLocked) && (
                <div className="stack soft-enter">
                  <div className="participant-bulk-actions" aria-label="성별 참가자 선택">
                    <button disabled={isCompleted} onClick={() => selectTournamentParticipantsByGender("male")} type="button">
                      남자만 선택
                    </button>
                    <button disabled={isCompleted} onClick={() => selectTournamentParticipantsByGender("female")} type="button">
                      여자만 선택
                    </button>
                  </div>
                  <div className="participant-list">
                    {state.members.filter((member) => !member.deleted || tournamentParticipantIds.includes(member.id)).map((member) => {
                      const selected = tournamentParticipantIds.includes(member.id);
                      return (
                        <button className={`participant-option ${selected ? "active" : ""}`} disabled={isCompleted} key={member.id} onClick={() => toggleTournamentParticipant(member.id)} type="button">
                          <span className="check-mark">{selected ? "✓" : ""}</span>
                          <strong>{member.name}</strong>
                          <small>{selected ? "참가" : "미참가"}</small>
                        </button>
                      );
                    })}
                  </div>
                  <button className="primary-button participant-done-button" disabled={isCompleted} onClick={() => setParticipantPanelOpen(false)} type="button">
                    참가자 선택완료
                  </button>
                </div>
              )}
              {!participantPanelOpen && !scheduleLocked && (
                <div className="selected-summary">
                  {tournamentParticipants.length > 0 ? tournamentParticipants.map((member) => <span key={member.id}>{member.name}</span>) : <p>참가자를 먼저 선택해주세요.</p>}
                </div>
              )}
            </section>

            {tournamentType === "team-battle" && (
              <section className="section-card stack team-battle-setup">
                <div className="today-card-top team-battle-setup-head">
                  <strong className="section-head">청백 팀 편성</strong>
                  <button className="ghost-button team-balance-button" disabled={isCompleted || tournamentParticipants.length < 4} onClick={autoBalanceTeams} type="button">자동밸런스</button>
                </div>
                <p className="notice-text team-battle-setup-notice">{clubSlug === "pt" ? "회원 레벨 1~7을 기준으로 전력을 맞춥니다. 설정한 라운드와 코트 수에 맞춰 모든 코트를 채웁니다." : "회원 등급 A/B/C/D를 기준으로 전력을 맞춥니다. 설정한 라운드와 코트 수에 맞춰 모든 코트를 채웁니다."}</p>
                {unassignedTeamMembers.length > 0 && <p className="notice-text">미배정 {unassignedTeamMembers.length}명 · 자동 밸런스를 누르거나 아래에서 팀을 선택해주세요.</p>}
                <div className="team-battle-grid">
                  {(["blue", "white"] as const).map((side) => {
                    const teamMembers = side === "blue" ? blueTeamMembers : whiteTeamMembers;
                    return (
                      <div className={`team-roster-card ${side}`} key={side}>
                        <div className="today-card-top">
                          <strong>{side === "blue" ? "청팀" : "백팀"}</strong>
                          <span>{teamMembers.length}명</span>
                        </div>
                        <div className="participant-list">
                          {teamMembers.map((member) => (
                            <button className="participant-option active" disabled={isCompleted} key={member.id} onClick={() => setTeamSide(member.id, side === "blue" ? "white" : "blue")} type="button">
                              <span className="order-badge">{getMemberLevelLabel(member.level, clubSlug)}</span>
                              <strong>{member.name}</strong>
                              <small>{side === "blue" ? "백팀으로 이동" : "청팀으로 이동"}</small>
                            </button>
                          ))}
                          {teamMembers.length === 0 && <p className="notice-text">배정된 선수가 없습니다.</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="court-assignment-box">
                  <div className="court-toggle-row">
                    <div>
                      <strong>코트 설정</strong>
                      <p className="notice-text">선택한 라운드마다 모든 코트를 사용합니다. 같은 라운드에는 동일 선수가 중복 출전하지 않습니다.</p>
                    </div>
                  </div>
                  <div className="court-assignment-detail">
                    <div className="court-setting-fields">
                      <label className="mini-select-field court-count-field">
                        <span>라운드 수</span>
                        <select aria-label="라운드 수" className="select-input" disabled={isCompleted} onChange={(event) => setTeamBattleRoundCount(Number(event.target.value))} value={teamBattleRoundCount}>
                          {TEAM_BATTLE_ROUND_OPTIONS.map((count) => (
                            <option key={count} value={count}>{count}라운드</option>
                          ))}
                        </select>
                      </label>
                      <label className="mini-select-field court-count-field">
                        <span>코트 개수</span>
                        <select aria-label="코트 개수" className="select-input" disabled={isCompleted} onChange={(event) => updateCourtCount(Number(event.target.value))} value={courtCount}>
                          {COURT_COUNT_OPTIONS.map((count) => (
                            <option disabled={maximumTeamBattleCourtCount > 0 && count > maximumTeamBattleCourtCount} key={count} value={count}>{count}개</option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <p className="notice-text">총 {teamBattleRoundCount * courtCount}경기 · 라운드마다 {courtCount}경기</p>
                    <div className="court-number-selection-head">
                      <strong>사용할 코트 번호 선택</strong>
                      <span>{selectedCourtNumbers.length}/{courtCount}개 선택</span>
                    </div>
                    <p className="court-number-selection-guide">아래 번호를 눌러 실제 사용할 코트를 선택하세요.</p>
                    <div className="court-number-grid" aria-label="코트 번호 선택">
                      {COURT_NUMBER_OPTIONS.map((courtNumber) => {
                        const selectedIndex = selectedCourtNumbers.indexOf(courtNumber);
                        const selected = selectedIndex >= 0;
                        return (
                          <button
                            aria-label={`코트 ${courtNumber} ${selected ? `${selectedIndex + 1}순서 선택됨` : "선택"}`}
                            className={`court-number-option ${selected ? "active" : ""}`}
                            disabled={isCompleted}
                            key={courtNumber}
                            onClick={() => toggleCourtNumber(courtNumber)}
                            type="button"
                          >
                            <strong>{courtNumber}</strong>
                            <small aria-hidden="true">{selected ? selectedIndex + 1 : ""}</small>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <div className="team-battle-game-plan">
                  <div className="team-battle-game-plan-head">
                    <div>
                      <strong>개인별 경기 수</strong>
                      <small>{teamBattleRoundCount}라운드 × {courtCount}코트 · 총 {teamBattleRoundCount * courtCount}경기</small>
                    </div>
                    <span>팀별 {teamBattleTotalAppearances}회 출전</span>
                  </div>
                  <div className="team-battle-game-plan-grid">
                    {(["blue", "white"] as const).map((side) => {
                      const members = side === "blue" ? blueTeamMembers : whiteTeamMembers;
                      const plan = teamBattleSidePlans[side];
                      const selectedIds = teamBattleExtraGamePlayerIds[side];
                      const selectionRule = teamBattleSelectionRule(members.length, plan.baseGames, plan.extraGamePlayerCount);
                      return (
                        <div className={`team-game-selector ${side}`} key={side}>
                          <div className="today-card-top">
                            <strong>{side === "blue" ? "청팀" : "백팀"}</strong>
                            <small>{selectionRule.selectionCount > 0 ? `${selectionRule.selectedGames}경기 선수 ${selectedIds.length}/${selectionRule.selectionCount}명 선택` : `전원 ${plan.baseGames}경기`}</small>
                          </div>
                          {selectionRule.selectionCount > 0 && (
                            <>
                              <p>{selectionRule.selectionCount}명을 선택하면 선택 선수는 {selectionRule.selectedGames}경기, 나머지는 {selectionRule.unselectedGames}경기를 출전합니다.</p>
                              <div className="team-game-player-options">
                                {members.map((member) => {
                                  const selected = selectedIds.includes(member.id);
                                  return (
                                    <button aria-pressed={selected} className={selected ? "active" : ""} disabled={isCompleted} key={member.id} onClick={() => toggleTeamBattleExtraGamePlayer(side, member.id)} type="button">
                                      <strong>{member.name}</strong>
                                      <small>{selected ? `${selectionRule.selectedGames}경기` : `${selectionRule.unselectedGames}경기`}</small>
                                    </button>
                                  );
                                })}
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
                {unassignedTeamMembers.length > 0 && (
                  <div className="participant-list">
                    {unassignedTeamMembers.map((member) => (
                      <div className="participant-option" key={member.id}>
                        <span className="order-badge">{getMemberLevelLabel(member.level, clubSlug)}</span>
                        <strong>{member.name}</strong>
                        <span className="team-assign-actions">
                          <button disabled={isCompleted} onClick={() => setTeamSide(member.id, "blue")} type="button">청팀</button>
                          <button disabled={isCompleted} onClick={() => setTeamSide(member.id, "white")} type="button">백팀</button>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {teamBattleScheduleError && <p className="notice-text error-text">{teamBattleScheduleError}</p>}
                <button className="primary-button" disabled={isCompleted || blueTeamMembers.length < 2 || whiteTeamMembers.length < 2 || unassignedTeamMembers.length > 0 || !teamBattleSelectionComplete || !teamBattleCourtCountValid} onClick={generateAllSchedules} type="button">
                  <ClipboardList size={18} />
                  {state.matches.length > 0 ? "기존 대진 초기화 후 다시 생성" : "청백전 대진 생성"}
                </button>
              </section>
            )}

            {tournamentType !== "team-battle" && (<section className="section-card stack">
              <div className="today-card-top">
                <strong className="section-head" style={{ marginBottom: 0 }}>{tournamentType === "tournament" ? "토너먼트 구성" : "그룹 편성"}</strong>
                <button className="ghost-button" disabled={isCompleted || ((tournamentType === "tournament" || state.groups.some((group) => group.scheduleFormat === "random" || group.scheduleFormat === "fixed-pair-league")) && state.groups.length > 0)} onClick={addGroup} type="button">
                  <Plus size={18} />
                  {tournamentType === "tournament" ? "토너먼트 구성" : "그룹 추가"}
                </button>
              </div>

              {state.groups.length > 1 && !scheduleLocked && (
                <div className="setup-group-tab-grid" role="tablist" aria-label="편성 그룹 선택">
                  {state.groups.map((group) => {
                    const active = setupGroupId === group.id;
                    return (
                      <button
                        aria-selected={active}
                        className={`setup-group-tab ${active ? "active" : ""}`}
                        key={group.id}
                        onClick={() => setActiveSetupGroupId(group.id)}
                        role="tab"
                        type="button"
                      >
                        <strong>{group.name}</strong>
                        <span>{groupParticipants(group.id).length}명</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {visibleSetupGroups.map((group) => {
                const participants = groupParticipants(group.id);
                const selectedIds = state.groupMemberIds[group.id] ?? [];
                const selectedMembers = selectedIds.map((id) => state.members.find((member) => member.id === id)).filter((member): member is typeof state.members[number] => Boolean(member));
                const unselectedMembers = unassignedGroupMembers.filter((member) => !member.deleted);
                const seedSlots = groupSeedSlots(group);
                const validation = groupValidation(group);

                return (
                  <div className={`tournament-card stack group-setup-card ${state.groups.length > 1 ? "multi-group" : ""}`} key={group.id}>
                    <div className="group-setup-head">
                      <div className="group-title-block">
                        {state.groups.length > 1 && <span className="group-number-badge">{group.name.replace("조", "")}</span>}
                        <div>
                          <strong>{displayGroupName(group)}</strong>
                          <small>{getScheduleFormatLabel(group.scheduleFormat)}</small>
                        </div>
                      </div>
                      <span className="group-chip">{participants.length}명</span>
                    </div>
                    <div className="format-field">
                      <span>대진방식 선택</span>
                      <div className={`format-row ${group.scheduleFormat === "random" || isFixedPairLeagueFormat(group) || isTournamentFormat(group) ? "single" : ""}`}>
                      <select className="select-input" disabled={isCompleted} onChange={(event) => updateGroupFormat(group.id, event.target.value as TournamentGroup["scheduleFormat"])} value={group.scheduleFormat}>
                        {tournamentType === "tournament" ? (
                          <>
                            <option value="fixed-pair-tournament">복식 토너먼트</option>
                            <option value="single-tournament">단식 토너먼트</option>
                          </>
                        ) : (
                          <>
                            <option value="kdk-v2010">KDK-V2010 방식</option>
                            <option value="hanul-aa">한울AA KDK 방식</option>
                            <option value="random">랜덤 KDK 방식</option>
                            <option value="fixed-pair-league">고정 페어 리그</option>
                          </>
                        )}
                      </select>
                      {group.scheduleFormat !== "random" && !isFixedPairLeagueFormat(group) && !isTournamentFormat(group) && (
                        <button className="icon-help-button" aria-label="대진방식 보기" onClick={() => openHelpImage(group.scheduleFormat)} type="button">
                          <HelpCircle size={20} />
                        </button>
                      )}
                      </div>
                    </div>
                    {validation && <p className="notice-text">{validation}</p>}
                    {group.scheduleFormat === "random" && (() => {
                      const minimumGames = group.randomGamesPerPlayer ?? 2;
                      const extraCount = randomExtraGameCount(selectedMembers.length, minimumGames);
                      const selectedExtraIds = randomExtraGamePlayerIds(group, selectedMembers);
                      return (
                        <div className="random-kdk-settings">
                          <label className="mini-select-field">
                            <span>1인 최소 경기 수</span>
                            <select className="select-input" disabled={isCompleted} onChange={(event) => updateRandomGroupOption(group.id, "randomGamesPerPlayer", Number(event.target.value))} value={minimumGames}>
                              {RANDOM_GAMES_PER_PLAYER_OPTIONS.map((count) => (
                                <option key={count} value={count}>{count}경기</option>
                              ))}
                            </select>
                          </label>
                          <p className="notice-text">참가자별 최소 경기 수를 맞추고, 추가 경기 대상은 아래에서 선택합니다.</p>
                          {extraCount > 0 && (
                            <div className="team-battle-game-plan">
                              <div className="team-battle-game-plan-head">
                                <div>
                                  <strong>추가 경기 선수</strong>
                                  <small>{extraCount}명을 선택하면 선택 선수는 {minimumGames + 1}경기, 나머지는 {minimumGames}경기를 출전합니다.</small>
                                </div>
                                <span>{selectedExtraIds.length}/{extraCount}명 선택</span>
                              </div>
                              <div className="team-battle-game-plan-grid single">
                                <div className="team-game-selector">
                                  <div className="team-game-member-grid">
                                    {selectedMembers.map((member) => {
                                      const selected = selectedExtraIds.includes(member.id);
                                      return (
                                        <button aria-pressed={selected} className={selected ? "active" : ""} disabled={isCompleted} key={member.id} onClick={() => toggleRandomExtraGamePlayer(group.id, member.id)} type="button">
                                          <strong>{member.name}</strong>
                                          <small>{selected ? `${minimumGames + 1}경기` : `${minimumGames}경기`}</small>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}                    <div className="field-label-row">
                      <strong>참여자 순번</strong>
                      <span>드래그해서 순서를 변경</span>
                    </div>
                    {group.scheduleFormat === "hanul-aa" && seedSlots.size > 0 && (
                      <p className="notice-text">한울AA 시드 자리: {[...seedSlots].join(", ")}번. 해당 순번 위치가 자동 시드자로 적용됩니다.</p>
                    )}
                    {(isTournamentFormat(group) || isFixedPairLeagueFormat(group)) && (
                      <div className="fixed-pair-tools">
                        <button className="ghost-button" disabled={isCompleted || (group.scheduleFormat === "fixed-pair-league" ? selectedMembers.length !== 10 : selectedMembers.length < (group.scheduleFormat === "single-tournament" ? 2 : 4))} onClick={() => randomizeTournamentSeeds(group.id)} type="button">
                          {group.scheduleFormat === "single-tournament" ? "랜덤 시드 생성" : "랜덤 페어 구성"}
                        </button>
                        <p className="notice-text">
                          {group.scheduleFormat === "single-tournament"
                            ? "아래 순번을 토너먼트 시드로 사용합니다. 드래그로 순서를 바꿔 시드를 수정하세요."
                            : "아래 순번을 2명씩 묶어 한 페어로 사용합니다. 드래그로 순서를 바꾸거나 회원을 추가/제외해서 페어를 수정하세요."}
                        </p>
                      </div>
                    )}
                    <div className="group-selected-member-grid">
                      {selectedMembers.map((member, index) => {
                        const slot = orderSlotLabel(index);
                        const isSeedSlot = seedSlots.has(slot);
                        const seedNote = tournamentSeedNote(group, index, selectedMembers.length);
                        return (
                          <button
                            className={`participant-option sortable-participant ${isSeedSlot ? "seed-slot" : ""}`}
                            disabled={isCompleted}
                            draggable={!isCompleted && !scheduleLocked}
                            key={member.id}
                            onClick={() => toggleGroupMember(group.id, member.id)}
                            onDragEnd={() => setDraggingMember(null)}
                            onDragOver={(event) => event.preventDefault()}
                            onDragStart={() => setDraggingMember({ groupId: group.id, memberId: member.id })}
                            onDrop={(event) => {
                              event.preventDefault();
                              if (draggingMember?.groupId === group.id) moveGroupMember(group.id, draggingMember.memberId, member.id);
                              setDraggingMember(null);
                            }}
                            type="button"
                          >
                            <span className="order-badge">{slot}</span>
                            <strong>{member.name}</strong>
                            {seedNote && <small>{seedNote}</small>}
                          </button>
                        );
                      })}
                    </div>
                    <div className="unassigned-participant-panel">
                      <div className="unassigned-participant-head">
                        <strong>미배정 선수</strong>
                        <span>{unselectedMembers.length}명</span>
                      </div>
                      {unselectedMembers.length > 0 ? (
                        <div className="unassigned-participant-grid">
                          {unselectedMembers.map((member) => (
                            <button className="participant-option participant-add-option" disabled={isCompleted} key={member.id} onClick={() => toggleGroupMember(group.id, member.id)} type="button">
                              <span className="check-mark"><Plus size={16} /></span>
                              <strong>{member.name}</strong>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="notice-text">모든 참가자가 그룹에 배정되었습니다.</p>
                      )}
                    </div>
                    {isFixedPairLeagueFormat(group) && selectedMembers.length > 0 && (
                      <div className="fixed-pair-preview">
                        {Array.from({ length: Math.ceil(selectedMembers.length / tournamentTeamSize(group)) }, (_, index) => {
                          const pair = selectedMembers.slice(index * tournamentTeamSize(group), index * tournamentTeamSize(group) + tournamentTeamSize(group));
                          const isAutoBye = pair.length === tournamentTeamSize(group) && isInitialAutoByeTeam(group, index * tournamentTeamSize(group), selectedMembers.length);
                          return (
                            <div className={`fixed-pair-card ${pair.length < tournamentTeamSize(group) ? "incomplete" : ""} ${isAutoBye ? "auto-bye" : ""}`} key={`pair-${index}`}>
                              <span>
                                {group.scheduleFormat === "single-tournament" ? `${index + 1}시드` : `${index + 1}페어`}
                                {isAutoBye && <em className="auto-bye-badge">자동 부전승</em>}
                              </span>
                              <strong>{pair.map((member) => member.name).join(" · ") || "선수 미정"}</strong>
                              {pair.length < tournamentTeamSize(group) && <small>한 명 더 필요</small>}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {!isTournamentFormat(group) && <button className="danger-button" disabled={isCompleted} onClick={() => deleteGroup(group.id)} type="button">
                      <Trash2 size={18} />
                      그룹 삭제
                    </button>}
                  </div>
                );
              })}
              {canUseCourtAssignment && (
                <div className="court-assignment-box">
                  <div className="court-toggle-row">
                    <div>
                      <strong>코트 배정</strong>
                      <p className="notice-text">사용함을 켜면 경기 순서대로 코트 번호가 자동 배정됩니다.</p>
                    </div>
                    <button
                      className={`toggle-pill ${courtAssignmentEnabled ? "active" : ""}`}
                      disabled={isCompleted}
                      onClick={toggleCourtAssignment}
                      type="button"
                    >
                      {courtAssignmentEnabled ? "사용함" : "사용안함"}
                    </button>
                  </div>
                  {courtAssignmentEnabled && (
                    <div className="court-assignment-detail">
                      <label className="mini-select-field court-count-field">
                        <span>코트 개수</span>
                        <select className="select-input" disabled={isCompleted} onChange={(event) => updateCourtCount(Number(event.target.value))} value={courtCount}>
                          {COURT_COUNT_OPTIONS.map((count) => (
                            <option key={count} value={count}>{count}개</option>
                          ))}
                        </select>
                      </label>
                      <div className="court-number-selection-head">
                        <strong>사용할 코트 번호 선택</strong>
                        <span>{selectedCourtNumbers.length}/{courtCount}개 선택</span>
                      </div>
                      <p className="court-number-selection-guide">아래 번호를 눌러 실제 사용할 코트를 선택하세요.</p>
                      <div className="court-number-grid" aria-label="코트 번호 선택">
                        {COURT_NUMBER_OPTIONS.map((courtNumber) => {
                          const selectedIndex = selectedCourtNumbers.indexOf(courtNumber);
                          const selected = selectedIndex >= 0;
                          return (
                            <button
                              aria-label={`코트 ${courtNumber} ${selected ? `${selectedIndex + 1}순서 선택됨` : "선택"}`}
                              className={`court-number-option ${selected ? "active" : ""}`}
                              disabled={isCompleted}
                              key={courtNumber}
                              onClick={() => toggleCourtNumber(courtNumber)}
                              type="button"
                            >
                              <strong>{courtNumber}</strong>
                              <small aria-hidden="true">{selected ? selectedIndex + 1 : ""}</small>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
              {state.matches.length > 0 && (
                <p className="notice-text">대진표 생성을 다시 누르면 기존 경기결과는 초기화되고 새로운 대진표가 만들어집니다.</p>
              )}
              <button className="primary-button" disabled={isCompleted || state.groups.length === 0 || hasInvalidGroup} onClick={generateAllSchedules} type="button">
                <ClipboardList size={18} />
                대진표 생성
              </button>
            </section>)}
            </fieldset>
          </div>
        )}

        {activeTab === "draw" && (
          <section className="section-card stack tab-panel" id="draw" key="draw">
            <strong className="section-head">대진표 관리</strong>
            {renderGroupTabs(drawGroupId, setActiveDrawGroupId)}
            {visibleDrawGroups.map((group) => (
              <div className="stack" key={group.id}>
                <div className="today-card-top">
                  <div className="draw-group-title">
                    <strong>{displayGroupName(group)}</strong>
                    {!scheduleLocked && <span className="group-format-badge">{getScheduleFormatLabel(group.scheduleFormat)}</span>}
                  </div>
                  {!scheduleLocked && group.scheduleFormat !== "team-battle" && !isTournamentFormat(group) && !isFixedPairLeagueFormat(group) && <button className="ghost-button" disabled={isCompleted} onClick={() => addMatch(group.id)} type="button">
                    <Plus size={18} />
                    경기 추가
                  </button>}
                </div>
                {group.scheduleFormat === "team-battle" && <TeamBattleRoster blueMembers={blueTeamMembers} whiteMembers={whiteTeamMembers} />}
                {(group.scheduleFormat === "team-battle"
                  ? groupTeamBattleMatchesByRound(matchesByGroupId.get(group.id) ?? [])
                  : groupMatchesByExplicitRound(matchesByGroupId.get(group.id) ?? []).length > 0
                    ? groupMatchesByExplicitRound(matchesByGroupId.get(group.id) ?? [])
                    : [{ roundNumber: 0, matches: [...(matchesByGroupId.get(group.id) ?? [])].sort((a, b) => a.sortOrder - b.sortOrder) }]
                ).map((round, roundIndex, rounds) => (
                  <section className={group.scheduleFormat === "team-battle" ? "team-battle-round-card admin-team-battle-round-card" : round.roundNumber > 0 ? "explicit-round-card stack" : "stack"} key={`round-${round.roundNumber}`}>
                    {group.scheduleFormat === "team-battle" && (
                      <div className="team-battle-round-card-head">
                        <span>ROUND {String(roundIndex + 1).padStart(2, "0")}</span>
                        <strong>{roundIndex + 1}라운드</strong>
                        <small>{round.matches.length}경기</small>
                        {!scheduleLocked && (
                          <div className="round-order-controls" aria-label={`${roundIndex + 1}라운드 순서 변경`}>
                            <button aria-label={`${roundIndex + 1}라운드 위로 이동`} className="round-order-button" disabled={isCompleted || roundIndex === 0} onClick={() => moveTeamBattleRound(group.id, round.roundNumber, "up")} type="button">
                              <ChevronUp size={16} />
                            </button>
                            <button aria-label={`${roundIndex + 1}라운드 아래로 이동`} className="round-order-button" disabled={isCompleted || roundIndex === rounds.length - 1} onClick={() => moveTeamBattleRound(group.id, round.roundNumber, "down")} type="button">
                              <ChevronDown size={16} />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                    {group.scheduleFormat !== "team-battle" && round.roundNumber > 0 && (
                      <div className="explicit-round-head">
                        <span>ROUND {String(round.roundNumber).padStart(2, "0")}</span>
                        <strong>{round.roundNumber}라운드</strong>
                        <small>{round.matches.length}경기</small>
                      </div>
                    )}
                    <div className={group.scheduleFormat === "team-battle" ? "team-battle-round-match-list" : "stack"}>
                    {round.matches.map((match) => {
                    const byeSelection = isTournamentFormat(group) ? tournamentByeSelections(group).find((selection) => selection.byeMatchId === match.id) : undefined;
                    const scoreSaveStatus = scoreSaveStatusByMatchId[match.id];
                    const scoreOperationPending = scoreSaveStatus === "saving" || scoreSaveStatus === "resetting";
                    const scoreInputDisabled = isCompleted || scoreOperationPending || (isTournamentFormat(group) && !canEnterMatchScore(match));
                    const scoreCanReset = match.status === "completed" && match.sideAScore !== null && match.sideBScore !== null;
                    const scoreReady = match.sideAScore !== null && match.sideBScore !== null;
                    return (
                    <div className="stack" key={match.id}>
                      {!scheduleLocked && byeSelection && (
                        <div className="bye-selection-box">
                          <div>
                            <strong>부전승 선택</strong>
                            <small>{getTournamentRoundLabel(byeSelection.roundIndex + 1, getFixedPairTournamentRoundCounts((matchesByGroupId.get(group.id) ?? []).length))} 진출팀</small>
                          </div>
                          <select
                            className="select-input"
                            disabled={isCompleted}
                            onChange={(event) => chooseTournamentBye(group.id, byeSelection.roundIndex, event.target.value)}
                            value={byeSelection.selectedSourceMatchId ?? ""}
                          >
                            <option value="">부전승 팀 선택</option>
                            {byeSelection.options.map((option) => (
                              <option key={option.sourceMatchId} value={option.sourceMatchId}>
                                {tournamentTeamLabel(option.teamIds)} 부전승
                              </option>
                            ))}
                          </select>
                          <p className="notice-text">이 라운드에서 BYE로 올라갈 팀을 선택합니다. 직전 BYE 팀은 후보에서 제외됩니다.</p>
                        </div>
                      )}
                    <div className="match-edit-card stack" id={`match-${match.id}`}>
                      <div className="tournament-round-head match-edit-head">
                        <span>{group.scheduleFormat === "team-battle" || match.roundNumber ? `${round.roundNumber}라운드` : isTournamentFormat(group) ? tournamentMatchRoundLabel(group, match) : displayGroupName(group)}</span>
                        <strong>경기 {match.sortOrder}</strong>
                        {match.courtNumber && <em className="court-badge tournament-round-court">{courtLabel(match)}</em>}
                      </div>
                      <div className="score-panel vertical">
                        <label>
                          <span className="team-battle-side-name">{group.scheduleFormat === "team-battle" && <em className="team-side-badge blue">청팀</em>}{isTournamentFormat(group) ? tournamentTeamLabel(match.sideAPlayerIds, tournamentSideFallback(group, match, "A")) : teamLabel(match.sideAPlayerIds)}</span>
                          <div className="score-entry">
                            <small>점수</small>
                            <input aria-label="위쪽 팀 점수" className="score-input" disabled={scoreInputDisabled} inputMode="numeric" max={6} min={0} onChange={(event) => updateMatch(match.id, { sideAScore: normalizeMatchScore(event.target.value) })} placeholder="0" type="number" value={match.sideAScore ?? ""} />
                          </div>
                        </label>
                        <div className="score-vs-label">VS</div>
                        <label>
                          <span className="team-battle-side-name">{group.scheduleFormat === "team-battle" && <em className="team-side-badge white">백팀</em>}{isTournamentFormat(group) ? tournamentTeamLabel(match.sideBPlayerIds, tournamentSideFallback(group, match, "B")) : teamLabel(match.sideBPlayerIds)}</span>
                          <div className="score-entry">
                            <small>점수</small>
                            <input aria-label="아래쪽 팀 점수" className="score-input" disabled={scoreInputDisabled} inputMode="numeric" max={6} min={0} onChange={(event) => updateMatch(match.id, { sideBScore: normalizeMatchScore(event.target.value) })} placeholder="0" type="number" value={match.sideBScore ?? ""} />
                          </div>
                        </label>
                      </div>
                      <div className={`score-action-row ${scoreCanReset ? "" : "single"}`}>
                        <button
                          className="primary-button score-complete-button"
                          disabled={scoreInputDisabled || !scoreReady || scoreSaveStatus === "saved"}
                          onClick={() => completeMatchScore(match.id)}
                          type="button"
                        >
                          {scoreSaveStatus === "saving" ? "저장 중..." : scoreSaveStatus === "saved" ? "저장 완료" : scoreSaveStatus === "error" ? "다시 저장" : "점수 입력 완료"}
                        </button>
                        {scoreCanReset && (
                          <button
                            className="danger-button score-reset-button"
                            disabled={isCompleted || scoreOperationPending}
                            onClick={() => resetMatchScore(match.id)}
                            type="button"
                          >
                            {scoreSaveStatus === "resetting" ? "초기화 중..." : scoreSaveStatus === "reset-error" ? "다시 초기화" : "점수 초기화"}
                          </button>
                        )}
                      </div>
                      {!scheduleLocked && group.scheduleFormat === "team-battle" && match.status !== "completed" && (
                        <details className="player-edit-box team-battle-player-edit" onToggle={(event) => setOpenPlayerEditMatchId(event.currentTarget.open ? match.id : null)} open={openPlayerEditMatchId === match.id}>
                          <summary>선수 변경</summary>
                          <p className="notice-text">같은 팀의 다른 경기 선수와 맞교환하거나, 이번 라운드 휴식·미참여 선수로 변경할 수 있습니다.</p>
                          <div className="score-input-grid compact">
                            {(["A", "A", "B", "B"] as const).map((side, slotIndex) => {
                              const sideIndex = slotIndex % 2;
                              const selected = side === "A" ? match.sideAPlayerIds[sideIndex] : match.sideBPlayerIds[sideIndex];
                              const candidateGroups = teamBattleReplacementCandidateGroups(round.matches, match, side, selected);
                              const candidateCount = candidateGroups.reduce((count, group) => count + group.candidates.length, 0);
                              return (
                                <label className="mini-select-field" key={`${side}-${sideIndex}`}>
                                  <span>{side === "A" ? "청팀" : "백팀"} {sideIndex + 1}</span>
                                  <select
                                    aria-label={`${side === "A" ? "청팀" : "백팀"} ${sideIndex + 1} 선수 변경`}
                                    className="select-input"
                                    disabled={isCompleted || candidateCount <= 1}
                                    onChange={(event) => replaceTeamBattlePlayer(match.id, round.matches, side, sideIndex, event.target.value)}
                                    value={selected ?? ""}
                                  >
                                    {candidateGroups.map((group) => (
                                      <optgroup key={group.label} label={group.label}>
                                        {group.candidates.map(({ member, matchNumber }) => (
                                          <option key={member.id} value={member.id}>
                                            {member.name}{matchNumber ? ` · ${matchNumber}경기` : ""}
                                          </option>
                                        ))}
                                      </optgroup>
                                    ))}
                                  </select>
                                </label>
                              );
                            })}
                          </div>
                        </details>
                      )}
                      {scoreSaveStatus && (
                        <p className={`notice-text score-save-status ${scoreSaveStatus}`}>
                          {scoreSaveStatus === "dirty" && "점수를 확인한 후 점수 입력 완료를 눌러주세요."}
                          {scoreSaveStatus === "saving" && "점수를 저장하고 있습니다."}
                          {scoreSaveStatus === "saved" && "점수 저장이 완료되었습니다."}
                          {scoreSaveStatus === "error" && "점수 저장에 실패했습니다. 점수 입력 완료를 다시 눌러주세요."}
                          {scoreSaveStatus === "resetting" && "점수를 초기화하고 있습니다."}
                          {scoreSaveStatus === "reset" && "점수가 초기화되었습니다."}
                          {scoreSaveStatus === "reset-error" && "점수 초기화에 실패했습니다. 다시 초기화해 주세요."}
                        </p>
                      )}
                      {!scheduleLocked && group.scheduleFormat !== "team-battle" && !isTournamentFormat(group) && !isFixedPairLeagueFormat(group) && <details className="player-edit-box" onToggle={(event) => setOpenPlayerEditMatchId(event.currentTarget.open ? match.id : null)} open={openPlayerEditMatchId === match.id}>
                        <summary>선수 변경</summary>
                        <div className="score-input-grid compact">
                          {(["A", "A", "B", "B"] as const).map((side, index) => {
                            const sideIndex = index % 2;
                            const selected = side === "A" ? match.sideAPlayerIds[sideIndex] : match.sideBPlayerIds[sideIndex];
                            return (
                              <label className="mini-select-field" key={`${side}-${sideIndex}`}>
                                <span>{side === "A" ? "위쪽" : "아래쪽"} {sideIndex + 1}</span>
                                <select className="select-input" disabled={isCompleted} onChange={(event) => replacePlayer(match.id, side, sideIndex, event.target.value)} value={selected ?? ""}>
                                  {assignedMembersForMatch(match, side, selected).map((member) => (
                                    <option key={member.id} value={member.id}>{member.name}</option>
                                  ))}
                                </select>
                              </label>
                            );
                          })}
                        </div>
                      </details>}
                      {!scheduleLocked && group.scheduleFormat !== "team-battle" && !isTournamentFormat(group) && !isFixedPairLeagueFormat(group) && <button className="danger-button" disabled={isCompleted} onClick={() => deleteMatch(match.id)} type="button">
                        <Trash2 size={18} />
                        경기 삭제
                      </button>}
                    </div>
                    </div>
                  );
                  })}
                    </div>
                  </section>
                ))}
                {!isFixedPairLeagueFormat(group) && (duplicateTeamsByGroupId.get(group.id) ?? []).length > 0 && (
                  <div className="notice-text duplicate-team-notice" role="status">
                    <strong>중복 팀 안내</strong>
                    <p>같은 팀이 여러 경기에 배정되어 있습니다.</p>
                    <ul>
                      {(duplicateTeamsByGroupId.get(group.id) ?? []).map((team) => (
                        <li key={`${team.label}-${team.matchOrders.join("-")}`}>
                          {team.label} — {team.matchOrders.map((order) => `경기 ${order}`).join(", ")}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </section>
        )}

        {activeTab === "ranking" && (
          <section className="section-card stack tab-panel" key="ranking">
            <strong className="section-head">{tournamentType === "team-battle" ? "청백전 팀 스코어" : visibleRankingGroups.some(({ group }) => isTournamentFormat(group)) ? "토너먼트 결과" : "순위"}</strong>
            {tournamentType !== "team-battle" && renderGroupTabs(rankingGroupId, setActiveRankingGroupId)}
            {visibleRankingGroups.map(({ group, rows, teamRows }) => (
              <div className="stack" key={group.id}>
                <strong>{displayGroupName(group)}</strong>
                {tournamentType === "team-battle" ? (
                  <div className="stack">
                    <div className="team-battle-scoreboard">
                      <div className="team-score"><span>청팀</span><b>{teamBattleResult.blueWins}</b></div>
                      <strong>:</strong>
                      <div className="team-score"><span>백팀</span><b>{teamBattleResult.whiteWins}</b></div>
                    </div>
                    <p className="notice-text">완료 {teamBattleResult.completedMatches}경기{teamBattleResult.draws > 0 ? ` · 무승부 ${teamBattleResult.draws}경기` : ""}</p>
                    <TeamBattleContributionDetails blueMembers={blueTeamMembers} whiteMembers={whiteTeamMembers} matches={state.matches} />
                  </div>
                ) : isTournamentFormat(group) ? (
                  <div className="tournament-result-board">
                    {tournamentRoundSections(group).map((round) => (
                      <div className="tournament-result-round" key={round.label}>
                        <strong>{round.label}</strong>
                        {round.matches.map((match) => (
                          <div className="tournament-result-match" key={match.id}>
                            <span>{tournamentTeamLabel(match.sideAPlayerIds, tournamentSideFallback(group, match, "A"))}</span>
                            <b>{match.sideAScore ?? "-"} : {match.sideBScore ?? "-"}</b>
                            <span>{tournamentTeamLabel(match.sideBPlayerIds, tournamentSideFallback(group, match, "B"))}</span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                ) : isFixedPairLeagueFormat(group) ? (
                  <TeamRankingTable rows={teamRows} />
                ) : (
                  <RankingTable rows={rows} />
                )}
              </div>
            ))}
          </section>
        )}
      </div>

      {helpImage && (
        <div className="modal-backdrop" onClick={() => setHelpImage(null)} role="presentation">
          <div className="help-modal" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label={helpImages[helpImage].title}>
            <div className="today-card-top">
              <strong>{helpImages[helpImage].title}</strong>
              <button className="ghost-button compact" onClick={() => setHelpImage(null)} type="button">닫기</button>
            </div>
            <div className="help-image-viewport">
              <img alt={helpImages[helpImage].title} src={helpImages[helpImage].src} />
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
