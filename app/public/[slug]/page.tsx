"use client";

import { useEffect, useMemo, useState } from "react";
import { PublicShell } from "@/components/AppShell";
import { MatchCard } from "@/components/MatchCard";
import { RankingTable } from "@/components/RankingTable";
import { calculateRankings } from "@/lib/domain/ranking";
import { createInitialState, loadTournamentState, type TournamentState } from "@/lib/store/tournament-store";

export default function PublicTournamentPage() {
  const [activeTab, setActiveTab] = useState<"schedule" | "group" | "overall">("schedule");
  const [state, setState] = useState<TournamentState>(() => createInitialState());

  useEffect(() => {
    setState(loadTournamentState());
  }, []);

  const groupRankings = useMemo(() => {
    return state.groups.map((group) => {
      const groupMemberIds = state.groupMemberIds[group.id] ?? [];
      const members = state.members.filter((member) => groupMemberIds.includes(member.id));
      const matches = state.matches.filter((match) => match.groupId === group.id);
      return { group, rows: calculateRankings(members, matches) };
    });
  }, [state]);

  const overallRanking = useMemo(() => {
    const rows = state.groups.flatMap((group) => {
      const groupMemberIds = state.groupMemberIds[group.id] ?? [];
      const members = state.members.filter((member) => groupMemberIds.includes(member.id));
      const matches = state.matches.filter((match) => match.groupId === group.id);
      return calculateRankings(members, matches).map((row) => ({ ...row, groupName: state.groups.length === 1 ? undefined : group.name }));
    });

    return rows
      .sort(
        (a, b) =>
          b.rankingPoints - a.rankingPoints ||
          b.wins - a.wins ||
          b.pointDiff - a.pointDiff ||
          b.pointsFor - a.pointsFor ||
          a.pointsAgainst - b.pointsAgainst ||
          a.name.localeCompare(b.name, "ko")
      )
      .map((row, index) => ({ ...row, rank: index + 1 }));
  }, [state]);

  function displayGroupName(groupName: string) {
    return state.groups.length === 1 ? "전체" : groupName;
  }

  return (
    <PublicShell title={state.tournament.name} subtitle={`${state.tournament.date} · 공유용 조회 화면`}>
      <div className="page">
        <section className="section-card">
          <div className="tab-row">
            {[
              ["schedule", "대진표"],
              ["group", "그룹 순위"],
              ["overall", "전체 순위"]
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

        {activeTab === "schedule" && (
          <section className="section-card stack">
            <strong className="section-head">오늘의 대진표</strong>
            {state.groups.map((group) => (
              <div className="stack" key={group.id}>
                <div className="today-card-top">
                  <strong>{displayGroupName(group.name)}</strong>
                  <span className="group-chip">{state.matches.filter((match) => match.groupId === group.id).length}경기</span>
                </div>
                {state.matches
                  .filter((match) => match.groupId === group.id)
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map((match) => (
                    <MatchCard key={match.id} match={match} members={state.members} />
                  ))}
              </div>
            ))}
          </section>
        )}

        {activeTab === "group" && (
          <section className="section-card stack">
            <strong className="section-head">그룹별 순위</strong>
            {groupRankings.map(({ group, rows }) => (
              <div className="stack" key={group.id}>
                <strong>{displayGroupName(group.name)}</strong>
                <RankingTable rows={rows} />
              </div>
            ))}
          </section>
        )}

        {activeTab === "overall" && (
          <section className="section-card stack">
            <strong className="section-head">전체 통합 순위</strong>
            <RankingTable rows={overallRanking} />
          </section>
        )}
      </div>
    </PublicShell>
  );
}
