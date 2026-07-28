"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCw, Trophy } from "lucide-react";
import { PublicShell } from "./AppShell";
import { PublicMatchCard } from "./PublicMatchCard";
import { RankingTable } from "./RankingTable";
import type { ClubSlug } from "../lib/domain/club";
import { calculateRankings } from "../lib/domain/ranking";
import { getFixedPairTournamentRoundCounts, getTournamentByeSelectionOptions, getTournamentRoundLabel } from "../lib/domain/schedule";
import { getPublicTournamentAccess } from "../lib/domain/public-access";
import type { Match, TournamentGroup } from "../lib/domain/types";
import type { TournamentState } from "../lib/store/tournament-store";

export function PublicTournamentView({ state, slug, clubSlug }: { state: TournamentState; slug: string; clubSlug: ClubSlug }) {
  const [activeTab, setActiveTab] = useState<"schedule" | "group" | "overall">("schedule");
  const [activeScheduleGroupId, setActiveScheduleGroupId] = useState<string | null>(null);
  const [activeRankingGroupId, setActiveRankingGroupId] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => window.location.reload(), 5 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  const access = useMemo(() => getPublicTournamentAccess(slug, state.tournaments, state.deletedPublicSlugs), [slug, state.deletedPublicSlugs, state.tournaments]);
  const displayTournament = access.type === "live" ? access.tournament : state.tournament;
  const recordYear = displayTournament.date.slice(0, 4);
  const publicRecordsHref = `/public/${clubSlug}/records?year=${recordYear}`;
  const membersById = useMemo(() => new Map(state.members.map((member) => [member.id, member])), [state.members]);
  const matchesByGroupId = useMemo(() => {
    const grouped = new Map(state.groups.map((group) => [group.id, [] as typeof state.matches]));
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

  const scheduleGroupId = activeScheduleGroupId && state.groups.some((group) => group.id === activeScheduleGroupId) ? activeScheduleGroupId : state.groups[0]?.id;
  const rankingGroupId = activeRankingGroupId && state.groups.some((group) => group.id === activeRankingGroupId) ? activeRankingGroupId : state.groups[0]?.id;

  const groupRankings = useMemo(() => {
    return state.groups.map((group) => {
      const members = groupMembersByGroupId.get(group.id) ?? [];
      const matches = matchesByGroupId.get(group.id) ?? [];
      return { group, rows: calculateRankings(members, matches) };
    });
  }, [groupMembersByGroupId, matchesByGroupId, state.groups]);

  const overallRanking = useMemo(() => {
    const rows = groupRankings.flatMap(({ group, rows }) => rows.map((row) => ({ ...row, groupName: state.groups.length === 1 ? undefined : group.name })));

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
  }, [groupRankings, state.groups.length]);

  function displayGroupName(groupName: string) {
    return state.groups.length === 1 ? "전체" : groupName;
  }

  function memberName(id: string) {
    return membersById.get(id)?.name ?? "미정";
  }

  function isTournamentFormat(group: TournamentGroup) {
    return group.scheduleFormat === "fixed-pair-tournament" || group.scheduleFormat === "single-tournament";
  }

  function tournamentTeamLabel(ids: string[], fallback = "승자 대기") {
    return ids.length > 0 ? ids.map(memberName).join(", ") : fallback;
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

  function tournamentSideFallback(group: TournamentGroup, match: Match, side: "A" | "B") {
    const firstRoundCount = getFixedPairTournamentRoundCounts(matchesByGroupId.get(group.id)?.length ?? 0)[0] ?? 0;
    const sideIds = side === "A" ? match.sideAPlayerIds : match.sideBPlayerIds;
    const otherIds = side === "A" ? match.sideBPlayerIds : match.sideAPlayerIds;
    const selectedByeMatch = getTournamentByeSelectionOptions(state.matches, group.id).some((selection) => selection.byeMatchId === match.id && selection.selectedSourceMatchId);
    if (selectedByeMatch && sideIds.length === 0 && otherIds.length > 0) return "BYE";
    return match.sortOrder <= firstRoundCount && sideIds.length === 0 && otherIds.length > 0 ? "BYE" : "승자 대기";
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

  const visibleScheduleGroups = useMemo(() => state.groups.filter((group) => state.groups.length === 1 || group.id === scheduleGroupId), [scheduleGroupId, state.groups]);
  const visibleRankingGroups = useMemo(() => groupRankings.filter(({ group }) => state.groups.length === 1 || group.id === rankingGroupId), [groupRankings, rankingGroupId, state.groups.length]);
  const hasTournamentFormat = state.groups.some(isTournamentFormat);
  const tabs: Array<[typeof activeTab, string]> = hasTournamentFormat
    ? [["schedule", "대진표"], ["group", "결과"]]
    : [["schedule", "대진표"], ["group", "그룹 순위"], ["overall", "전체 순위"]];

  useEffect(() => {
    if (hasTournamentFormat && activeTab === "overall") setActiveTab("group");
  }, [activeTab, hasTournamentFormat]);

  function renderPublicMatch(group: TournamentGroup, match: Match) {
    return isTournamentFormat(group) ? (
      <div className="public-match-card fixed-public-match" key={match.id}>
        <div className="tournament-round-head">
          <span>{tournamentMatchRoundLabel(group, match)}</span>
          <strong>경기 {match.sortOrder}</strong>
          {match.courtNumber && <em className="court-badge fixed-public-court">{match.courtNumber}번 코트</em>}
        </div>
        <div className="public-match-row">
          <strong>{tournamentTeamLabel(match.sideAPlayerIds, tournamentSideFallback(group, match, "A"))}</strong>
          <span>{match.sideAScore ?? "-"} : {match.sideBScore ?? "-"}</span>
          <strong>{tournamentTeamLabel(match.sideBPlayerIds, tournamentSideFallback(group, match, "B"))}</strong>
        </div>
      </div>
    ) : (
      <PublicMatchCard key={match.id} match={match} members={state.members} />
    );
  }

  if (access.type === "deleted") {
    return (
      <PublicShell title="삭제된 대회입니다" subtitle="공유 링크를 다시 확인해주세요" clubSlug={clubSlug}>
        <div className="page">
          <section className="status-message-card">
            <strong>삭제된 대회입니다</strong>
            <p>관리자가 이 대회를 삭제해서 대진표와 순위표를 볼 수 없습니다.</p>
          </section>
        </div>
      </PublicShell>
    );
  }

  return (
    <PublicShell title={displayTournament.name} subtitle={displayTournament.date} clubSlug={clubSlug}>
      <div className="page">
        <button className="refresh-button" onClick={() => window.location.reload()} type="button">
          <RefreshCw size={20} />
          새로고침
        </button>
        <a className="public-records-link" href={publicRecordsHref}>
          <Trophy size={18} />
          {recordYear} 기록/랭킹 보기
        </a>

        {!hasTournamentFormat && state.groups.length > 1 && (
          <section className="public-tablet-board" aria-label="태블릿 전체 대진표">
            {groupRankings.map(({ group }) => (
              <article className="public-tablet-group" key={group.id}>
                <div className="public-tablet-group-head">
                  <strong>{group.name}</strong>
                  <span>{matchesByGroupId.get(group.id)?.length ?? 0}경기</span>
                </div>
                <div className="public-tablet-match-list">
                  {[...(matchesByGroupId.get(group.id) ?? [])]
                    .sort((a, b) => a.sortOrder - b.sortOrder)
                    .map((match) => renderPublicMatch(group, match))}
                </div>
              </article>
            ))}
          </section>
        )}

        <div className="public-phone-view">
          <section className="section-card">
            <div className="tab-row">
              {tabs.map(([id, label]) => (
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
                    <span className="group-chip">{matchesByGroupId.get(group.id)?.length ?? 0}경기</span>
                  </div>
                  {[...(matchesByGroupId.get(group.id) ?? [])]
                    .sort((a, b) => a.sortOrder - b.sortOrder)
                    .map((match) => renderPublicMatch(group, match))}
                </div>
              ))}
            </section>
          )}

          {activeTab === "group" && (
            <section className="section-card stack tab-panel" key="group">
              <strong className="section-head">{hasTournamentFormat ? "토너먼트 결과" : "그룹별 순위"}</strong>
              {!hasTournamentFormat && renderGroupTabs(rankingGroupId, setActiveRankingGroupId)}
              {visibleRankingGroups.map(({ group, rows }) => (
                <div className="stack" key={group.id}>
                  {!hasTournamentFormat && <strong>{displayGroupName(group.name)}</strong>}
                  {isTournamentFormat(group) ? (
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
                  ) : (
                    <RankingTable rows={rows} />
                  )}
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
      </div>
    </PublicShell>
  );
}
