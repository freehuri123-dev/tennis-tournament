"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { PublicShell } from "@/components/AppShell";
import { MatchCard } from "@/components/MatchCard";
import { RankingTable } from "@/components/RankingTable";
import { calculateRankings } from "@/lib/domain/ranking";
import { getPublicTournamentAccess } from "@/lib/domain/public-access";
import { createInitialState, loadTournamentState, type TournamentState } from "@/lib/store/tournament-store";

export default function PublicTournamentPage() {
  const params = useParams<{ slug: string }>();
  const [activeTab, setActiveTab] = useState<"schedule" | "group" | "overall">("schedule");
  const [activeScheduleGroupId, setActiveScheduleGroupId] = useState<string | null>(null);
  const [activeRankingGroupId, setActiveRankingGroupId] = useState<string | null>(null);
  const [state, setState] = useState<TournamentState>(() => createInitialState());

  useEffect(() => {
    setState(loadTournamentState());
  }, []);

  const slug = params.slug;
  const access = useMemo(() => getPublicTournamentAccess(slug, state.tournaments, state.deletedPublicSlugs), [slug, state.deletedPublicSlugs, state.tournaments]);
  const displayTournament = access.type === "live" ? access.tournament : state.tournament;

  const scheduleGroupId = activeScheduleGroupId && state.groups.some((group) => group.id === activeScheduleGroupId) ? activeScheduleGroupId : state.groups[0]?.id;
  const rankingGroupId = activeRankingGroupId && state.groups.some((group) => group.id === activeRankingGroupId) ? activeRankingGroupId : state.groups[0]?.id;

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

  const visibleScheduleGroups = state.groups.filter((group) => state.groups.length === 1 || group.id === scheduleGroupId);
  const visibleRankingGroups = groupRankings.filter(({ group }) => state.groups.length === 1 || group.id === rankingGroupId);

  if (access.type === "deleted") {
    return (
      <PublicShell title="삭제된 대회입니다" subtitle="공유 링크를 다시 확인해주세요">
        <div className="page">
          <section className="status-message-card">
            <strong>삭제된 대회입니다</strong>
            <p>관리자가 이 대회를 삭제해서 대진표와 순위표를 볼 수 없습니다.</p>
          </section>
        </div>
      </PublicShell>
    );
  }

  if (access.type === "completed") {
    return (
      <PublicShell title="완료된 대회입니다" subtitle={access.tournament.date}>
        <div className="page">
          <section className="status-message-card">
            <strong>완료된 대회입니다</strong>
            <p>대회 날짜가 지나 공유용 실시간 화면은 종료되었습니다.</p>
          </section>
        </div>
      </PublicShell>
    );
  }

  return (
    <PublicShell title={displayTournament.name} subtitle={displayTournament.date}>
      <div className="page">
        <button className="refresh-button" onClick={() => window.location.reload()} type="button">
          <RefreshCw size={20} />
          새로고침
        </button>
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
          <section className="section-card stack tab-panel" key="schedule">
            <strong className="section-head">오늘의 대진표</strong>
            {renderGroupTabs(scheduleGroupId, setActiveScheduleGroupId)}
            {visibleScheduleGroups.map((group) => (
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
          <section className="section-card stack tab-panel" key="group">
            <strong className="section-head">그룹별 순위</strong>
            {renderGroupTabs(rankingGroupId, setActiveRankingGroupId)}
            {visibleRankingGroups.map(({ group, rows }) => (
              <div className="stack" key={group.id}>
                <strong>{displayGroupName(group.name)}</strong>
                <RankingTable rows={rows} />
              </div>
            ))}
          </section>
        )}

        {activeTab === "overall" && (
          <section className="section-card stack tab-panel" key="overall">
            <strong className="section-head">전체 통합 순위</strong>
            <RankingTable rows={overallRanking} />
          </section>
        )}
      </div>
    </PublicShell>
  );
}
