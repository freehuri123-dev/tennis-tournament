"use client";

import { ClipboardList, Plus, Share2, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { MatchCard } from "@/components/MatchCard";
import { RankingTable } from "@/components/RankingTable";
import { StatusBadge } from "@/components/StatusBadge";
import { calculateRankings } from "@/lib/domain/ranking";
import { generateInitialMatches, getHanulSeedPlayers } from "@/lib/domain/schedule";
import type { Match, TournamentGroup } from "@/lib/domain/types";
import { loadTournamentState, saveTournamentState, type TournamentState } from "@/lib/store/tournament-store";

type TabId = "setup" | "draw" | "ranking";

export default function TournamentManagePage() {
  const [state, setState] = useState<TournamentState>(() => loadTournamentState());
  const [activeTab, setActiveTab] = useState<TabId>("setup");

  const rankings = useMemo(() => {
    return state.groups.map((group) => {
      const groupMemberIds = state.groupMemberIds[group.id] ?? [];
      const members = state.members.filter((member) => groupMemberIds.includes(member.id));
      const matches = state.matches.filter((match) => match.groupId === group.id);
      return { group, rows: calculateRankings(members, matches) };
    });
  }, [state]);

  function persist(next: TournamentState) {
    saveTournamentState(next);
    setState(next);
  }

  function displayGroupName(group: TournamentGroup) {
    return state.groups.length === 1 ? "전체" : group.name;
  }

  function updateTournament(field: "name" | "date", value: string) {
    const tournament = { ...state.tournament, [field]: value };
    persist({
      ...state,
      tournament,
      tournaments: state.tournaments.map((item) => (item.id === tournament.id ? tournament : item))
    });
  }

  function addGroup() {
    const groupId = `group-${Date.now()}`;
    const nextGroupNumber = state.groups.length + 1;
    persist({
      ...state,
      groups: [
        ...state.groups,
        {
          id: groupId,
          tournamentId: state.tournament.id,
          name: `${String.fromCharCode(64 + nextGroupNumber)}조`,
          scheduleFormat: "kdk-v2010",
          sortOrder: nextGroupNumber
        }
      ],
      groupMemberIds: { ...state.groupMemberIds, [groupId]: [] }
    });
  }

  function deleteGroup(groupId: string) {
    const nextGroups = state.groups.filter((group) => group.id !== groupId);
    const nextGroupMemberIds = { ...state.groupMemberIds };
    delete nextGroupMemberIds[groupId];
    persist({
      ...state,
      groups: nextGroups,
      groupMemberIds: nextGroupMemberIds,
      matches: state.matches.filter((match) => match.groupId !== groupId)
    });
  }

  function updateGroupFormat(groupId: string, scheduleFormat: TournamentGroup["scheduleFormat"]) {
    persist({
      ...state,
      groups: state.groups.map((group) => (group.id === groupId ? { ...group, scheduleFormat } : group))
    });
  }

  function isAssignedToOtherGroup(memberId: string, groupId: string) {
    return Object.entries(state.groupMemberIds).some(([targetGroupId, ids]) => targetGroupId !== groupId && ids.includes(memberId));
  }

  function toggleGroupMember(groupId: string, memberId: string) {
    if (isAssignedToOtherGroup(memberId, groupId)) return;
    const currentIds = state.groupMemberIds[groupId] ?? [];
    const nextIds = currentIds.includes(memberId) ? currentIds.filter((id) => id !== memberId) : [...currentIds, memberId];
    persist({
      ...state,
      groupMemberIds: { ...state.groupMemberIds, [groupId]: nextIds }
    });
  }

  function generateScheduleForGroup(groupId: string) {
    const group = state.groups.find((item) => item.id === groupId);
    if (!group) return;
    const groupMemberIds = state.groupMemberIds[groupId] ?? [];
    const participants = state.members.filter((member) => groupMemberIds.includes(member.id));
    const generated = generateInitialMatches({
      tournamentId: state.tournament.id,
      groupId,
      format: group.scheduleFormat,
      participants
    });
    const tournament = { ...state.tournament, status: "active" as const };
    persist({
      ...state,
      tournament,
      tournaments: state.tournaments.map((item) => (item.id === tournament.id ? tournament : item)),
      matches: [...state.matches.filter((match) => match.groupId !== groupId), ...generated]
    });
    setActiveTab("draw");
  }

  function addMatch(groupId: string) {
    const groupMatches = state.matches.filter((match) => match.groupId === groupId);
    const nextNumber = groupMatches.length + 1;
    const memberIds = state.groupMemberIds[groupId] ?? [];
    persist({
      ...state,
      matches: [
        ...state.matches,
        {
          id: `${groupId}-manual-${Date.now()}`,
          tournamentId: state.tournament.id,
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
    persist({
      ...state,
      matches: state.matches.map((match) => (match.id === matchId ? { ...match, ...patch } : match))
    });
  }

  function deleteMatch(matchId: string) {
    persist({ ...state, matches: state.matches.filter((match) => match.id !== matchId) });
  }

  function replacePlayer(matchId: string, side: "A" | "B", index: number, memberId: string) {
    persist({
      ...state,
      matches: state.matches.map((match) => {
        if (match.id !== matchId) return match;
        const key = side === "A" ? "sideAPlayerIds" : "sideBPlayerIds";
        const nextIds = [...match[key]];
        const usedByOtherSlot = [...match.sideAPlayerIds, ...match.sideBPlayerIds].some((id, usedIndex) => {
          const flatIndex = side === "A" ? index : index + match.sideAPlayerIds.length;
          return usedIndex !== flatIndex && id === memberId;
        });
        if (usedByOtherSlot) return match;
        nextIds[index] = memberId;
        return { ...match, [key]: nextIds };
      })
    });
  }

  return (
    <AppShell title="대회 상세관리" subtitle="참가자 편성, 대진표, 순위를 관리합니다" active="tournaments">
      <div className="page">
        <section className="hero-card">
          <span className="badge">현재 대회</span>
          <h1>{state.tournament.name}</h1>
          <p className="lead">{state.tournament.date} · {state.groups.length}개 그룹 · {state.matches.length}경기</p>
          <div className="today-card-top" style={{ marginTop: 12 }}>
            <StatusBadge status={state.tournament.status} />
            <button className="ghost-button" onClick={() => window.location.assign("/public/monthly-demo")} type="button">
              <Share2 size={18} />
              공유하기
            </button>
          </div>
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
              <label className="field">
                <span>대회명</span>
                <input onChange={(event) => updateTournament("name", event.target.value)} value={state.tournament.name} />
              </label>
              <label className="field">
                <span>날짜</span>
                <input onChange={(event) => updateTournament("date", event.target.value)} type="date" value={state.tournament.date} />
              </label>
            </section>

            <section className="section-card stack">
              <div className="today-card-top">
                <strong className="section-head" style={{ marginBottom: 0 }}>그룹 편성</strong>
                <button className="ghost-button" onClick={addGroup} type="button">
                  <Plus size={18} />
                  그룹 추가
                </button>
              </div>

              {state.groups.map((group) => {
                const participants = state.members.filter((member) => (state.groupMemberIds[group.id] ?? []).includes(member.id));
                const seeds = group.scheduleFormat === "hanul-aa" ? getHanulSeedPlayers(participants) : [];

                return (
                  <div className="tournament-card stack" key={group.id}>
                    <div className="today-card-top">
                      <strong>{displayGroupName(group)}</strong>
                      <span className="group-chip">{participants.length}명</span>
                    </div>
                    <select className="select-input" onChange={(event) => updateGroupFormat(group.id, event.target.value as TournamentGroup["scheduleFormat"])} value={group.scheduleFormat}>
                      <option value="kdk-v2010">KDK-V2010</option>
                      <option value="hanul-aa">한울AA</option>
                    </select>
                    {seeds.length > 0 && (
                      <div className="seed-box">
                        <strong>시드 선수</strong>
                        <span>{seeds.map((member) => member.name).join(", ")}</span>
                      </div>
                    )}
                    <div className="chip-row">
                      {state.members.map((member) => {
                        const selected = (state.groupMemberIds[group.id] ?? []).includes(member.id);
                        const assignedElsewhere = isAssignedToOtherGroup(member.id, group.id);
                        return (
                          <button
                            className={`chip ${selected ? "active" : ""}`}
                            disabled={assignedElsewhere}
                            key={member.id}
                            onClick={() => toggleGroupMember(group.id, member.id)}
                            type="button"
                          >
                            {member.name}
                          </button>
                        );
                      })}
                    </div>
                    <div className="sticky-footer">
                      <button className="danger-button" onClick={() => deleteGroup(group.id)} type="button">
                        <Trash2 size={18} />
                        그룹 삭제
                      </button>
                      <button className="primary-button" onClick={() => generateScheduleForGroup(group.id)} type="button">
                        <ClipboardList size={18} />
                        대진표 생성
                      </button>
                    </div>
                  </div>
                );
              })}
            </section>
          </>
        )}

        {activeTab === "draw" && (
          <section className="section-card stack" id="draw">
            <strong className="section-head">대진표 관리</strong>
            {state.groups.map((group) => (
              <div className="stack" key={group.id}>
                <div className="today-card-top">
                  <strong>{displayGroupName(group)}</strong>
                  <button className="ghost-button" onClick={() => addMatch(group.id)} type="button">
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
                      <div className="score-input-grid">
                        <input className="score-input" inputMode="numeric" onChange={(event) => updateMatch(match.id, { sideAScore: Number(event.target.value), status: "completed" })} placeholder="A팀 점수" value={match.sideAScore ?? ""} />
                        <input className="score-input" inputMode="numeric" onChange={(event) => updateMatch(match.id, { sideBScore: Number(event.target.value), status: "completed" })} placeholder="B팀 점수" value={match.sideBScore ?? ""} />
                      </div>
                      <div className="score-input-grid">
                        {(["A", "A", "B", "B"] as const).map((side, index) => {
                          const sideIndex = index % 2;
                          const selected = side === "A" ? match.sideAPlayerIds[sideIndex] : match.sideBPlayerIds[sideIndex];
                          const used = new Set([...match.sideAPlayerIds, ...match.sideBPlayerIds].filter((id) => id !== selected));
                          return (
                            <select className="select-input" key={`${side}-${sideIndex}`} onChange={(event) => replacePlayer(match.id, side, sideIndex, event.target.value)} value={selected ?? ""}>
                              <option value="">{side}팀 {sideIndex + 1}</option>
                              {state.members.map((member) => (
                                <option disabled={used.has(member.id)} key={member.id} value={member.id}>{member.name}</option>
                              ))}
                            </select>
                          );
                        })}
                      </div>
                      <button className="danger-button" onClick={() => deleteMatch(match.id)} type="button">
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
            {rankings.map(({ group, rows }) => (
              <div className="stack" key={group.id}>
                <strong>{displayGroupName(group)}</strong>
                <RankingTable rows={rows} />
              </div>
            ))}
          </section>
        )}
      </div>
    </AppShell>
  );
}
