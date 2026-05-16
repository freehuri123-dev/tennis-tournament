"use client";

import { ClipboardList, HelpCircle, Plus, Share2, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { AppShell } from "@/components/AppShell";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { RankingTable } from "@/components/RankingTable";
import { StatusBadge } from "@/components/StatusBadge";
import type { ClubSlug } from "@/lib/domain/club";
import { calculateRankings } from "@/lib/domain/ranking";
import { generateInitialMatches, getHanulSeedSlots, getScheduleFormatLabel, validateScheduleParticipants } from "@/lib/domain/schedule";
import { normalizeMatchScore } from "@/lib/domain/score";
import { shareTournamentLink } from "@/lib/domain/share";
import { canAddTournamentGroup, filterGroupMembersByTournamentParticipants, updateTournamentParticipantSelection } from "@/lib/domain/tournament-participants";
import { withDateStatus } from "@/lib/domain/tournament-status";
import type { Match, TournamentGroup } from "@/lib/domain/types";
import { updateMatchScoreAction } from "@/lib/server/actions/match-actions";
import { persistTournamentStateAction, updateTournamentDateAction } from "@/lib/server/actions/tournament-actions";
import type { TournamentState } from "@/lib/store/tournament-store";

type TabId = "setup" | "draw" | "ranking";
type HelpImage = "kdk-v2010" | "hanul-aa" | null;
type ScoreSaveStatus = "saving" | "saved" | "error";

const helpImages = {
  "kdk-v2010": { src: "/KDK-V2010.png", title: "KDK-V2010 대진방식" },
  "hanul-aa": { src: "/한울AA.png", title: "한울AA방식 KDK" }
} as const;

type TournamentManageClientProps = {
  initialState: TournamentState;
  clubSlug: ClubSlug;
};

export function TournamentManageClient({ initialState, clubSlug }: TournamentManageClientProps) {
  const [state, setState] = useState(initialState);
  const [, startTransition] = useTransition();
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("setup");
  const [helpImage, setHelpImage] = useState<HelpImage>(null);
  const [participantPanelOpen, setParticipantPanelOpen] = useState(false);
  const [activeDrawGroupId, setActiveDrawGroupId] = useState<string | null>(null);
  const [activeRankingGroupId, setActiveRankingGroupId] = useState<string | null>(null);
  const [openPlayerEditMatchId, setOpenPlayerEditMatchId] = useState<string | null>(null);
  const [draggingMember, setDraggingMember] = useState<{ groupId: string; memberId: string } | null>(null);
  const [scoreSaveStatusByMatchId, setScoreSaveStatusByMatchId] = useState<Record<string, ScoreSaveStatus>>({});
  const pendingScrollMatchId = useRef<string | null>(null);
  const saveQueueRef = useRef(Promise.resolve());
  const scoreSaveTimersRef = useRef(new Map<string, number>());
  const scoreSaveQueuesRef = useRef(new Map<string, Promise<void>>());

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
  const isCompleted = tournament.status === "completed";
  const tournamentParticipantIds = state.tournamentParticipantIds[tournament.id] ?? [];
  const tournamentParticipants = useMemo(
    () => tournamentParticipantIds.map((id) => membersById.get(id)).filter((member): member is typeof state.members[number] => Boolean(member)),
    [membersById, tournamentParticipantIds]
  );
  const drawGroupId = activeDrawGroupId && state.groups.some((group) => group.id === activeDrawGroupId) ? activeDrawGroupId : state.groups[0]?.id;
  const rankingGroupId = activeRankingGroupId && state.groups.some((group) => group.id === activeRankingGroupId) ? activeRankingGroupId : state.groups[0]?.id;

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

  useEffect(() => {
    return () => {
      for (const timerId of scoreSaveTimersRef.current.values()) {
        window.clearTimeout(timerId);
      }
      scoreSaveTimersRef.current.clear();
    };
  }, []);

  const rankings = useMemo(() => {
    return state.groups.map((group) => {
      const members = groupMembersByGroupId.get(group.id) ?? [];
      const matches = matchesByGroupId.get(group.id) ?? [];
      return { group, rows: calculateRankings(members, matches) };
    });
  }, [groupMembersByGroupId, matchesByGroupId, state.groups]);

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

  function setScoreSaveStatus(matchId: string, status: ScoreSaveStatus) {
    setScoreSaveStatusByMatchId((current) => ({ ...current, [matchId]: status }));
  }

  function runScoreSave(match: Match) {
    window.clearTimeout(scoreSaveTimersRef.current.get(match.id));
    scoreSaveTimersRef.current.delete(match.id);
    setScoreSaveStatus(match.id, "saving");

    const previous = scoreSaveQueuesRef.current.get(match.id) ?? Promise.resolve();
    const current = previous
      .catch(() => undefined)
      .then(async () => {
        await updateMatchScoreAction(
          {
            matchId: match.id,
            sideAScore: match.sideAScore,
            sideBScore: match.sideBScore
          },
          clubSlug
        );
      });

    scoreSaveQueuesRef.current.set(match.id, current);
    current
      .then(() => {
        if (scoreSaveQueuesRef.current.get(match.id) === current) setScoreSaveStatus(match.id, "saved");
      })
      .catch(() => {
        if (scoreSaveQueuesRef.current.get(match.id) === current) setScoreSaveStatus(match.id, "error");
      });
  }

  function scheduleScoreSave(match: Match) {
    window.clearTimeout(scoreSaveTimersRef.current.get(match.id));
    const timerId = window.setTimeout(() => runScoreSave(match), 900);
    scoreSaveTimersRef.current.set(match.id, timerId);
  }

  function flushScoreSave(matchId: string) {
    const timerId = scoreSaveTimersRef.current.get(matchId);
    if (!timerId) return;
    const match = state.matches.find((item) => item.id === matchId);
    if (match) runScoreSave(match);
  }

  function displayGroupName(group: TournamentGroup) {
    return state.groups.length === 1 ? "전체" : group.name;
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

  function openHelpImage(format: TournamentGroup["scheduleFormat"]) {
    if (format === "random") return;
    setHelpImage(format);
  }

  function toggleTournamentParticipant(memberId: string) {
    if (isCompleted) return;
    const nextSelection = updateTournamentParticipantSelection({ currentParticipantIds: tournamentParticipantIds, memberId });
    if (nextSelection.removed && state.matches.length > 0 && !window.confirm("참가자를 제외하면 기존 대진표와 경기결과가 초기화됩니다. 계속할까요?")) return;
    const synced = filterGroupMembersByTournamentParticipants({
      participantIds: nextSelection.participantIds,
      groups: state.groups,
      groupMemberIds: state.groupMemberIds
    });

    updateLocal({
      ...state,
      tournamentParticipantIds: { ...state.tournamentParticipantIds, [tournament.id]: nextSelection.participantIds },
      groups: synced.groups,
      groupMemberIds: synced.groupMemberIds,
      matches: nextSelection.removed ? [] : state.matches
    });
  }

  async function shareTournament() {
    const url = `${window.location.origin}/public/${clubSlug}/${tournament.publicSlug}`;
    const shareData = {
      title: tournament.name,
      text: `${tournament.name} 대진표와 순위표를 확인하세요.`,
      url
    };

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
    if (isCompleted) return;
    if (!canAddTournamentGroup(tournamentParticipantIds)) {
      window.alert("참가자를 먼저 선택해주세요.");
      setParticipantPanelOpen(true);
      return;
    }
    const groupId = `group-${Date.now()}`;
    const nextGroupNumber = state.groups.length + 1;
    updateLocal({
      ...state,
      groups: [
        ...state.groups,
        {
          id: groupId,
          tournamentId: tournament.id,
          name: `${String.fromCharCode(64 + nextGroupNumber)}조`,
                          scheduleFormat: "kdk-v2010",
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
    delete nextGroupMemberIds[groupId];
    updateLocal({
      ...state,
      groups: state.groups.filter((group) => group.id !== groupId),
      groupMemberIds: nextGroupMemberIds,
      matches: state.matches.filter((match) => match.groupId !== groupId)
    });
  }

  function updateGroupFormat(groupId: string, scheduleFormat: TournamentGroup["scheduleFormat"]) {
    if (isCompleted) return;
    updateLocal({
      ...state,
      groups: state.groups.map((group) => (group.id === groupId ? { ...group, scheduleFormat, seedPlayerIds: [] } : group))
    });
  }

  function isAssignedToOtherGroup(memberId: string, groupId: string) {
    return Object.entries(state.groupMemberIds).some(([targetGroupId, ids]) => targetGroupId !== groupId && ids.includes(memberId));
  }

  function toggleGroupMember(groupId: string, memberId: string) {
    if (isCompleted || isAssignedToOtherGroup(memberId, groupId)) return;
    const currentIds = state.groupMemberIds[groupId] ?? [];
    const nextIds = currentIds.includes(memberId) ? currentIds.filter((id) => id !== memberId) : [...currentIds, memberId];
    updateLocal({
      ...state,
      groupMemberIds: { ...state.groupMemberIds, [groupId]: nextIds },
      groups: state.groups.map((group) => (group.id === groupId ? { ...group, seedPlayerIds: [] } : group))
    });
  }

  function moveGroupMember(groupId: string, memberId: string, targetMemberId: string) {
    if (isCompleted || memberId === targetMemberId) return;
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
    const invalid = state.groups.find((group) => groupValidation(group));
    if (invalid) return;
    const message = state.matches.length > 0
      ? "기존 경기결과는 초기화되고 새로운 대진표가 만들어집니다. 계속할까요?"
      : "대진표를 생성할까요?";
    if (!window.confirm(message)) return;

    const generated = state.groups.flatMap((group) =>
      generateInitialMatches({
        tournamentId: tournament.id,
        groupId: group.id,
        format: group.scheduleFormat,
        seedPlayerIds: group.seedPlayerIds,
        participants: groupParticipants(group.id)
      })
    );

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
          sortOrder: nextNumber
        }
      ]
    });
  }

  function updateMatch(matchId: string, patch: Partial<Match>) {
    if (isCompleted) return;
    let nextMatch: Match | null = null;
    updateLocal({
      ...state,
      matches: state.matches.map((match) => {
        if (match.id !== matchId) return match;
        nextMatch = { ...match, ...patch };
        return nextMatch;
      })
    });
    if (nextMatch && ("sideAScore" in patch || "sideBScore" in patch)) scheduleScoreSave(nextMatch);
  }

  function deleteMatch(matchId: string) {
    if (isCompleted) return;
    if (!window.confirm("경기를 삭제할까요? 입력된 점수도 함께 삭제됩니다.")) return;
    updateLocal({ ...state, matches: state.matches.filter((match) => match.id !== matchId) });
  }

  function replacePlayer(matchId: string, side: "A" | "B", index: number, memberId: string) {
    if (isCompleted) return;
    updateLocal({
      ...state,
      matches: state.matches.map((match) => {
        if (match.id !== matchId) return match;
        const key = side === "A" ? "sideAPlayerIds" : "sideBPlayerIds";
        const nextIds = [...match[key]];
        nextIds[index] = memberId;
        return { ...match, [key]: nextIds };
      })
    });
  }

  function availableMembersForMatch(match: Match, selected?: string) {
    const groupIds = state.groupMemberIds[match.groupId] ?? [];
    const used = new Set([...match.sideAPlayerIds, ...match.sideBPlayerIds].filter((id) => id !== selected));
    return groupIds
      .map((id) => membersById.get(id))
      .filter((member): member is typeof state.members[number] => Boolean(member))
      .filter((member) => !used.has(member.id));
  }

  function selectableMembersForGroup(groupId: string) {
    const selectedIds = state.groupMemberIds[groupId] ?? [];
    return state.members.filter((member) => tournamentParticipantIds.includes(member.id) && (!member.deleted || selectedIds.includes(member.id)));
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
              공유하기
            </button>
          </div>
          {isCompleted && <p className="notice-text" style={{ marginTop: 12 }}>완료된 대회는 날짜만 수정할 수 있습니다. 날짜를 오늘 또는 이후로 바꾸면 다시 수정할 수 있습니다.</p>}
        </section>

        <section className="section-card">
          <div className="tab-row">
            {[
              ["setup", "설정"],
              ["draw", "대진표"],
              ["ranking", "순위"]
            ].map(([id, label]) => (
              <button className={`tab-button ${activeTab === id ? "active" : ""}`} key={id} onClick={() => setActiveTab(id as TabId)} type="button">
                {label}
              </button>
            ))}
          </div>
        </section>

        {activeTab === "setup" && (
          <div className="tab-panel stack" key="setup">
            <section className="section-card stack">
              <strong className="section-head">대회 기본정보</strong>
              <label className="field boxed-field">
                <span>대회명</span>
                <input disabled={isCompleted} onChange={(event) => updateTournament("name", event.target.value)} value={tournament.name} />
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
                <b>{participantPanelOpen ? "닫기" : "참가자 수정"}</b>
              </button>
              {participantPanelOpen && (
                <div className="stack soft-enter">
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
              {!participantPanelOpen && (
                <div className="selected-summary">
                  {tournamentParticipants.length > 0 ? tournamentParticipants.map((member) => <span key={member.id}>{member.name}</span>) : <p>참가자를 먼저 선택해주세요.</p>}
                </div>
              )}
            </section>

            <section className="section-card stack">
              <div className="today-card-top">
                <strong className="section-head" style={{ marginBottom: 0 }}>그룹 편성</strong>
                <button className="ghost-button" disabled={isCompleted} onClick={addGroup} type="button">
                  <Plus size={18} />
                  그룹 추가
                </button>
              </div>

              {state.groups.map((group) => {
                const participants = groupParticipants(group.id);
                const selectedIds = state.groupMemberIds[group.id] ?? [];
                const selectedMembers = selectedIds.map((id) => state.members.find((member) => member.id === id)).filter((member): member is typeof state.members[number] => Boolean(member));
                const unselectedMembers = selectableMembersForGroup(group.id).filter((member) => !selectedIds.includes(member.id));
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
                      <div className={`format-row ${group.scheduleFormat === "random" ? "single" : ""}`}>
                      <select className="select-input" disabled={isCompleted} onChange={(event) => updateGroupFormat(group.id, event.target.value as TournamentGroup["scheduleFormat"])} value={group.scheduleFormat}>
                        <option value="kdk-v2010">KDK-V2010 방식</option>
                        <option value="hanul-aa">한울AA KDK 방식</option>
                        <option value="random">랜덤 방식</option>
                      </select>
                      {group.scheduleFormat !== "random" && (
                        <button className="icon-help-button" aria-label="대진방식 보기" onClick={() => openHelpImage(group.scheduleFormat)} type="button">
                          <HelpCircle size={20} />
                        </button>
                      )}
                      </div>
                    </div>
                    {validation && <p className="notice-text">{validation}</p>}
                    <div className="field-label-row">
                      <strong>참여자 순번</strong>
                      <span>드래그해서 순서를 변경</span>
                    </div>
                    {group.scheduleFormat === "hanul-aa" && seedSlots.size > 0 && (
                      <p className="notice-text">한울AA 시드 자리: {[...seedSlots].join(", ")}번. 해당 순번 위치가 자동 시드자로 적용됩니다.</p>
                    )}
                    <div className="participant-list">
                      {selectedMembers.map((member, index) => {
                        const slot = orderSlotLabel(index);
                        const isSeedSlot = seedSlots.has(slot);
                        return (
                          <button
                            className={`participant-option sortable-participant ${isSeedSlot ? "seed-slot" : ""}`}
                            disabled={isCompleted}
                            draggable={!isCompleted}
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
                            <small>{isSeedSlot ? "자동 시드" : "참여"}</small>
                          </button>
                        );
                      })}
                      {unselectedMembers.map((member) => {
                        const assignedElsewhere = isAssignedToOtherGroup(member.id, group.id);
                        return (
                          <button className="participant-option" disabled={isCompleted || assignedElsewhere} key={member.id} onClick={() => toggleGroupMember(group.id, member.id)} type="button">
                            <span className="check-mark" />
                            <strong>{member.name}</strong>
                            <small>{assignedElsewhere ? "다른 그룹 선택됨" : "추가"}</small>
                          </button>
                        );
                      })}
                    </div>
                    <button className="danger-button" disabled={isCompleted} onClick={() => deleteGroup(group.id)} type="button">
                      <Trash2 size={18} />
                      그룹 삭제
                    </button>
                  </div>
                );
              })}
              {state.matches.length > 0 && (
                <p className="notice-text">대진표 생성을 다시 누르면 기존 경기결과는 초기화되고 새로운 대진표가 만들어집니다.</p>
              )}
              <button className="primary-button" disabled={isCompleted || state.groups.length === 0 || hasInvalidGroup} onClick={generateAllSchedules} type="button">
                <ClipboardList size={18} />
                대진표 생성
              </button>
            </section>
          </div>
        )}

        {activeTab === "draw" && (
          <section className="section-card stack tab-panel" id="draw" key="draw">
            <strong className="section-head">대진표 관리</strong>
            {renderGroupTabs(drawGroupId, setActiveDrawGroupId)}
            {visibleDrawGroups.map((group) => (
              <div className="stack" key={group.id}>
                <div className="today-card-top">
                  <strong>{displayGroupName(group)}</strong>
                  <button className="ghost-button" disabled={isCompleted} onClick={() => addMatch(group.id)} type="button">
                    <Plus size={18} />
                    경기 추가
                  </button>
                </div>
                {[...(matchesByGroupId.get(group.id) ?? [])]
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map((match) => (
                    <div className="match-edit-card stack" id={`match-${match.id}`} key={match.id}>
                      <div className="score-panel vertical">
                        <label>
                          <span>{teamLabel(match.sideAPlayerIds)}</span>
                          <div className="score-entry">
                            <small>점수</small>
                            <input aria-label="위쪽 팀 점수" className="score-input" disabled={isCompleted} inputMode="numeric" max={6} min={0} onBlur={() => flushScoreSave(match.id)} onChange={(event) => updateMatch(match.id, { sideAScore: normalizeMatchScore(event.target.value), status: "completed" })} placeholder="0" type="number" value={match.sideAScore ?? ""} />
                          </div>
                        </label>
                        <div className="score-vs-label">VS</div>
                        <label>
                          <span>{teamLabel(match.sideBPlayerIds)}</span>
                          <div className="score-entry">
                            <small>점수</small>
                            <input aria-label="아래쪽 팀 점수" className="score-input" disabled={isCompleted} inputMode="numeric" max={6} min={0} onBlur={() => flushScoreSave(match.id)} onChange={(event) => updateMatch(match.id, { sideBScore: normalizeMatchScore(event.target.value), status: "completed" })} placeholder="0" type="number" value={match.sideBScore ?? ""} />
                          </div>
                        </label>
                      </div>
                      {scoreSaveStatusByMatchId[match.id] && (
                        <p className={`notice-text score-save-status ${scoreSaveStatusByMatchId[match.id]}`}>
                          {scoreSaveStatusByMatchId[match.id] === "saving" && "점수 저장 중..."}
                          {scoreSaveStatusByMatchId[match.id] === "saved" && "점수 저장됨"}
                          {scoreSaveStatusByMatchId[match.id] === "error" && "점수 저장 실패. 다시 입력하면 재시도됩니다."}
                        </p>
                      )}
                      <details className="player-edit-box" onToggle={(event) => setOpenPlayerEditMatchId(event.currentTarget.open ? match.id : null)} open={openPlayerEditMatchId === match.id}>
                        <summary>선수 변경</summary>
                        <div className="score-input-grid compact">
                          {(["A", "A", "B", "B"] as const).map((side, index) => {
                            const sideIndex = index % 2;
                            const selected = side === "A" ? match.sideAPlayerIds[sideIndex] : match.sideBPlayerIds[sideIndex];
                            return (
                              <label className="mini-select-field" key={`${side}-${sideIndex}`}>
                                <span>{side === "A" ? "위쪽" : "아래쪽"} {sideIndex + 1}</span>
                                <select className="select-input" disabled={isCompleted} onChange={(event) => replacePlayer(match.id, side, sideIndex, event.target.value)} value={selected ?? ""}>
                                  <option value="">선택</option>
                                  {availableMembersForMatch(match, selected).map((member) => (
                                    <option key={member.id} value={member.id}>{member.name}</option>
                                  ))}
                                </select>
                              </label>
                            );
                          })}
                        </div>
                      </details>
                      <button className="danger-button" disabled={isCompleted} onClick={() => deleteMatch(match.id)} type="button">
                        <Trash2 size={18} />
                        경기 삭제
                      </button>
                    </div>
                  ))}
              </div>
            ))}
          </section>
        )}

        {activeTab === "ranking" && (
          <section className="section-card stack tab-panel" key="ranking">
            <strong className="section-head">순위</strong>
            {renderGroupTabs(rankingGroupId, setActiveRankingGroupId)}
            {visibleRankingGroups.map(({ group, rows }) => (
              <div className="stack" key={group.id}>
                <strong>{displayGroupName(group)}</strong>
                <RankingTable rows={rows} />
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
