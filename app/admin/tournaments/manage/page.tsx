"use client";

import { ClipboardList, HelpCircle, Plus, Share2, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { MatchCard } from "@/components/MatchCard";
import { RankingTable } from "@/components/RankingTable";
import { StatusBadge } from "@/components/StatusBadge";
import { calculateRankings } from "@/lib/domain/ranking";
import { generateInitialMatches, getHanulSeedCount, validateScheduleParticipants } from "@/lib/domain/schedule";
import { withDateStatus } from "@/lib/domain/tournament-status";
import type { Match, TournamentGroup } from "@/lib/domain/types";
import { loadTournamentState, saveTournamentState, type TournamentState } from "@/lib/store/tournament-store";

type TabId = "setup" | "draw" | "ranking";
type HelpImage = "kdk-v2010" | "hanul-aa" | null;

const helpImages = {
  "kdk-v2010": { src: "/KDK-V2010.png", title: "KDK-V2010 대진방식" },
  "hanul-aa": { src: "/한울AA.png", title: "한울AA방식 KDK" }
} as const;

export default function TournamentManagePage() {
  const [state, setState] = useState<TournamentState>(() => loadTournamentState());
  const [activeTab, setActiveTab] = useState<TabId>("setup");
  const [helpImage, setHelpImage] = useState<HelpImage>(null);
  const [activeDrawGroupId, setActiveDrawGroupId] = useState<string | null>(null);
  const [activeRankingGroupId, setActiveRankingGroupId] = useState<string | null>(null);

  const tournament = withDateStatus(state.tournament);
  const isCompleted = tournament.status === "completed";
  const drawGroupId = activeDrawGroupId && state.groups.some((group) => group.id === activeDrawGroupId) ? activeDrawGroupId : state.groups[0]?.id;
  const rankingGroupId = activeRankingGroupId && state.groups.some((group) => group.id === activeRankingGroupId) ? activeRankingGroupId : state.groups[0]?.id;

  const rankings = useMemo(() => {
    return state.groups.map((group) => {
      const groupMemberIds = state.groupMemberIds[group.id] ?? [];
      const members = state.members.filter((member) => groupMemberIds.includes(member.id));
      const matches = state.matches.filter((match) => match.groupId === group.id);
      return { group, rows: calculateRankings(members, matches) };
    });
  }, [state]);

  function persist(next: TournamentState) {
    const nextTournament = withDateStatus(next.tournament);
    const normalized = {
      ...next,
      tournament: nextTournament,
      tournaments: next.tournaments.map((item) => withDateStatus(item.id === nextTournament.id ? nextTournament : item))
    };
    saveTournamentState(normalized);
    setState(normalized);
  }

  function displayGroupName(group: TournamentGroup) {
    return state.groups.length === 1 ? "전체" : group.name;
  }

  function groupParticipants(groupId: string) {
    const ids = state.groupMemberIds[groupId] ?? [];
    return state.members.filter((member) => ids.includes(member.id));
  }

  function memberName(id: string) {
    return state.members.find((member) => member.id === id)?.name ?? "미정";
  }

  function teamLabel(ids: string[]) {
    return ids.map(memberName).join(", ") || "선수 미정";
  }

  function groupValidation(group: TournamentGroup) {
    const participants = groupParticipants(group.id);
    const rangeMessage = validateScheduleParticipants(group.scheduleFormat, participants.length);
    if (rangeMessage) return rangeMessage;
    if (group.scheduleFormat === "hanul-aa") {
      const requiredSeeds = getHanulSeedCount(participants.length);
      const selectedSeeds = group.seedPlayerIds?.length ?? 0;
      if (selectedSeeds !== requiredSeeds) return `한울AA방식 KDK는 시드 선수를 ${requiredSeeds}명 선택해야 합니다.`;
    }
    return "";
  }

  function updateTournament(field: "name" | "date", value: string) {
    if (isCompleted && field !== "date") return;
    const nextTournament = withDateStatus({ ...tournament, [field]: value });
    persist({
      ...state,
      tournament: nextTournament,
      tournaments: state.tournaments.map((item) => (item.id === nextTournament.id ? nextTournament : item))
    });
  }

  function addGroup() {
    if (isCompleted) return;
    const groupId = `group-${Date.now()}`;
    const nextGroupNumber = state.groups.length + 1;
    persist({
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
    persist({
      ...state,
      groups: state.groups.filter((group) => group.id !== groupId),
      groupMemberIds: nextGroupMemberIds,
      matches: state.matches.filter((match) => match.groupId !== groupId)
    });
  }

  function updateGroupFormat(groupId: string, scheduleFormat: TournamentGroup["scheduleFormat"]) {
    if (isCompleted) return;
    persist({
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
    persist({
      ...state,
      groupMemberIds: { ...state.groupMemberIds, [groupId]: nextIds },
      groups: state.groups.map((group) => (group.id === groupId ? { ...group, seedPlayerIds: [] } : group))
    });
  }

  function toggleSeed(groupId: string, memberId: string) {
    if (isCompleted) return;
    const group = state.groups.find((item) => item.id === groupId);
    if (!group) return;
    const seedCount = getHanulSeedCount(groupParticipants(groupId).length);
    const current = group.seedPlayerIds ?? [];
    const next = current.includes(memberId)
      ? current.filter((id) => id !== memberId)
      : current.length < seedCount
        ? [...current, memberId]
        : current;

    persist({
      ...state,
      groups: state.groups.map((item) => (item.id === groupId ? { ...item, seedPlayerIds: next } : item))
    });
  }

  function generateAllSchedules() {
    if (isCompleted) return;
    const invalid = state.groups.find((group) => groupValidation(group));
    if (invalid) return;

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
    const groupMatches = state.matches.filter((match) => match.groupId === groupId);
    const nextNumber = groupMatches.length + 1;
    const memberIds = state.groupMemberIds[groupId] ?? [];
    persist({
      ...state,
      matches: [
        ...state.matches,
        {
          id: `${groupId}-manual-${Date.now()}`,
          tournamentId: tournament.id,
          groupId,
          matchNumber: nextNumber,
          sideAPlayerIds: memberIds.slice(0, 2),
          sideBPlayerIds: memberIds.slice(2, 4),
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
    persist({
      ...state,
      matches: state.matches.map((match) => (match.id === matchId ? { ...match, ...patch } : match))
    });
  }

  function deleteMatch(matchId: string) {
    if (isCompleted) return;
    if (!window.confirm("경기를 삭제할까요? 입력된 점수도 함께 삭제됩니다.")) return;
    persist({ ...state, matches: state.matches.filter((match) => match.id !== matchId) });
  }

  function replacePlayer(matchId: string, side: "A" | "B", index: number, memberId: string) {
    if (isCompleted) return;
    persist({
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
    return state.members.filter((member) => groupIds.includes(member.id) && !used.has(member.id));
  }

  function selectableMembersForGroup(groupId: string) {
    const selectedIds = state.groupMemberIds[groupId] ?? [];
    return state.members.filter((member) => member.active !== false || selectedIds.includes(member.id));
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
  const visibleDrawGroups = state.groups.filter((group) => state.groups.length === 1 || group.id === drawGroupId);
  const visibleRankingGroups = rankings.filter(({ group }) => state.groups.length === 1 || group.id === rankingGroupId);

  return (
    <AppShell title="대회 상세관리" subtitle="참가자 편성, 대진표, 순위를 관리합니다" active="tournaments">
      <div className="page">
        <section className="hero-card">
          <span className="badge">{isCompleted ? "완료 대회" : "현재 대회"}</span>
          <h1>{tournament.name}</h1>
          <p className="lead">{tournament.date} · {state.groups.length}개 그룹 · {state.matches.length}경기</p>
          <div className="today-card-top" style={{ marginTop: 12 }}>
            <StatusBadge status={tournament.status} />
            <button className="ghost-button" onClick={() => window.location.assign("/public/monthly-demo")} type="button">
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
          <>
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
              <div className="today-card-top">
                <strong className="section-head" style={{ marginBottom: 0 }}>그룹 편성</strong>
                <button className="ghost-button" disabled={isCompleted} onClick={addGroup} type="button">
                  <Plus size={18} />
                  그룹 추가
                </button>
              </div>

              {state.groups.map((group) => {
                const participants = groupParticipants(group.id);
                const seedCount = group.scheduleFormat === "hanul-aa" ? getHanulSeedCount(participants.length) : 0;
                const validation = groupValidation(group);

                return (
                  <div className="tournament-card stack" key={group.id}>
                    <div className="today-card-top">
                      <strong>{displayGroupName(group)}</strong>
                      <span className="group-chip">{participants.length}명</span>
                    </div>
                    <div className="format-row">
                      <select className="select-input" disabled={isCompleted} onChange={(event) => updateGroupFormat(group.id, event.target.value as TournamentGroup["scheduleFormat"])} value={group.scheduleFormat}>
                        <option value="kdk-v2010">KDK-V2010</option>
                        <option value="hanul-aa">한울AA방식 KDK</option>
                      </select>
                      <button className="icon-help-button" aria-label="대진방식 보기" onClick={() => setHelpImage(group.scheduleFormat)} type="button">
                        <HelpCircle size={20} />
                      </button>
                    </div>
                    {validation && <p className="notice-text">{validation}</p>}
                    <div className="chip-row">
                      {selectableMembersForGroup(group.id).map((member) => {
                        const selected = (state.groupMemberIds[group.id] ?? []).includes(member.id);
                        const assignedElsewhere = isAssignedToOtherGroup(member.id, group.id);
                        return (
                          <button className={`chip ${selected ? "active" : ""}`} disabled={isCompleted || assignedElsewhere} key={member.id} onClick={() => toggleGroupMember(group.id, member.id)} type="button">
                            {member.name}
                          </button>
                        );
                      })}
                    </div>
                    {seedCount > 0 && (
                      <div className="seed-box">
                        <strong>시드 선수 {group.seedPlayerIds?.length ?? 0}/{seedCount}</strong>
                        <div className="chip-row">
                          {participants.map((member) => (
                            <button className={`chip ${(group.seedPlayerIds ?? []).includes(member.id) ? "active" : ""}`} disabled={isCompleted} key={member.id} onClick={() => toggleSeed(group.id, member.id)} type="button">
                              {member.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <button className="danger-button" disabled={isCompleted} onClick={() => deleteGroup(group.id)} type="button">
                      <Trash2 size={18} />
                      그룹 삭제
                    </button>
                  </div>
                );
              })}
              {state.matches.length > 0 && (
                <p className="notice-text">전체 대진표 생성을 다시 누르면 기존 경기결과는 초기화되고 새로운 대진표가 만들어집니다.</p>
              )}
              <button className="primary-button" disabled={isCompleted || state.groups.length === 0 || hasInvalidGroup} onClick={generateAllSchedules} type="button">
                <ClipboardList size={18} />
                전체 대진표 생성
              </button>
            </section>
          </>
        )}

        {activeTab === "draw" && (
          <section className="section-card stack" id="draw">
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
                {state.matches
                  .filter((match) => match.groupId === group.id)
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map((match) => (
                    <div className="stack" key={match.id}>
                      <MatchCard match={match} members={state.members} />
                      <div className="score-panel vertical">
                        <label>
                          <span>{teamLabel(match.sideAPlayerIds)} 점수</span>
                          <input className="score-input" disabled={isCompleted} inputMode="numeric" onChange={(event) => updateMatch(match.id, { sideAScore: Number(event.target.value), status: "completed" })} placeholder="0" value={match.sideAScore ?? ""} />
                        </label>
                        <div className="score-vs-label">VS</div>
                        <label>
                          <span>{teamLabel(match.sideBPlayerIds)} 점수</span>
                          <input className="score-input" disabled={isCompleted} inputMode="numeric" onChange={(event) => updateMatch(match.id, { sideBScore: Number(event.target.value), status: "completed" })} placeholder="0" value={match.sideBScore ?? ""} />
                        </label>
                      </div>
                      <div className="score-input-grid">
                        {(["A", "A", "B", "B"] as const).map((side, index) => {
                          const sideIndex = index % 2;
                          const selected = side === "A" ? match.sideAPlayerIds[sideIndex] : match.sideBPlayerIds[sideIndex];
                          return (
                            <select className="select-input" disabled={isCompleted} key={`${side}-${sideIndex}`} onChange={(event) => replacePlayer(match.id, side, sideIndex, event.target.value)} value={selected ?? ""}>
                              <option value="">{side === "A" ? "위쪽" : "아래쪽"} 선수 {sideIndex + 1}</option>
                              {availableMembersForMatch(match, selected).map((member) => (
                                <option key={member.id} value={member.id}>{member.name}</option>
                              ))}
                            </select>
                          );
                        })}
                      </div>
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
          <section className="section-card stack">
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
            <img alt={helpImages[helpImage].title} src={helpImages[helpImage].src} />
          </div>
        </div>
      )}
    </AppShell>
  );
}
