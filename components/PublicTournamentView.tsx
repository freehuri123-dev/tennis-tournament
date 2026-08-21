"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCw, Trophy } from "lucide-react";
import { PublicShell } from "./AppShell";
import { PublicMatchCard } from "./PublicMatchCard";
import { RankingTable } from "./RankingTable";
import { TeamRankingTable } from "./TeamRankingTable";
import { TeamBattleContributionDetails, TeamBattleRoster } from "./TeamBattleDetails";
import { getClubBySlug, type ClubSlug } from "../lib/domain/club";
import { calculateFixedPairRankings, calculateRankings } from "../lib/domain/ranking";
import { rankingMembersForTournament } from "../lib/domain/tournament-policy";
import { getFixedPairTournamentRoundCounts, getScheduleFormatLabel, getTournamentByeSelectionOptions, getTournamentRoundLabel } from "../lib/domain/schedule";
import { getPublicTournamentAccess } from "../lib/domain/public-access";
import { calculateTeamBattleResult, getTeamBattleRoundNumber, groupTeamBattleMatchesByRound } from "../lib/domain/team-battle";
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
  const tournamentType = displayTournament.type ?? (state.groups.some((group) => group.scheduleFormat === "team-battle") ? "team-battle" : state.groups.some((group) => group.scheduleFormat === "fixed-pair-tournament" || group.scheduleFormat === "single-tournament") ? "tournament" : "general");
  const clubName = getClubBySlug(clubSlug)?.name ?? "테니스 클럽";
  const publicPageTitle = `${clubName} - ${displayTournament.name} - 대진표`;
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

  const tournamentParticipantIds = state.tournamentParticipantIds[displayTournament.id] ?? [];
  const teamAssignment = state.teamAssignments?.[displayTournament.id] ?? {};
  const blueTeamMembers = useMemo(
    () => tournamentParticipantIds.filter((id) => teamAssignment[id] === "blue").map((id) => membersById.get(id)).filter((member): member is NonNullable<typeof member> => Boolean(member)),
    [membersById, teamAssignment, tournamentParticipantIds]
  );
  const whiteTeamMembers = useMemo(
    () => tournamentParticipantIds.filter((id) => teamAssignment[id] === "white").map((id) => membersById.get(id)).filter((member): member is NonNullable<typeof member> => Boolean(member)),
    [membersById, teamAssignment, tournamentParticipantIds]
  );
  const scheduleGroupId = activeScheduleGroupId && state.groups.some((group) => group.id === activeScheduleGroupId) ? activeScheduleGroupId : state.groups[0]?.id;
  const rankingGroupId = activeRankingGroupId && state.groups.some((group) => group.id === activeRankingGroupId) ? activeRankingGroupId : state.groups[0]?.id;

  const groupRankings = useMemo(() => {
    return state.groups.map((group) => {
      const groupMembers = groupMembersByGroupId.get(group.id) ?? [];
      const members = rankingMembersForTournament(displayTournament, groupMembers);
      const matches = matchesByGroupId.get(group.id) ?? [];
      return {
        group,
        rows: group.scheduleFormat === "fixed-pair-league" ? [] : calculateRankings(members, matches),
        teamRows: group.scheduleFormat === "fixed-pair-league" ? calculateFixedPairRankings(members, matches) : []
      };
    });
  }, [displayTournament, groupMembersByGroupId, matchesByGroupId, state.groups]);

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

  function isFixedPairLeagueFormat(group: TournamentGroup) {
    return group.scheduleFormat === "fixed-pair-league";
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
  const hasTeamBattle = tournamentType === "team-battle";
  const teamBattleResult = useMemo(() => calculateTeamBattleResult(state.matches), [state.matches]);
  const hasFixedPairLeague = state.groups.some(isFixedPairLeagueFormat);
  const usesGroupOnlyRanking = hasTournamentFormat || hasFixedPairLeague || hasTeamBattle;
  const tabs: Array<[typeof activeTab, string]> = hasTeamBattle
    ? [["schedule", "대진표"], ["group", "팀 스코어"]]
    : hasTournamentFormat
      ? [["schedule", "대진표"], ["group", "결과"]]
    : usesGroupOnlyRanking
      ? [["schedule", "대진표"], ["group", "그룹 순위"]]
      : [["schedule", "대진표"], ["group", "그룹 순위"], ["overall", "전체 순위"]];

  useEffect(() => {
    if (usesGroupOnlyRanking && activeTab === "overall") setActiveTab("group");
  }, [activeTab, usesGroupOnlyRanking]);

  function renderPublicMatch(group: TournamentGroup, match: Match, teamBattleRoundNumber?: number) {
    return hasTeamBattle ? (
      <div className="public-match-card fixed-public-match" key={match.id}>
        <div className="tournament-round-head"><span>{teamBattleRoundNumber ?? getTeamBattleRoundNumber(matchesByGroupId.get(group.id) ?? [], match.id)}라운드</span><strong>경기 {match.sortOrder}</strong>{match.courtNumber && <em className="court-badge fixed-public-court">{match.courtNumber}번 코트</em>}</div>
        <div className="public-match-row">
          <strong className="team-battle-side-name">
            <em className="team-side-badge blue">청팀</em>
            <span className="team-battle-player-list">{match.sideAPlayerIds.map((id) => <span key={id}>{memberName(id)}</span>)}</span>
          </strong>
          <span>{match.sideAScore ?? "-"} : {match.sideBScore ?? "-"}</span>
          <strong className="team-battle-side-name">
            <em className="team-side-badge white">백팀</em>
            <span className="team-battle-player-list">{match.sideBPlayerIds.map((id) => <span key={id}>{memberName(id)}</span>)}</span>
          </strong>
        </div>
      </div>
    ) : isTournamentFormat(group) ? (
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
    <PublicShell title={publicPageTitle} subtitle={displayTournament.date} clubSlug={clubSlug}>
      <div className="page">
        <button className="refresh-button" onClick={() => window.location.reload()} type="button">
          <RefreshCw size={20} />
          새로고침
        </button>
        {displayTournament.includeInClubRecords !== false && (
          <a className="public-records-link" href={publicRecordsHref}>
            <Trophy size={18} />
            {recordYear} 기록/랭킹 보기
          </a>
        )}

        {!hasTournamentFormat && !hasTeamBattle && state.groups.length > 1 && (
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
            <div className={`tab-row ${tabs.length === 2 ? "two-tabs" : ""}`} role="tablist" aria-label="공유 대회 보기">
              {tabs.map(([id, label]) => (
                <button
                  className={`tab-button ${activeTab === id ? "active" : ""}`}
                  key={id}
                  aria-selected={activeTab === id}
                  onClick={() => setActiveTab(id)}
                  role="tab"
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>
          </section>

          {activeTab === "schedule" && (
            <section className="section-card stack tab-panel" key="schedule">
              <strong className="section-head">{hasTeamBattle ? "청백전 대진표" : "오늘의 대진표"}</strong>
              {renderGroupTabs(scheduleGroupId, setActiveScheduleGroupId)}
              {visibleScheduleGroups.map((group) => (
                <div className="stack" key={group.id}>
                  <div className="today-card-top">
                    <div className="draw-group-title">
                      <strong>{displayGroupName(group.name)}</strong>
                      <span className="group-format-badge">{getScheduleFormatLabel(group.scheduleFormat)}</span>
                    </div>
                    <span className="group-chip">{matchesByGroupId.get(group.id)?.length ?? 0}경기</span>
                  </div>
                  {hasTeamBattle && <TeamBattleRoster blueMembers={blueTeamMembers} whiteMembers={whiteTeamMembers} />}
                  {hasTeamBattle ? (
                    groupTeamBattleMatchesByRound(matchesByGroupId.get(group.id) ?? []).map((round) => {
                      const completedMatches = round.matches.filter((match) => match.sideAScore !== null && match.sideBScore !== null);
                      const isCompleted = round.matches.length > 0 && completedMatches.length === round.matches.length;
                      const blueWins = completedMatches.filter((match) => (match.sideAScore ?? 0) > (match.sideBScore ?? 0)).length;
                      const whiteWins = completedMatches.filter((match) => (match.sideBScore ?? 0) > (match.sideAScore ?? 0)).length;

                      return (
                        <details className="team-battle-round-card public-team-battle-round-card" key={`round-${round.roundNumber}-${isCompleted}`} open={!isCompleted}>
                          <summary className="team-battle-round-card-head public-team-battle-round-summary">
                            <span>ROUND {String(round.roundNumber).padStart(2, "0")}</span>
                            <strong>{round.roundNumber}라운드</strong>
                            <span className="public-team-battle-round-toggle">
                              <b className="round-toggle-open">열기</b>
                              <b className="round-toggle-close">닫기</b>
                            </span>
                            {isCompleted && (
                              <span className="public-team-battle-round-score">
                                <small>{round.roundNumber}라운드 결과</small>
                                <b><em>청팀</em> {blueWins} : {whiteWins} <em>백팀</em></b>
                              </span>
                            )}
                          </summary>
                          <div className="team-battle-round-match-list">
                            {round.matches.map((match) => renderPublicMatch(group, match, round.roundNumber))}
                          </div>
                        </details>
                      );
                    })
                  ) : (
                    [...(matchesByGroupId.get(group.id) ?? [])]
                      .sort((a, b) => a.sortOrder - b.sortOrder)
                      .map((match) => renderPublicMatch(group, match))
                  )}
                </div>
              ))}
            </section>
          )}

          {activeTab === "group" && (
            <section className="section-card stack tab-panel" key="group">
              <strong className="section-head">{hasTeamBattle ? "청백전 팀 스코어" : hasTournamentFormat ? "토너먼트 결과" : "그룹별 순위"}</strong>
              {!hasTournamentFormat && !hasTeamBattle && renderGroupTabs(rankingGroupId, setActiveRankingGroupId)}
              {visibleRankingGroups.map(({ group, rows, teamRows }) => (
                <div className="stack" key={group.id}>
                  {!hasTournamentFormat && <strong>{displayGroupName(group.name)}</strong>}
                  {hasTeamBattle ? (
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

          {activeTab === "overall" && !usesGroupOnlyRanking && (
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
