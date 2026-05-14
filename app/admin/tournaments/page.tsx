"use client";

import { CalendarPlus, ClipboardList, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { MatchCard } from "@/components/MatchCard";
import { RankingTable } from "@/components/RankingTable";
import { StatusBadge } from "@/components/StatusBadge";
import { calculateRankings } from "@/lib/domain/ranking";
import { generateInitialMatches } from "@/lib/domain/schedule";
import type { Match, TournamentGroup } from "@/lib/domain/types";
import { loadTournamentState, saveTournamentState, type TournamentState } from "@/lib/store/tournament-store";

export default function TournamentManagementPage() {
  const [state, setState] = useState<TournamentState>(() => loadTournamentState());
  const [activeTab, setActiveTab] = useState<"setup" | "draw" | "ranking">("setup");

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

  function createTournament() {
    const today = new Date().toISOString().slice(0, 10);
    persist({
      ...state,
      tournament: {
        id: `tournament-${Date.now()}`,
        name: "새 월례대회",
        date: today,
        publicSlug: "monthly-demo",
        status: "draft"
      },
      groups: [],
      groupMemberIds: {},
      matches: []
    });
  }

  function updateTournament(field: "name" | "date", value: string) {
    persist({ ...state, tournament: { ...state.tournament, [field]: value } });
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
          scheduleFormat: "hanul-aa",
          sortOrder: nextGroupNumber
        }
      ],
      groupMemberIds: { ...state.groupMemberIds, [groupId]: [] }
    });
  }

  function updateGroupFormat(groupId: string, scheduleFormat: TournamentGroup["scheduleFormat"]) {
    persist({
      ...state,
      groups: state.groups.map((group) => (group.id === groupId ? { ...group, scheduleFormat } : group))
    });
  }

  function toggleGroupMember(groupId: string, memberId: string) {
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
    persist({
      ...state,
      tournament: { ...state.tournament, status: "active" },
      matches: [...state.matches.filter((match) => match.groupId !== groupId), ...generated]
    });
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
        nextIds[index] = memberId;
        return { ...match, [key]: nextIds };
      })
    });
  }

  return (
    <AppShell title="대회 관리" subtitle="참가자 편성부터 결과 입력까지 진행합니다" active="tournaments">
      <div className="page">
        <section className="hero-card">
          <span className="badge">현재 대회</span>
          <h1>{state.tournament.name}</h1>
          <p className="lead">{state.tournament.date} · {state.groups.length}개 그룹 · {state.matches.length}경기</p>
          <div className="today-card-top" style={{ marginTop: 12 }}>
            <StatusBadge status={state.tournament.status} />
            <button className="ghost-button" onClick={createTournament} type="button">
              <CalendarPlus size={18} />
              새 대회
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
              <button
                className={`tab-button ${activeTab === id ? "active" : ""}`}
                key={id}
                onClick={() => setActiveTab(id as typeof activeTab)}
                type="button"
              >
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
              {state.groups.map((group) => (
                <div className="tournament-card stack" key={group.id}>
                  <div className="today-card-top">
                    <strong>{group.name}</strong>
                    <span className="group-chip">{(state.groupMemberIds[group.id] ?? []).length}명</span>
                  </div>
                  <select
                    className="select-input"
                    onChange={(event) => updateGroupFormat(group.id, event.target.value as TournamentGroup["scheduleFormat"])}
                    value={group.scheduleFormat}
                  >
                    <option value="hanul-aa">한울AA</option>
                    <option value="kdk-v2010">KDK-V2010</option>
                  </select>
                  <div className="chip-row">
                    {state.members.map((member) => {
                      const selected = (state.groupMemberIds[group.id] ?? []).includes(member.id);
                      return (
                        <button className={`chip ${selected ? "active" : ""}`} key={member.id} onClick={() => toggleGroupMember(group.id, member.id)} type="button">
                          {member.name}
                        </button>
                      );
                    })}
                  </div>
                  <button className="primary-button" onClick={() => generateScheduleForGroup(group.id)} type="button">
                    <ClipboardList size={18} />
                    대진표 생성
                  </button>
                </div>
              ))}
            </section>
          </>
        )}

        {activeTab === "draw" && (
          <section className="section-card stack" id="draw">
            <strong className="section-head">대진표 관리</strong>
            {state.groups.map((group) => (
              <div className="stack" key={group.id}>
                <div className="today-card-top">
                  <strong>{group.name}</strong>
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
                        <input
                          className="score-input"
                          inputMode="numeric"
                          onChange={(event) => updateMatch(match.id, { sideAScore: Number(event.target.value), status: "completed" })}
                          placeholder="A팀 점수"
                          value={match.sideAScore ?? ""}
                        />
                        <input
                          className="score-input"
                          inputMode="numeric"
                          onChange={(event) => updateMatch(match.id, { sideBScore: Number(event.target.value), status: "completed" })}
                          placeholder="B팀 점수"
                          value={match.sideBScore ?? ""}
                        />
                      </div>
                      <div className="score-input-grid">
                        {[0, 1].map((index) => (
                          <select className="select-input" key={`a-${index}`} onChange={(event) => replacePlayer(match.id, "A", index, event.target.value)} value={match.sideAPlayerIds[index] ?? ""}>
                            <option value="">A팀 {index + 1}</option>
                            {state.members.map((member) => (
                              <option key={member.id} value={member.id}>{member.name}</option>
                            ))}
                          </select>
                        ))}
                        {[0, 1].map((index) => (
                          <select className="select-input" key={`b-${index}`} onChange={(event) => replacePlayer(match.id, "B", index, event.target.value)} value={match.sideBPlayerIds[index] ?? ""}>
                            <option value="">B팀 {index + 1}</option>
                            {state.members.map((member) => (
                              <option key={member.id} value={member.id}>{member.name}</option>
                            ))}
                          </select>
                        ))}
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
            <strong className="section-head">그룹별 순위</strong>
            {rankings.map(({ group, rows }) => (
              <div className="stack" key={group.id}>
                <strong>{group.name}</strong>
                <RankingTable rows={rows} />
              </div>
            ))}
            <button className="ghost-button" onClick={() => window.location.assign("/public/monthly-demo")} type="button">
              <Save size={18} />
              회원 공유 화면 보기
            </button>
          </section>
        )}
      </div>
    </AppShell>
  );
}
